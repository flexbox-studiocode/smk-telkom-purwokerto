import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { normalisasiTelepon } from '../src/modules/stela/prechat.mjs';
import { hashToken } from '../src/utils/crypto.js';

// Penyedia AI dimatikan agar tes tidak memanggil model sungguhan: 503 'config'
// berarti permintaan SUDAH lolos gerbang sesi, 401 berarti ditolak di gerbang.
process.env.STELA_AKTIF = 'false';

let server;
let baseUrl;
const jar = new Map();
const MARK = 'Tes Prechat';

async function request(path, { method = 'GET', body, cookies } = {}) {
  const headers = { 'content-type': 'application/json' };
  const sent = cookies ?? jar;
  if (method !== 'GET' && sent.get('csrf_token')) headers['x-csrf-token'] = sent.get('csrf_token');
  const cookie = [...sent.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookie) headers.cookie = cookie;
  const res = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!cookies) {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie: res.headers.getSetCookie?.() ?? [] };
}

const valid = { nama: `  ${MARK}   Satu `, telepon: '0812-3456 7890', usia: 16, kategori: 'sekolah', organisasi: 'SMP Negeri 1' };
const bersihkan = () => prisma.nexaSession.deleteMany({ where: { fullName: { startsWith: MARK } } });

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await bersihkan();
  await request('/api/auth/csrf');
});

after(async () => {
  await bersihkan();
  await new Promise((r) => server.close(r));
  await closeDatabase();
});

test('format nomor Indonesia dinormalisasi tanpa kehilangan nol di depan', () => {
  for (const ok of ['081234567890', '+6281234567890', '6281234567890', '0812-3456-7890', '(0812) 3456 7890']) assert.equal(normalisasiTelepon(ok), '+6281234567890', ok);
  for (const bad of ['', '123', '0812', 'abc', '08123456789012345', '+1 202 555 0100', '00812345678']) assert.equal(normalisasiTelepon(bad), null, bad);
});

test('chat ditolak tanpa sesi, termasuk dengan cookie palsu', async () => {
  const noCookie = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' } });
  assert.equal(noCookie.status, 401);
  assert.equal(noCookie.body.code, 'session_required');
  const forged = new Map([['csrf_token', jar.get('csrf_token')], ['nexa_session', 'x'.repeat(64)]]);
  const res = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' }, cookies: forged });
  assert.equal(res.status, 401);
  assert.equal((await request('/api/ai/stela/session')).body.data.active, false);
});

test('validasi server menolak data tidak valid dan tidak membuat sesi', async () => {
  const kasus = [
    { ...valid, nama: '   ' }, { ...valid, nama: '12345' }, { ...valid, telepon: '123' }, { ...valid, usia: 3 },
    { ...valid, usia: 16.5 }, { ...valid, usia: '16' }, { ...valid, kategori: 'umum' }, { ...valid, kategori: undefined },
    { ...valid, nik: '3301' }, { ...valid, organisasi: 'x'.repeat(101) },
  ];
  for (const body of kasus) {
    const res = await request('/api/ai/stela/session', { method: 'POST', body: { ...body, nama: body.nama === valid.nama ? `${MARK} x` : body.nama } });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(await prisma.nexaSession.count({ where: { fullName: { startsWith: MARK } } }), 0);
});

test('sesi valid: cookie httpOnly, data tersimpan ternormalisasi, chat lolos gerbang', async () => {
  const res = await request('/api/ai/stela/session', { method: 'POST', body: valid });
  assert.equal(res.status, 201);
  const cookie = res.setCookie.find((c) => c.startsWith('nexa_session='));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.ok(!JSON.stringify(res.body).includes('0812'), 'respons tidak mengembalikan data pribadi');

  const row = await prisma.nexaSession.findUnique({ where: { tokenHash: hashToken(jar.get('nexa_session')) } });
  assert.equal(row.fullName, `${MARK} Satu`);
  assert.equal(row.phone, '+6281234567890');
  assert.equal(row.age, 16);
  assert.equal(row.category, 'sekolah');
  assert.equal(row.organization, 'SMP Negeri 1');

  assert.equal((await request('/api/ai/stela/session')).body.data.active, true);
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' } });
  assert.equal(chat.status, 503);
  assert.equal(chat.body.code, 'config');
});

test('organisasi opsional disimpan null; sesi kedaluwarsa ditolak dan dibersihkan', async () => {
  const { organisasi: _omit, ...tanpaOrg } = valid;
  const lama = jar.get('nexa_session');
  const res = await request('/api/ai/stela/session', { method: 'POST', body: { ...tanpaOrg, kategori: 'instansi' } });
  assert.equal(res.status, 201);
  const baru = jar.get('nexa_session');
  assert.notEqual(baru, lama);
  assert.equal(await prisma.nexaSession.findUnique({ where: { tokenHash: hashToken(lama) } }), null, 'sesi lama diganti');
  const row = await prisma.nexaSession.findUnique({ where: { tokenHash: hashToken(baru) } });
  assert.equal(row.organization, null);
  assert.equal(row.category, 'instansi');

  await prisma.nexaSession.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' } })).status, 401);
  await request('/api/ai/stela/session', { method: 'POST', body: valid });
  assert.equal(await prisma.nexaSession.findUnique({ where: { id: row.id } }), null, 'baris kedaluwarsa dihapus');
});
