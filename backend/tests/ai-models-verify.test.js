import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

// Regresi discovery model & verifikasi API key:
// - key tidak pernah dikirim ke browser, selalu lewat backend;
// - provider di luar allowlist ditolak sebelum request jaringan;
// - endpoint internal/private tetap ditolak (SSRF);
// - kegagalan provider diterjemahkan menjadi kode aman, bukan pesan mentah.

const PREFIX = 'aimodels-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const SECRET = 'sk-discovery-rahasia-jangan-bocor';

let server;
let baseUrl;
let snapshot = [];
let admin;
const originalFetch = globalThis.fetch;

function makeClient() {
  const jar = new Map();
  return {
    cookie: (name) => jar.get(name),
    async request(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
      const csrf = jar.get('csrf_token');
      if (options.method && !['GET', 'HEAD'].includes(options.method) && csrf) headers['x-csrf-token'] = csrf;
      const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.cookie = cookie;
      const res = await originalFetch(baseUrl + path, { ...options, headers });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const [key, value] = pair.split('=');
        if (value === '' || /Max-Age=0/i.test(raw)) jar.delete(key);
        else jar.set(key, value);
      }
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      return { status: res.status, body };
    },
  };
}

async function login(client, email) {
  await client.request('/api/auth/csrf');
  return client.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
}

async function createUser(email, { role = 'applicant', withAdmin = false } = {}) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      emailVerified: new Date(),
      role,
      ...(withAdmin ? { admin: { create: { nama: 'AI Model Admin' } } } : {}),
    },
  });
}

// Menangkap panggilan keluar ke host provider saja; request ke server uji
// diteruskan ke fetch asli.
function stubProvider(handler) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (target.startsWith('https://api.example.com') || target.startsWith('https://generativelanguage.googleapis.com') || target.startsWith('https://api.anthropic.com')) {
      calls.push({ url: target, options });
      return handler(target, options);
    }
    return originalFetch(url, options);
  };
  return calls;
}

before(async () => {
  process.env.AI_CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await createUser(ADMIN_EMAIL, { role: 'admin', withAdmin: true });
  await createUser(APPLICANT_EMAIL);
  // Satu sesi admin dipakai ulang: login dibatasi 10x/15 menit dan tidak
  // relevan dengan skenario yang diuji di sini.
  admin = makeClient();
  assert.equal((await login(admin, ADMIN_EMAIL)).status, 200);
});

after(async () => {
  globalThis.fetch = originalFetch;
  await prisma.aiProviderConfig.deleteMany();
  for (const row of snapshot) { const { id, ...rest } = row; await prisma.aiProviderConfig.create({ data: rest }).catch(() => {}); }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

afterEach(() => { globalThis.fetch = originalFetch; });

test('daftar provider hanya metadata aman dan butuh admin', async () => {
  const guest = makeClient();
  assert.equal((await guest.request('/api/admin/ai-settings/providers')).status, 401);

  const applicant = makeClient();
  await login(applicant, APPLICANT_EMAIL);
  assert.equal((await applicant.request('/api/admin/ai-settings/providers')).status, 403);

  const res = await admin.request('/api/admin/ai-settings/providers');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((item) => item.id), ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'custom-openai']);
  for (const item of res.body.data) {
    assert.equal(item.apiKey, undefined);
    assert.equal(typeof item.supportsModelList, 'boolean');
  }
});

