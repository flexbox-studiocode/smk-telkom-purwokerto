import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

let server;
let baseUrl;
const cookieJar = new Map();

async function request(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  const csrf = cookieJar.get('csrf_token');
  if (csrf && options.method && options.method !== 'GET') headers['x-csrf-token'] = csrf;
  const cookies = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookies) headers.cookie = cookies;
  const res = await fetch(baseUrl + path, { ...options, headers });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const [k, v] = pair.split('=');
    if (v === '' || /Max-Age=0/i.test(raw)) cookieJar.delete(k);
    else cookieJar.set(k, v);
  }
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

// /api/ai/stela mewajibkan sesi pra-chat; tes ini hanya memeriksa perilaku sesudah gerbang itu.
const mulaiSesiNexa = () => request('/api/ai/stela/session', { method: 'POST', body: JSON.stringify({ nama: 'Tes Security', telepon: '081234567890', usia: 17, kategori: 'sekolah' }) });

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(baseUrl + '/api/auth/csrf');
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const [k, v] = pair.split('=');
    if (v) cookieJar.set(k, v);
  }
  const csrf = cookieJar.get('csrf_token');
  assert.ok(csrf, 'CSRF token must be issued before authenticated-form tests');
});

after(async () => {
  await new Promise((r) => server.close(r));
  await closeDatabase();
});

test('public settings are readable without auth', async () => {
  const res = await request('/api/settings');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.schoolName);
});

test('settings mutation requires authentication', async () => {
  const res = await request('/api/settings', { method: 'PATCH', body: JSON.stringify({ schoolName: 'Hacked' }) });
  assert.equal(res.status, 401);
});

test('settings PATCH with stale revision is rejected before any write', async () => {
  const before = await request('/api/settings');
  const original = before.body.data.schoolName;
  const res = await request('/api/settings', { method: 'PATCH', body: JSON.stringify({ schoolName: 'Ubah', revision: Number(before.body.data.revision) }) });
  assert.equal(res.status, 401, 'guest must not be able to bump revision');
  const after = await request('/api/settings');
  assert.equal(after.body.data.schoolName, original);
  assert.equal(after.body.data.revision, before.body.data.revision);
});

test('private PPDB document endpoint is not public', async () => {
  const res = await request('/api/uploads/ppdb-documents/me');
  assert.equal(res.status, 401);
});

test('admin content upload is not reachable anonymously', async () => {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'x.png');
  const res = await fetch(baseUrl + '/api/uploads/content', { method: 'POST', body: form, headers: { 'x-csrf-token': cookieJar.get('csrf_token') || '' } });
  assert.ok([400, 401, 403].includes(res.status), `expected auth/CSRF rejection, got ${res.status}`);
});

test('STELA returns honest 503 when no provider key is configured', async () => {
  const saved = { aktif: process.env.STELA_AKTIF, key: process.env.STELA_API_KEY, gemini: process.env.GEMINI_API_KEY, nine: process.env.NINEROUTER_KEY };
  process.env.STELA_AKTIF = 'true';
  delete process.env.STELA_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.NINEROUTER_KEY;
  try {
    assert.equal((await mulaiSesiNexa()).status, 201);
    const res = await request('/api/ai/stela', { method: 'POST', body: JSON.stringify({ pertanyaan: 'Apa jurusan di sekolah ini?' }) });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'config');
  } finally {
    if (saved.aktif === undefined) delete process.env.STELA_AKTIF; else process.env.STELA_AKTIF = saved.aktif;
    if (saved.key === undefined) delete process.env.STELA_API_KEY; else process.env.STELA_API_KEY = saved.key;
    if (saved.gemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved.gemini;
    if (saved.nine === undefined) delete process.env.NINEROUTER_KEY; else process.env.NINEROUTER_KEY = saved.nine;
  }
});

test('STELA never leaks a fabricated fallback answer', async () => {
  const saved = process.env.STELA_AKTIF;
  process.env.STELA_AKTIF = 'true';
  try {
    assert.equal((await mulaiSesiNexa()).status, 201);
    const res = await request('/api/ai/stela', { method: 'POST', body: JSON.stringify({ pertanyaan: 'Siapa kepala sekolah?' }) });
    assert.equal(res.status, 503);
    assert.equal(res.body.reply, undefined);
  } finally {
    if (saved === undefined) delete process.env.STELA_AKTIF; else process.env.STELA_AKTIF = saved;
  }
});

test('site_settings revision is a safe JSON number, not BigInt', async () => {
  const res = await request('/api/settings');
  assert.equal(typeof res.body.data.revision, 'number');
  assert.doesNotThrow(() => JSON.stringify(res.body.data));
});
