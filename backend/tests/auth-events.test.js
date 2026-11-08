import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { hashToken } from '../src/utils/crypto.js';

// Fixtures use a unique prefix so concurrent test files cannot collide with them.
const PREFIX = 'authtest-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;
const NO_PROFILE_EMAIL = `${PREFIX}noprofile@example.test`;

let server;
let baseUrl;
let adminUser;
let applicantUser;
let noProfileUser;
let publishedEvent;
let draftEvent;

function makeClient() {
  const jar = new Map();
  return {
    cookie: (name) => jar.get(name),
    setCookie: (name, value) => jar.set(name, value),
    clear: () => jar.clear(),
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
      return { status: res.status, body, headers: res.headers };
    },
  };
}

async function login(client, email, password = PASSWORD) {
  await client.request('/api/auth/csrf');
  return client.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

async function createUser(email, { role = 'applicant', withAdmin = false } = {}) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      emailVerified: new Date(),
      role,
      ...(withAdmin ? { admin: { create: { nama: 'Test Admin' } } } : {}),
    },
  });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.event.deleteMany({ where: { judul: { startsWith: PREFIX } } });

  adminUser = await createUser(ADMIN_EMAIL, { role: 'admin', withAdmin: true });
  applicantUser = await createUser(APPLICANT_EMAIL);
  noProfileUser = await createUser(NO_PROFILE_EMAIL, { role: 'admin' });

  publishedEvent = await prisma.event.create({
    data: { judul: `${PREFIX}published`, deskripsi: 'Uji', kategori: 'akademik', tanggalMulai: new Date('2031-05-01T00:00:00Z'), status: 'published' },
  });
  draftEvent = await prisma.event.create({
    data: { judul: `${PREFIX}draft`, deskripsi: 'Uji', kategori: 'akademik', tanggalMulai: new Date('2031-05-02T00:00:00Z'), status: 'draft' },
  });
});

