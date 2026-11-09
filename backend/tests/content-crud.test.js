import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

// Fixture prefix yang unik agar suite ini tidak bertabrakan dengan data asli
// atau file test lain. Cleanup hanya menghapus baris milik suite ini.
const PREFIX = 'crudtest-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;

let server;
let baseUrl;

function makeClient() {
  const jar = new Map();
  return {
    cookie: (name) => jar.get(name),
    setCookie: (name, value) => jar.set(name, value),
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
      ...(withAdmin ? { admin: { create: { nama: 'Test Admin CRUD' } } } : {}),
    },
  });
}

const resources = [
  {
    name: 'berita',
    path: '/api/berita',
    payload: { judul: `${PREFIX}berita`, slug: `${PREFIX}berita`, ringkasan: 'Ringkasan berita', konten: '<p>Isi berita</p>', status: 'draft', penulis: 'Admin' },
    patch: { judul: `${PREFIX}berita-edit`, status: 'published' },
    assertField: (body) => assert.equal(body.data.status, 'published'),
  },
  {
    name: 'pengumuman',
    path: '/api/pengumuman',
    payload: { judul: `${PREFIX}pengumuman`, slug: `${PREFIX}pengumuman`, konten: '<p>Isi pengumuman</p>', status: 'draft', tanggal: '2031-09-01' },
    patch: { judul: `${PREFIX}pengumuman-edit`, status: 'published' },
    assertField: (body) => assert.equal(body.data.status, 'published'),
  },
  {
    name: 'prestasi',
    path: '/api/prestasi',
    payload: { judul: `${PREFIX}prestasi`, slug: `${PREFIX}prestasi`, kategori: 'Teknologi', deskripsi: '<p>Deskripsi prestasi</p>', tingkat: 'Nasional', tanggal: '2031-09-02' },
    patch: { judul: `${PREFIX}prestasi-edit`, tingkat: 'Provinsi' },
    assertField: (body) => assert.equal(body.data.tingkat, 'Provinsi'),
  },
  {
    name: 'bkk',
    path: '/api/bkk',
    payload: { perusahaan: `${PREFIX}PT Contoh`, posisi: `${PREFIX}Developer`, deskripsi: '<p>Lowongan</p>', lokasi: 'Purwokerto', tipe_pekerjaan: 'Full-time', deadline: '2031-12-31', status: 'aktif', link_pendaftaran: 'https://example.test/apply' },
    patch: { posisi: `${PREFIX}Developer Senior`, status: 'ditutup' },
    assertField: (body) => assert.equal(body.data.status, 'ditutup'),
  },
];

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.berita.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.pengumuman.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.prestasi.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.bkk.deleteMany({ where: { perusahaan: { startsWith: PREFIX } } });
  await prisma.event.deleteMany({ where: { judul: { startsWith: PREFIX } } });

  await createUser(ADMIN_EMAIL, { role: 'admin', withAdmin: true });
  await createUser(APPLICANT_EMAIL);
});

after(async () => {
  await prisma.berita.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.pengumuman.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.prestasi.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.bkk.deleteMany({ where: { perusahaan: { startsWith: PREFIX } } });
  await prisma.event.deleteMany({ where: { judul: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('admin can create, read, update, and delete every content type', async () => {
  const admin = makeClient();
  const loginRes = await login(admin, ADMIN_EMAIL);
  assert.equal(loginRes.status, 200);

  for (const resource of resources) {
    const created = await admin.request(resource.path, { method: 'POST', body: JSON.stringify(resource.payload) });
    assert.equal(created.status, 201, `${resource.name} create should succeed: ${JSON.stringify(created.body)}`);
    const id = created.body.data.id;
    assert.ok(id, `${resource.name} create must return an id`);

    const read = await admin.request(`${resource.path}/${id}`);
    assert.equal(read.status, 200, `${resource.name} read should succeed`);
    assert.equal(read.body.data.id, id);

    const updated = await admin.request(`${resource.path}/${id}`, { method: 'PATCH', body: JSON.stringify(resource.patch) });
    assert.equal(updated.status, 200, `${resource.name} update should succeed: ${JSON.stringify(updated.body)}`);
    resource.assertField(updated.body);

    const removed = await admin.request(`${resource.path}/${id}`, { method: 'DELETE' });
    assert.equal(removed.status, 204, `${resource.name} delete should succeed`);

    const missing = await admin.request(`${resource.path}/${id}`, { method: 'DELETE' });
    assert.equal(missing.status, 404, `${resource.name} second delete should be 404`);
    assert.equal(missing.body.code, 'not_found');
  }
});

test('duplicate slug is reported as a conflict', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const payload = { ...resources[0].payload, slug: `${PREFIX}duplicate`, judul: `${PREFIX}duplicate` };
  const first = await admin.request('/api/berita', { method: 'POST', body: JSON.stringify(payload) });
  assert.equal(first.status, 201);
  const second = await admin.request('/api/berita', { method: 'POST', body: JSON.stringify({ ...payload, judul: `${PREFIX}duplicate-2` }) });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'duplicate');
  await admin.request(`/api/berita/${first.body.data.id}`, { method: 'DELETE' });
});

test('invalid payload is rejected with validation_error', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const invalid = await admin.request('/api/berita', { method: 'POST', body: JSON.stringify({ judul: `${PREFIX}invalid`, konten: '' }) });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'validation_error');
  assert.ok(Array.isArray(invalid.body.details));
});

test('mutations without a session are rejected with 401', async () => {
  const guest = makeClient();
  await guest.request('/api/auth/csrf');
  const res = await guest.request('/api/berita', { method: 'POST', body: JSON.stringify(resources[0].payload) });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'unauthorized');
});

