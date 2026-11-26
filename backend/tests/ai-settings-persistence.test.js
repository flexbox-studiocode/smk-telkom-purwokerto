import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { classifyProviderError } from '../src/services/aiErrors.js';
import { invalidateAiConfigCache } from '../src/services/aiRuntimeConfig.js';

// Regresi laporan admin:
// - Uji koneksi / Verifikasi berulang tidak boleh "menghilangkan" API key.
// - Nama layanan dapat diubah tanpa mengubah ID internal.
// - Status layanan membedakan simpan, terverifikasi, dan galat provider.
// - Menghapus key satu layanan tidak memengaruhi layanan lain.
// - Galat parameter provider tidak dilaporkan sebagai "model tidak tersedia".

const PREFIX = 'aipersist-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const SECRET = 'AIza-persist-rahasia-jangan-bocor-123';
const OTHER_SECRET = 'sk-nexttel-rahasia-jangan-bocor-456';
const originalFetch = globalThis.fetch;
let server;
let baseUrl;
let snapshot = [];
let admin;

function makeClient() {
  const jar = new Map();
  return {
    async request(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (options.body) headers['content-type'] = 'application/json';
      const csrf = jar.get('csrf_token');
      if (options.method && !['GET', 'HEAD'].includes(options.method) && csrf) headers['x-csrf-token'] = csrf;
      const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.cookie = cookie;
      const res = await originalFetch(baseUrl + path, { ...options, headers });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const [key, value] = pair.split('=');
        if (value === '' || /Max-Age=0/i.test(raw)) jar.delete(key); else jar.set(key, value);
      }
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      return { status: res.status, body };
    },
  };
}

function stubGemini(handler) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (target.startsWith('https://generativelanguage.googleapis.com') || target.startsWith('https://api.example.com')) {
      calls.push({ url: target, options });
      return handler(target, options);
    }
    return originalFetch(url, options);
  };
  return calls;
}

const put = (service, body) => admin.request(`/api/admin/ai-settings/${service}`, { method: 'PUT', body: JSON.stringify(body) });
const post = (path, body) => admin.request(`/api/admin/ai-settings/${path}`, { method: 'POST', body: JSON.stringify(body) });
const settings = async () => Object.fromEntries((await admin.request('/api/admin/ai-settings')).body.data.map((row) => [row.service, row]));

before(async () => {
  process.env.AI_CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.user.create({ data: { email: ADMIN_EMAIL, passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }), emailVerified: new Date(), role: 'admin', admin: { create: { nama: 'AI Persist Admin' } } } });
  admin = makeClient();
  await admin.request('/api/auth/csrf');
  assert.equal((await admin.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }) })).status, 200);
});