test('discovery Gemini memakai header dan mengembalikan model unik', async () => {
  const calls = stubProvider(() => Response.json({
    models: [
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
      { name: 'models/gemini-2.5-flash', displayName: 'Duplikat' },
      { name: 'models/gemini-2.5-pro' },
    ],
  }));
  const res = await admin.request('/api/admin/ai-settings/stela/models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'gemini', apiKey: SECRET }),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.supported, true);
  assert.deepEqual(res.body.data.models.map((m) => m.id), ['gemini-2.5-flash', 'gemini-2.5-pro']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers['x-goog-api-key'], SECRET);
  assert.ok(!calls[0].url.includes(SECRET), 'API key tidak di URL');
  assert.ok(!JSON.stringify(res.body).includes(SECRET), 'respons tidak memuat API key');
});

test('discovery memakai key tersimpan bila field key kosong', async () => {
  await prisma.aiProviderConfig.deleteMany();
  const simpan = await admin.request('/api/admin/ai-settings/nexttel', {
    method: 'PUT',
    body: JSON.stringify({ provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-x', apiKey: SECRET, enabled: false }),
  });
  assert.equal(simpan.status, 200, JSON.stringify(simpan.body));
  const calls = stubProvider(() => Response.json({ data: [{ id: 'gpt-x' }, { id: 'gpt-y' }] }));
  const res = await admin.request('/api/admin/ai-settings/nexttel/models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'openai', endpoint: 'https://api.example.com/v1' }),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.models.map((m) => m.id), ['gpt-x', 'gpt-y']);
  assert.equal(calls[0].options.headers.authorization, `Bearer ${SECRET}`);
});

test('provider di luar allowlist ditolak tanpa memanggil jaringan', async () => {
  let called = false;
  globalThis.fetch = async (url, options) => { if (String(url).startsWith('https://evil')) called = true; return originalFetch(url, options); };
  const res = await admin.request('/api/admin/ai-settings/stela/models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'evil-provider', endpoint: 'https://evil.example.com/v1', apiKey: 'x' }),
  });
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(called, false);
});

test('discovery menolak endpoint internal (SSRF)', async () => {
  let called = false;
  globalThis.fetch = async (url, options) => { if (String(url).includes('127.0.0.1:9000')) called = true; return originalFetch(url, options); };
  const res = await admin.request('/api/admin/ai-settings/stela/models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'custom-openai', endpoint: 'http://127.0.0.1:9000/v1', apiKey: 'x' }),
  });
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(called, false);
  assert.ok(!JSON.stringify(res.body).includes('127.0.0.1:9000'), 'pesan tidak membocorkan endpoint internal');
});

test('provider tanpa dukungan daftar model mengembalikan supported:false', async () => {
  const calls = stubProvider(() => Response.json({ data: [] }));
  const res = await admin.request('/api/admin/ai-settings/stela/models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'anthropic', apiKey: SECRET }),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.supported, false);
  assert.deepEqual(res.body.data.models, []);
  assert.equal(calls.length, 0, 'tidak ada request jaringan untuk provider tanpa discovery');
});

test('verifikasi API key memakai daftar model untuk provider yang mendukung', async () => {
  const calls = stubProvider(() => Response.json({ models: [{ name: 'models/gemini-2.5-flash' }] }));
  const res = await admin.request('/api/admin/ai-settings/stela/verify', {
    method: 'POST',
    body: JSON.stringify({ provider: 'gemini', apiKey: SECRET }),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.verified, true);
  assert.equal(res.body.data.method, 'model_list');
  assert.equal(calls.length, 1);
  assert.ok(!JSON.stringify(res.body).includes(SECRET));
});

test('verifikasi provider tanpa discovery mengirim satu prompt minimal', async () => {
  const calls = stubProvider(() => Response.json({ content: [{ type: 'text', text: 'pong' }] }));
  const res = await admin.request('/api/admin/ai-settings/stela/verify', {
    method: 'POST',
    body: JSON.stringify({ provider: 'anthropic', apiKey: SECRET, model: 'claude-3-5-haiku-latest' }),
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.method, 'generate');
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].options.body);
  assert.ok(sent.max_tokens <= 32, 'verifikasi memakai budget token minimal');
  assert.equal(calls[0].options.headers['x-api-key'], SECRET);
});

test('kegagalan verifikasi tidak membocorkan pesan mentah provider', async () => {
  stubProvider(() => new Response(JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: `API key not valid: ${SECRET}` } }), { status: 401 }));
  const res = await admin.request('/api/admin/ai-settings/stela/verify', {
    method: 'POST',
    body: JSON.stringify({ provider: 'gemini', apiKey: SECRET }),
  });
  assert.equal(res.status, 502, JSON.stringify(res.body));
  assert.equal(res.body.code, 'API_KEY_INVALID');
  assert.ok(!JSON.stringify(res.body).includes(SECRET));
  assert.ok(!/api key not valid/i.test(JSON.stringify(res.body)), 'pesan mentah provider tidak diteruskan');
});

test('verifikasi tanpa key sama sekali ditolak 400', async () => {
  // Login diulang: uji kuota/rate-limit sebelumnya tidak dimaksudkan untuk
  // menguji sesi, jadi sesi segar dipakai agar hasilnya deterministik.
  await prisma.aiProviderConfig.deleteMany();
  const res = await admin.request('/api/admin/ai-settings/nexttel/verify', {
    method: 'POST',
    body: JSON.stringify({ provider: 'deepseek' }),
  });
  assert.equal(res.status, 400, JSON.stringify(res.body));
});
