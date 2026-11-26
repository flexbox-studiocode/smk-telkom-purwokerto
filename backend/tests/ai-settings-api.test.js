import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { validateProviderConfig, validateEndpoint } from '../src/services/aiProvider.js';

const PREFIX = 'aisettings-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

let server;
let baseUrl;
let snapshot = [];

function makeClient() {
  const jar = new Map();
  return {
    cookie: (name) => jar.get(name),
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
      ...(withAdmin ? { admin: { create: { nama: 'AI Settings Admin' } } } : {}),
    },
  });
}

before(async () => {
  process.env.AI_CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Simpan baris yang sudah ada agar restore tidak menyentuh data asli.
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await createUser(ADMIN_EMAIL, { role: 'admin', withAdmin: true });
  await createUser(APPLICANT_EMAIL);
});

after(async () => {
  await prisma.aiProviderConfig.deleteMany();
  for (const row of snapshot) {
    const { id, ...rest } = row;
    await prisma.aiProviderConfig.create({ data: rest });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('endpoint internal/private ditolak (SSRF)', () => {
  for (const endpoint of ['http://127.0.0.1:8080/v1', 'http://localhost/v1', 'http://10.0.0.5/v1', 'http://192.168.1.2/v1', 'http://169.254.169.254/latest/meta-data']) {
    assert.throws(() => validateEndpoint(endpoint), /internal\/private|HTTPS/i, endpoint);
  }
  assert.equal(validateEndpoint('https://api.example.com/v1'), 'https://api.example.com/v1');
});

test('validasi provider menolak konfigurasi tidak lengkap', () => {
  assert.throws(() => validateProviderConfig({ provider: 'custom-openai', model: 'gpt-4o-mini' }), /Endpoint/);
  assert.equal(validateProviderConfig({ provider: 'openai', model: 'gpt-4o-mini' }).endpoint, 'https://api.openai.com/v1');
  assert.throws(() => validateProviderConfig({ provider: 'openai', endpoint: 'https://api.example.com/v1', model: '' }), /Model/);
  assert.throws(() => validateProviderConfig({ provider: 'tidak-ada', endpoint: 'https://api.example.com/v1', model: 'x' }), /Provider/);
  const gemini = validateProviderConfig({ provider: 'gemini', model: 'gemini-2.5-flash' });
  assert.equal(gemini.provider, 'gemini');
  assert.ok(gemini.endpoint.startsWith('https://generativelanguage'));
});

test('GET konfigurasi tanpa login ditolak 401, non-admin 403', async () => {
  const guest = makeClient();
  assert.equal((await guest.request('/api/admin/ai-settings')).status, 401);

  const applicant = makeClient();
  assert.equal((await login(applicant, APPLICANT_EMAIL)).status, 200);
  assert.equal((await applicant.request('/api/admin/ai-settings')).status, 403);
});

test('admin menyimpan konfigurasi: API key terenkripsi dan tidak pernah dikembalikan', async () => {
  const admin = makeClient();
  assert.equal((await login(admin, ADMIN_EMAIL)).status, 200);

  const secret = 'sk-rahasia-uji-jangan-bocor';
  const saved = await admin.request('/api/admin/ai-settings/stela', {
    method: 'PUT',
    body: JSON.stringify({ provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-4o-mini', apiKey: secret, enabled: true }),
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.data.configured, true);
  assert.equal(saved.body.data.enabled, true);
  assert.equal(saved.body.data.apiKey, undefined, 'respons tidak memuat API key');
  assert.ok(!JSON.stringify(saved.body).includes(secret), 'API key tidak boleh muncul di respons');

  const row = await prisma.aiProviderConfig.findUnique({ where: { feature: 'stela' } });
  assert.ok(row.encryptedApiKey && !row.encryptedApiKey.includes(secret), 'API key tersimpan terenkripsi');

  const fetched = await admin.request('/api/admin/ai-settings');
  assert.equal(fetched.status, 200);
  assert.ok(!JSON.stringify(fetched.body).includes(secret), 'GET tidak mengembalikan API key');
  assert.equal(fetched.body.data.find((entry) => entry.service === 'stela').configured, true);

  const disabled = await admin.request('/api/admin/ai-settings/stela/status', { method: 'PATCH', body: JSON.stringify({ enabled: false }) });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.data.enabled, false);

  const removed = await admin.request('/api/admin/ai-settings/stela/key', { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.configured, false);
  assert.equal((await prisma.aiProviderConfig.findUnique({ where: { feature: 'stela' } })).encryptedApiKey, null);
});

test('NEXA dan NextTel disimpan terpisah, GET hanya mengembalikan metadata aman', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const secrets = { stela: 'sk-nexa-terpisah', nexttel: 'sk-nexttel-terpisah' };
  for (const [service, apiKey] of Object.entries(secrets)) {
    const res = await admin.request(`/api/admin/ai-settings/${service}`, {
      method: 'PUT',
      body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey, enabled: true }),
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  const rows = await prisma.aiProviderConfig.findMany({ orderBy: { feature: 'asc' } });
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].encryptedApiKey, rows[1].encryptedApiKey, 'setiap layanan menyimpan secret sendiri');

  const fetched = await admin.request('/api/admin/ai-settings');
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.length, 2);
  for (const item of fetched.body.data) {
    assert.equal(item.configured, true);
    assert.ok(item.encryptionVersion, 'hanya versi enkripsi, bukan ciphertext, boleh dikembalikan');
    assert.equal(item.encryptedApiKey, undefined);
    assert.equal(item.updatedBy, undefined);
    assert.equal(item.id, undefined);
  }
  const serialized = JSON.stringify(fetched.body);
  for (const secret of Object.values(secrets)) assert.ok(!serialized.includes(secret));
});

test('uji koneksi dengan endpoint internal ditolak sebelum request keluar', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const res = await admin.request('/api/admin/ai-settings/stela/test', {
    method: 'POST',
    body: JSON.stringify({ provider: 'openai', endpoint: 'http://127.0.0.1:9000/v1', model: 'x', apiKey: 'rahasia' }),
  });
  assert.equal(res.status, 400);
  assert.ok(!JSON.stringify(res.body).includes('rahasia'), 'error tidak boleh memuat credential');
});

test('mutasi tanpa CSRF ditolak', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const raw = await fetch(`${baseUrl}/api/admin/ai-settings/nexttel`, {
    method: 'PUT',
    headers: { cookie: `session_token=${admin.cookie('session_token')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'x' }),
  });
  assert.equal(raw.status, 400);
  assert.equal((await raw.json()).code, 'csrf_failed');
});