after(async () => {
  globalThis.fetch = originalFetch;
  await prisma.aiProviderConfig.deleteMany();
  for (const row of snapshot) { const { id, ...rest } = row; await prisma.aiProviderConfig.create({ data: rest }).catch(() => {}); }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  invalidateAiConfigCache();
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

afterEach(() => { globalThis.fetch = originalFetch; });

test('nama layanan tersimpan tanpa mengubah ID internal', async () => {
  const res = await put('stela', { displayName: 'Asisten Sekolah', provider: 'gemini', model: 'gemini-2.5-flash', apiKey: SECRET, enabled: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.service, 'stela');
  assert.equal(res.body.data.displayName, 'Asisten Sekolah');
  assert.equal((await settings()).stela.displayName, 'Asisten Sekolah');
  assert.ok(!JSON.stringify(res.body).includes(SECRET));
});

test('uji koneksi dan verifikasi berulang tidak menghapus API key tersimpan', async () => {
  const calls = stubGemini((url) => url.includes(':generateContent')
    ? Response.json({ candidates: [{ content: { parts: [{ text: 'siap' }] } }] })
    : Response.json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }));
  for (let i = 0; i < 3; i += 1) {
    const tested = await post('stela/test', { provider: 'gemini', model: 'gemini-2.5-flash' });
    assert.equal(tested.status, 200, JSON.stringify(tested.body));
    assert.equal(tested.body.data.reachable, true);
    const verified = await post('stela/verify', { provider: 'gemini', model: 'gemini-2.5-flash' });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
  }
  // Key tersimpan dipakai server; browser tidak pernah mengirim atau menerimanya.
  assert.ok(calls.every((call) => call.options.headers['x-goog-api-key'] === SECRET));
  const row = (await settings()).stela;
  assert.equal(row.configured, true);
  assert.equal(row.enabled, true);
  assert.equal(row.lastCheckCode, 'OK', 'verifikasi konfigurasi tersimpan merekam status');
});

test('uji koneksi melaporkan endpoint terjangkau walau key ditolak', async () => {
  stubGemini(() => new Response(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.' } }), { status: 400 }));
  const res = await post('stela/test', { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'AIza-draft-key-baru-0000000000' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.reachable, true);
  assert.equal(res.body.data.accepted, false);
  assert.equal(res.body.data.code, 'API_KEY_INVALID');
});

test('verifikasi key draft tidak menimpa key maupun status tersimpan', async () => {
  stubGemini(() => new Response(JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: 'bad key' } }), { status: 401 }));
  const res = await post('stela/verify', { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'AIza-draft-key-salah-00000000000' });
  assert.equal(res.status, 502);
  assert.equal(res.body.code, 'API_KEY_INVALID');
  const row = (await settings()).stela;
  assert.equal(row.configured, true);
  assert.equal(row.lastCheckCode, 'OK', 'status konfigurasi tersimpan tidak berubah oleh draft');
});

test('menyimpan tanpa API key mempertahankan key lama; ganti model mereset status', async () => {
  const res = await put('stela', { displayName: 'Asisten Sekolah', provider: 'gemini', model: 'gemini-2.5-pro', apiKey: '', enabled: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.configured, true);
  assert.equal(res.body.data.model, 'gemini-2.5-pro');
  assert.equal(res.body.data.lastCheckCode, null, 'konfigurasi berubah = belum terverifikasi');
  const calls = stubGemini(() => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  assert.equal((await post('stela/verify', { provider: 'gemini', model: 'gemini-2.5-pro' })).status, 200);
  assert.equal(calls[0].options.headers['x-goog-api-key'], SECRET, 'key lama tetap dipakai');
});

test('verifikasi model yang tidak ada merekam MODEL_NOT_FOUND', async () => {
  await put('stela', { displayName: 'Asisten Sekolah', provider: 'gemini', model: 'gemini-tidak-ada', enabled: true });
  stubGemini(() => new Response(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'models/gemini-tidak-ada is not found for API version v1beta, or is not supported for generateContent.' } }), { status: 404 }));
  const res = await post('stela/verify', { provider: 'gemini', model: 'gemini-tidak-ada' });
  assert.equal(res.body.code, 'MODEL_NOT_FOUND');
  assert.match(res.body.detail, /gemini-tidak-ada is not found/);
  assert.equal((await settings()).stela.lastCheckCode, 'MODEL_NOT_FOUND');
});

test('menghapus API key satu layanan tidak memengaruhi layanan lain', async () => {
  const saved = await put('nexttel', { provider: 'custom-openai', endpoint: 'https://api.example.com/v1', model: 'model-x', apiKey: OTHER_SECRET, enabled: true });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const removed = await admin.request('/api/admin/ai-settings/stela/key', { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const rows = await settings();
  assert.equal(rows.stela.configured, false);
  assert.equal(rows.stela.enabled, false);
  assert.equal(rows.nexttel.configured, true);
  assert.equal(rows.nexttel.enabled, true);
});

test('nonaktifkan tidak menghapus API key', async () => {
  const res = await admin.request('/api/admin/ai-settings/nexttel/status', { method: 'PATCH', body: JSON.stringify({ enabled: false }) });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.enabled, false);
  assert.equal(res.body.data.configured, true);
});

test('galat parameter provider bukan MODEL_NOT_FOUND', () => {
  const google = (message, status = 'INVALID_ARGUMENT') => classifyProviderError({ status: 400, hint: 'google', providerText: JSON.stringify({ error: { status, message } }) });
  assert.equal(google('Thinking budget is not supported for this model.'), 'INVALID_REQUEST');
  assert.equal(google('Invalid JSON payload received. Unknown name "thinkingConfig": Cannot find field.'), 'INVALID_REQUEST');
  assert.equal(google('API key not valid. Please pass a valid API key.'), 'API_KEY_INVALID');
  assert.equal(classifyProviderError({ status: 404, hint: 'google', providerText: '{"error":{"status":"NOT_FOUND","message":"models/x is not found"}}' }), 'MODEL_NOT_FOUND');
  assert.equal(classifyProviderError({ status: 429, hint: 'google', providerText: '{"error":{"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded for requests per minute"}}' }), 'RATE_LIMITED');
});