test('an applicant with a session cannot mutate content (403)', async () => {
  const applicant = makeClient();
  assert.equal((await login(applicant, APPLICANT_EMAIL)).status, 200);
  const res = await applicant.request('/api/prestasi', { method: 'POST', body: JSON.stringify(resources[2].payload) });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'forbidden');
});

test('a mutation without a CSRF token is rejected with csrf_failed', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  // Kirim sesi valid tanpa cookie/header CSRF; helper normal menambahkan keduanya.
  const raw = await fetch(`${baseUrl}/api/bkk`, {
    method: 'POST',
    headers: {
      cookie: `session_token=${admin.cookie('session_token')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(resources[3].payload),
  });
  assert.equal(raw.status, 400);
  assert.equal((await raw.json()).code, 'csrf_failed');
});

test('updating an unknown row returns not_found', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const res = await admin.request('/api/berita/00000000-0000-4000-8000-000000000000', {
    method: 'PATCH',
    body: JSON.stringify({ judul: `${PREFIX}ghost` }),
  });
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'not_found');
});

test('event categories are hyphenated at the API boundary', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);

  const created = await admin.request('/api/events', {
    method: 'POST',
    body: JSON.stringify({ judul: `${PREFIX}cuti`, deskripsi: 'x', kategori: 'cuti-bersama', tanggal_mulai: '2031-10-01', status: 'published' }),
  });
  assert.equal(created.status, 201, `create with hyphen category must succeed: ${JSON.stringify(created.body)}`);
  assert.equal(created.body.data.kategori, 'cuti-bersama');

  const read = await admin.request(`/api/events/${created.body.data.id}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.data.kategori, 'cuti-bersama', 'read must echo the hyphen category');

  const patched = await admin.request(`/api/events/${created.body.data.id}`, { method: 'PATCH', body: JSON.stringify({ kategori: 'awal-pkl' }) });
  assert.equal(patched.status, 200, `edit to another hyphen category must succeed: ${JSON.stringify(patched.body)}`);
  assert.equal(patched.body.data.kategori, 'awal-pkl');

  // Baris lama tersimpan sebagai identifier enum Prisma (underscore); respons
  // API harus tetap memakai bentuk hyphen agar cocok dengan registry frontend.
  const legacy = await prisma.event.create({
    data: { judul: `${PREFIX}legacy`, deskripsi: 'x', kategori: 'awal_pkl', tanggalMulai: new Date('2031-10-02T00:00:00Z'), status: 'published' },
  });
  const legacyRead = await admin.request(`/api/events/${legacy.id}`);
  assert.equal(legacyRead.status, 200);
  assert.equal(legacyRead.body.data.kategori, 'awal-pkl');

  await admin.request(`/api/events/${created.body.data.id}`, { method: 'DELETE' });
  await admin.request(`/api/events/${legacy.id}`, { method: 'DELETE' });
});

test('event date range validation returns a specific error code', async () => {
  const admin = makeClient();
  await login(admin, ADMIN_EMAIL);
  const res = await admin.request('/api/events', {
    method: 'POST',
    body: JSON.stringify({ judul: `${PREFIX}range`, deskripsi: 'x', kategori: 'kegiatan', tanggal_mulai: '2031-10-05', tanggal_selesai: '2031-10-01', status: 'draft' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'invalid_date_range');
});