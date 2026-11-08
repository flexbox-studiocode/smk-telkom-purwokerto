import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

const PREFIX = 'spmbflag-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;

let server;
let baseUrl;
let adminUser;
let applicantUser;
const spmbIds = [];

function makeClient() {
  const jar = new Map();
  return {
    async request(path, { method = 'GET', body } = {}) {
      const headers = {};
      if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
      const csrf = jar.get('csrf_token');
      if (!['GET', 'HEAD'].includes(method) && csrf) headers['x-csrf-token'] = csrf;
      const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.cookie = cookie;
      const res = await fetch(baseUrl + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const [key, value] = pair.split('=');
        if (value === '' || /Max-Age=0/i.test(raw)) jar.delete(key);
        else jar.set(key, value);
      }
      const text = await res.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      return { status: res.status, body: parsed };
    },
    async login(email) {
      await this.request('/api/auth/csrf');
      return this.request('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
    },
  };
}

async function createUser(email) {
  return prisma.user.create({
    data: { email, passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }), emailVerified: new Date() },
  });
}

before(async () => {
  assert(['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Run this test against a local database.');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      emailVerified: new Date(),
      admin: { create: { nama: 'SPMB Flag Test' } },
    },
  });
  applicantUser = await createUser(APPLICANT_EMAIL);
});

after(async () => {
  delete process.env.SPMB_INTERNAL_ENABLED;
  await prisma.spmbInformation.deleteMany({ where: { id: { in: spmbIds } } });
  await prisma.ppdbDraft.deleteMany({ where: { userId: applicantUser?.id } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('SPMB disabled: public config reports the safe default', async () => {
  process.env.SPMB_INTERNAL_ENABLED = 'false';
  const client = makeClient();
  const res = await client.request('/api/config');
  assert.equal(res.status, 200);
  assert.equal(res.body.spmbInternalEnabled, false);
  assert.equal(res.body.officialAdmissionsUrl, 'https://ppdb.telkomschools.sch.id/welcome');
  assert.equal(JSON.stringify(res.body).includes('PASSWORD'), false, 'config must not leak secrets');
});

test('SPMB disabled: internal registration mutations return 503 SPMB_DISABLED', async () => {
  process.env.SPMB_INTERNAL_ENABLED = 'false';
  const admin = makeClient();
  const applicant = makeClient();
  await admin.login(ADMIN_EMAIL);
  await applicant.login(APPLICANT_EMAIL);

  const registration = await applicant.request('/api/ppdb', { method: 'POST', body: {} });
  assert.equal(registration.status, 503);
  assert.equal(registration.body.code, 'SPMB_DISABLED');

  const draft = await applicant.request('/api/ppdb/draft', { method: 'PUT', body: { biodata: {}, nilai: {} } });
  assert.equal(draft.status, 503);
  assert.equal(draft.body.code, 'SPMB_DISABLED');

  const upload = await applicant.request('/api/uploads/ppdb-documents', { method: 'POST', body: {} });
  assert.equal(upload.status, 503);
  assert.equal(upload.body.code, 'SPMB_DISABLED');

  const info = await admin.request('/api/spmb', {
    method: 'POST',
    body: { jenis: 'jadwal', judul: `${PREFIX}blocked`, deskripsi: 'x', status: 'draft' },
  });
  assert.equal(info.status, 503);
  assert.equal(info.body.code, 'SPMB_DISABLED');

  const status = await admin.request(`/api/admin/ppdb/${crypto.randomUUID()}/status`, {
    method: 'PATCH',
    body: { status: 'diproses' },
  });
  assert.equal(status.status, 503);
  assert.equal(status.body.code, 'SPMB_DISABLED');
});

test('SPMB disabled: historical reads and non-PPDB uploads stay available', async () => {
  process.env.SPMB_INTERNAL_ENABLED = 'false';
  const admin = makeClient();
  await admin.login(ADMIN_EMAIL);

  const historical = await admin.request('/api/admin/ppdb');
  assert.equal(historical.status, 200, 'admin must retain read access to historical registrations');

  const publicInfo = await makeClient().request('/api/spmb');
  assert.equal(publicInfo.status, 200, 'SPMB information remains readable');

  const contentUpload = await admin.request('/api/uploads/content', { method: 'POST', body: {} });
  assert.notEqual(contentUpload.status, 503, 'non-PPDB content upload must not be disabled');
});

test('SPMB enabled: config flips and internal endpoints function again', async () => {
  process.env.SPMB_INTERNAL_ENABLED = 'true';
  try {
    const admin = makeClient();
    const applicant = makeClient();
    await admin.login(ADMIN_EMAIL);
    await applicant.login(APPLICANT_EMAIL);

    const config = await makeClient().request('/api/config');
    assert.equal(config.body.spmbInternalEnabled, true);

    const draft = await applicant.request('/api/ppdb/draft', { method: 'PUT', body: { biodata: { nama: 'QA' }, nilai: {} } });
    assert.equal(draft.status, 200);

    const created = await admin.request('/api/spmb', {
      method: 'POST',
      body: { jenis: 'jadwal', judul: `${PREFIX}enabled`, deskripsi: 'x', status: 'draft' },
    });
    assert.equal(created.status, 201);
    spmbIds.push(created.body.data.id);
  } finally {
    process.env.SPMB_INTERNAL_ENABLED = 'false';
  }
});