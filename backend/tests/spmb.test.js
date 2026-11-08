import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

test('SPMB admin CRUD persists to MySQL and public reads respect publication', async () => {
  assert(['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Run this integration test against a local database.');
  const previousFeatureFlag = process.env.SPMB_INTERNAL_ENABLED;
  process.env.SPMB_INTERNAL_ENABLED = 'true';
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const password = crypto.randomBytes(24).toString('base64url');
  const email = `test-spmb-${crypto.randomUUID()}@example.invalid`;
  const ids = [];
  let admin;
  const cookies = new Map();
  async function request(path, { method = 'GET', body, anonymous = false } = {}) {
    const headers = { 'content-type': 'application/json', cookie: anonymous ? 'csrf_token=guest' : [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), 'x-csrf-token': anonymous ? 'guest' : cookies.get('csrf_token') || '' };
    const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!anonymous) for (const raw of response.headers.getSetCookie()) { const [key, value] = raw.split(';')[0].split('='); cookies.set(key, value); }
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  try {
    admin = await prisma.user.create({ data: { email, passwordHash: await argon2.hash(password), emailVerified: new Date(), admin: { create: { nama: 'SPMB Integration Test' } } } });
    await request('/api/auth/csrf');
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email, password } })).status, 200);
    assert.equal((await request('/api/auth/me')).body.user.role, 'admin');
    const body = { jenis: 'jadwal', judul: 'Gelombang QA', deskripsi: 'Jadwal integrasi sementara', urutan: 1, tanggal_mulai: '2030-01-01', tanggal_selesai: '2030-12-31', sumber_url: '/spmb', status: 'draft' };
    assert.equal((await request('/api/spmb', { method: 'POST', body, anonymous: true })).status, 401);
    const created = await request('/api/spmb', { method: 'POST', body });
    assert.equal(created.status, 201);
    ids.push(created.body.data.id);
    const id = ids[0];
    assert.equal((await request('/api/spmb', { anonymous: true })).body.data.some(row => row.id === id), false);
    assert.equal((await request(`/api/spmb/${id}`, { anonymous: true })).status, 404);
    assert((await request('/api/spmb')).body.data.some(row => row.id === id));
    assert.equal((await request(`/api/spmb/${id}`, { method: 'PATCH', body: { status: 'published', judul: 'Gelombang Aktif QA' } })).status, 200);
    const published = (await request(`/api/spmb/${id}`, { anonymous: true })).body.data;
    assert.equal(published.judul, 'Gelombang Aktif QA');
    assert.equal(published.tanggalMulai.slice(0, 10), '2030-01-01');
    assert.equal((await prisma.spmbInformation.findUnique({ where: { id } })).status, 'published');
    const stats = (await request('/api/stats/spmb', { anonymous: true })).body.data;
    assert.equal(stats.total_pendaftar, await prisma.ppdb.count());
    assert.deepEqual(Object.keys(stats).sort(), ['diterima', 'kuota_tersedia', 'kuota_total', 'total_pendaftar']);
    assert.equal((await request(`/api/spmb/${id}`, { method: 'DELETE' })).status, 204);
    assert.equal((await request(`/api/spmb/${id}`, { anonymous: true })).status, 404);
  } finally {
    if (previousFeatureFlag === undefined) delete process.env.SPMB_INTERNAL_ENABLED;
    else process.env.SPMB_INTERNAL_ENABLED = previousFeatureFlag;
    await prisma.spmbInformation.deleteMany({ where: { id: { in: ids } } });
    if (admin) await prisma.user.delete({ where: { id: admin.id } });
    await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  }
});