after(async () => {
  await prisma.event.deleteMany({ where: { judul: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('login without a CSRF token is rejected', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, 'bad_request');
});

test('unknown email and wrong password return the same generic error', async () => {
  const unknown = makeClient();
  const unknownRes = await login(unknown, `${PREFIX}missing@example.test`);
  assert.equal(unknownRes.status, 401);
  const wrong = makeClient();
  const wrongRes = await login(wrong, ADMIN_EMAIL, 'wrong-password-12345');
  assert.equal(wrongRes.status, 401);
  assert.equal(unknownRes.body.error, wrongRes.body.error);
  assert.match(unknownRes.body.error, /Email atau password salah/);
});

test('admin login normalizes uppercase email and persists a hashed session', async () => {
  const client = makeClient();
  const res = await login(client, ADMIN_EMAIL.toUpperCase());
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'admin');
  assert.equal(res.body.user.email, ADMIN_EMAIL);

  const rawSession = client.cookie('session_token');
  assert.ok(rawSession, 'session cookie must be set');
  const stored = await prisma.session.findUnique({ where: { tokenHash: hashToken(rawSession) } });
  assert.ok(stored, 'database must store the hashed session token');
  assert.notEqual(stored.tokenHash, rawSession);

  const me = await client.request('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.role, 'admin');
  assert.equal(me.body.user.id, adminUser.id);
});

test('admin session receives drafts, guest only receives published events', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const adminList = await admin.request('/api/events?limit=100&page=1');
  assert.equal(adminList.status, 200);
  assert.ok(adminList.body.data.some((row) => row.id === draftEvent.id), 'admin must see drafts');

  const guest = makeClient();
  const guestList = await guest.request('/api/events?limit=100&page=1');
  assert.equal(guestList.status, 200);
  assert.ok(guestList.body.data.every((row) => row.status === 'published'));
  assert.ok(!guestList.body.data.some((row) => row.id === draftEvent.id));

  const guestDraft = await guest.request(`/api/events/${draftEvent.id}`);
  assert.equal(guestDraft.status, 404);
  const adminDraft = await admin.request(`/api/events/${draftEvent.id}`);
  assert.equal(adminDraft.status, 200);
});

test('API responses are not cache-validated with ETag/304', async () => {
  const guest = makeClient();
  const res = await guest.request('/api/events?limit=100&page=1', { headers: { 'if-none-match': 'W/"stale"' } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control') || '', /no-store/);
  assert.equal(res.headers.get('etag'), null);
});

test('applicant can authenticate but cannot access admin mutations', async () => {
  const client = makeClient();
  const res = await login(client, APPLICANT_EMAIL);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'applicant');

  const me = await client.request('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, applicantUser.id);

  const create = await client.request('/api/events', { method: 'POST', body: JSON.stringify({ judul: `${PREFIX}forbidden`, deskripsi: 'x', kategori: 'akademik', tanggal_mulai: '2031-06-01', status: 'draft' }) });
  assert.equal(create.status, 403);
  const remove = await client.request(`/api/events/${publishedEvent.id}`, { method: 'DELETE' });
  assert.equal(remove.status, 403);

  const list = await client.request('/api/events?limit=100&page=1');
  assert.ok(list.body.data.every((row) => row.status === 'published'), 'user without admin profile must not see drafts');
});

test('user without an admin relation is not treated as an admin', async () => {
  const client = makeClient();
  const res = await login(client, NO_PROFILE_EMAIL);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'applicant', 'role is derived from the admin relation, not users.role');

  const create = await client.request('/api/events', { method: 'POST', body: JSON.stringify({ judul: `${PREFIX}noprofile`, deskripsi: 'x', kategori: 'akademik', tanggal_mulai: '2031-06-02' }) });
  assert.equal(create.status, 403);
  assert.equal(noProfileUser.role, 'admin', 'fixture intentionally has a stale role string');
});

test('logout deletes the session and clears access', async () => {
  const client = makeClient();
  await login(client, APPLICANT_EMAIL);
  const before = await client.request('/api/auth/me');
  assert.equal(before.status, 200);
  const token = client.cookie('session_token');

  const logout = await client.request('/api/auth/logout', { method: 'POST' });
  assert.equal(logout.status, 204);
  const afterLogout = await client.request('/api/auth/me');
  assert.equal(afterLogout.status, 401);
  const stored = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  assert.equal(stored, null, 'logout must remove the database session');
});

test('expired and unknown session tokens are rejected', async () => {
  await prisma.session.create({
    data: { userId: applicantUser.id, tokenHash: hashToken('expired-session-token'), expiresAt: new Date(Date.now() - 60_000) },
  });
  const expired = makeClient();
  expired.setCookie('session_token', 'expired-session-token');
  const expiredRes = await expired.request('/api/auth/me');
  assert.equal(expiredRes.status, 401);
  assert.equal(await prisma.session.findUnique({ where: { tokenHash: hashToken('expired-session-token') } }), null, 'expired session should be cleaned up');

  const unknown = makeClient();
  unknown.setCookie('session_token', 'never-issued-token');
  const unknownRes = await unknown.request('/api/auth/me');
  assert.equal(unknownRes.status, 401);
});

test('guest cannot read or mutate admin event endpoints', async () => {
  const guest = makeClient();
  await guest.request('/api/auth/csrf');
  const create = await guest.request('/api/events', { method: 'POST', body: JSON.stringify({ judul: `${PREFIX}guest`, deskripsi: 'x', kategori: 'akademik', tanggal_mulai: '2031-06-03' }) });
  assert.equal(create.status, 401);
  const remove = await guest.request(`/api/events/${publishedEvent.id}`, { method: 'DELETE' });
  assert.equal(remove.status, 401);
});

test('event validation rejects bad dates, times, categories, and URLs', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const base = { judul: `${PREFIX}validation`, deskripsi: 'x', kategori: 'akademik', tanggal_mulai: '2031-07-01', status: 'draft' };
  const cases = [
    { ...base, kategori: 'tidak-ada' },
    { ...base, tanggal_mulai: 'bukan-tanggal' },
    { ...base, waktu_mulai: '25:99' },
    { ...base, tanggal_selesai: '2031-06-30' },
    { ...base, tanggal_mulai: '2031-07-01', tanggal_selesai: '2031-07-01', waktu_mulai: '10:00', waktu_selesai: '09:00' },
    { ...base, gambar_url: 'ftp://example.test/poster.png' },
  ];
  for (const payload of cases) {
    const res = await admin.request('/api/events', { method: 'POST', body: JSON.stringify(payload) });
    assert.equal(res.status, 400, `payload should be rejected: ${JSON.stringify(payload)}`);
  }
});

test('event CRUD publishes a draft and supports deletion', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const create = await admin.request('/api/events', {
    method: 'POST',
    body: JSON.stringify({ judul: `${PREFIX}crud`, deskripsi: 'x', kategori: 'lomba', tanggal_mulai: '2031-08-01', waktu_mulai: '08:00', waktu_selesai: '10:00', status: 'draft' }),
  });
  assert.equal(create.status, 201);
  const id = create.body.data.id;

  const patch = await admin.request(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.status, 'published');

  const guest = makeClient();
  const guestList = await guest.request('/api/events?limit=100&page=1');
  assert.ok(guestList.body.data.some((row) => row.id === id), 'published draft must appear publicly');

  const remove = await admin.request(`/api/events/${id}`, { method: 'DELETE' });
  assert.equal(remove.status, 204);
  const missing = await admin.request(`/api/events/${id}`, { method: 'DELETE' });
  assert.equal(missing.status, 404);
});

test('event pagination reports consistent totals', async () => {
  const guest = makeClient();
  const res = await guest.request('/api/events?limit=1&page=1');
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.page, 1);
  assert.equal(res.body.pagination.limit, 1);
  assert.equal(res.body.pagination.total, res.body.pagination.pages, 'limit=1 makes pages equal total');
  assert.ok(res.body.data.length <= 1);
});