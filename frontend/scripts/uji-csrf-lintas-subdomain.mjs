// Frontend dan API di subdomain berbeda (mis. mainweb.* dan api-mainweb.*): cookie csrf_token
// milik host API tidak terlihat di document.cookie halaman. apiClient harus memakai token dari
// body /api/auth/csrf, memakainya ulang, dan mengambil token baru sekali bila backend menolak.
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
const calls = [];
let tokenServer = 'token-1';
let tolakSekali = false;

globalThis.document = { cookie: '' }; // cookie API tidak terbaca dari subdomain frontend
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, header: options.headers?.['x-csrf-token'] });
  if (url.endsWith('/api/auth/csrf')) return Response.json({ csrfToken: tokenServer });
  if (tolakSekali) {
    tolakSekali = false;
    return Response.json({ error: 'CSRF token tidak valid.', code: 'csrf_failed' }, { status: 400 });
  }
  return Response.json({ ok: true });
};

try {
  const { api } = await server.ssrLoadModule('/src/services/apiClient.js');

  assert.deepEqual(await api.post('/api/auth/login', { email: 'a@b.c' }), { ok: true });
  assert.equal(calls.at(-1).header, 'token-1', 'Token dari body /api/auth/csrf harus dikirim sebagai x-csrf-token.');

  calls.length = 0;
  await api.put('/api/admin/x', {});
  assert.equal(calls.filter((c) => c.url.endsWith('/api/auth/csrf')).length, 0, 'Token di memori dipakai ulang tanpa fetch baru.');
  assert.equal(calls.at(-1).header, 'token-1');

  calls.length = 0;
  tokenServer = 'token-2';
  tolakSekali = true;
  assert.deepEqual(await api.delete('/api/admin/x'), { ok: true });
  assert.equal(calls.filter((c) => c.url.endsWith('/api/auth/csrf')).length, 1, 'csrf_failed memicu satu kali refresh token.');
  assert.equal(calls.at(-1).header, 'token-2', 'Permintaan ulang memakai token baru.');

  globalThis.document = { cookie: 'csrf_token=cookie-sama-origin' };
  await api.patch('/api/admin/x', {});
  assert.equal(calls.at(-1).header, 'cookie-sama-origin', 'Bila cookie terbaca (satu origin), cookie tetap diutamakan.');

  console.log('PASS: CSRF lintas subdomain memakai token body, reuse memori, refresh sekali pada csrf_failed, cookie satu-origin tetap diutamakan.');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.document = originalDocument;
  await server.close();
}
