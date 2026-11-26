import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { invalidateAiConfigCache } from '../src/services/aiRuntimeConfig.js';

// Regresi aturan penyimpanan konfigurasi AI Admin:
// - konfigurasi pertama wajib memuat API key;
// - key lama dipertahankan saat hanya model/provider yang diubah;
// - layanan tidak dapat diaktifkan sebelum key tersimpan;
// - uji koneksi boleh memakai key tersimpan tanpa menyimpan ulang.

const PREFIX = 'aivalid-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

let server;
let baseUrl;
let snapshot = [];

function makeClient() {
  const jar = new Map();
  return {
    async request(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (options.body && !(options.body instanceof FormData) && !headers['content-type']) headers['content-type'] = 'application/json';
      const csrf = jar.get('csrf_token');
      if (options.method && !['GET', 'HEAD'].includes(options.method) && csrf) headers['x-csrf-token'] = csrf;
      const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.cookie = cookie;
      const res = await fetch(baseUrl + path, { ...options, headers });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const index = pair.indexOf('=');
        const key = pair.slice(0, index);
        const value = pair.slice(index + 1);
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

async function loginAdmin() {
  const admin = makeClient();
  await admin.request('/api/auth/csrf');
  const res = await admin.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }) });
  assert.equal(res.status, 200);
  return admin;
}

before(async () => {
  process.env.AI_CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      emailVerified: new Date(),
      role: 'admin',
      admin: { create: { nama: 'AI Validation Admin' } },
    },
  });
});

after(async () => {
  await prisma.aiProviderConfig.deleteMany();
  for (const row of snapshot) { const { id, ...rest } = row; await prisma.aiProviderConfig.create({ data: rest }).catch(() => {}); }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('konfigurasi pertama tanpa API key ditolak dan tidak membuat baris', async () => {
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
  const admin = await loginAdmin();
  const res = await admin.request('/api/admin/ai-settings/stela', { method: 'PUT', body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash' }) });
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(await prisma.aiProviderConfig.findUnique({ where: { feature: 'stela' } }), null);
});

test('mengubah model tanpa field key mempertahankan key tersimpan', async () => {
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
  const admin = await loginAdmin();
  const simpan = await admin.request('/api/admin/ai-settings/stela', { method: 'PUT', body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'sk-pertama', enabled: true }) });
  assert.equal(simpan.status, 200, JSON.stringify(simpan.body));
  const sebelum = await prisma.aiProviderConfig.findUnique({ where: { feature: 'stela' } });

  const ganti = await admin.request('/api/admin/ai-settings/stela', { method: 'PUT', body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-pro' }) });
  assert.equal(ganti.status, 200, JSON.stringify(ganti.body));
  const sesudah = await prisma.aiProviderConfig.findUnique({ where: { feature: 'stela' } });
  assert.equal(sesudah.encryptedApiKey, sebelum.encryptedApiKey, 'key lama tidak tertimpa string kosong');
  assert.equal(sesudah.model, 'gemini-2.5-pro');
  assert.equal(sesudah.enabled, true, 'status aktif tidak berubah tanpa field enabled');
  assert.equal(await admin.request('/api/admin/ai-settings/nexttel/status', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }).then((r) => r.status), 400, 'layanan tanpa baris ditolak');
});

test('layanan tidak dapat diaktifkan sebelum key tersimpan', async () => {
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
  const admin = await loginAdmin();
  await admin.request('/api/admin/ai-settings/nexttel', { method: 'PUT', body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'sk-uji', enabled: false }) });
  const hapus = await admin.request('/api/admin/ai-settings/nexttel/key', { method: 'DELETE' });
  assert.equal(hapus.status, 200);
  assert.equal(hapus.body.data.configured, false);
  const aktif = await admin.request('/api/admin/ai-settings/nexttel/status', { method: 'PATCH', body: JSON.stringify({ enabled: true }) });
  assert.equal(aktif.status, 400, JSON.stringify(aktif.body));
  const row = await prisma.aiProviderConfig.findUnique({ where: { feature: 'nexttel' } });
  assert.equal(row.encryptedApiKey, null);
  assert.equal(row.enabled, false);
});

test('uji koneksi memakai key tersimpan bila field key kosong', async () => {
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
  const admin = await loginAdmin();
  await admin.request('/api/admin/ai-settings/stela', { method: 'PUT', body: JSON.stringify({ provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-uji', apiKey: 'sk-tersimpan', enabled: false }) });

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://api.example.com')) {
      calls.push({ url: String(url), auth: options?.headers?.authorization });
      return Response.json({ choices: [{ message: { content: 'ok' } }] });
    }
    return originalFetch(url, options);
  };
  try {
    const res = await admin.request('/api/admin/ai-settings/stela/test', { method: 'POST', body: JSON.stringify({ provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-uji' }) });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(calls.length, 1, 'provider dipanggil sekali');
  assert.ok(calls[0].auth.includes('sk-tersimpan'), 'uji koneksi memakai key tersimpan');
});
