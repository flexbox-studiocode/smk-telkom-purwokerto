import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Mock hanya batas jaringan (apiClient); logika service dan util tetap asli.
const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true },
  plugins: [{
    name: 'public-services-test-client', enforce: 'pre',
    resolveId(source) { if (source === './apiClient' || source === '../services/apiClient') return '\0public-services-api-client'; },
    load(id) {
      if (id === '\0public-services-api-client') return 'export const api = globalThis.__publicServicesApi;';
    },
  }],
});

const calls = [];
let pages = {};
globalThis.__publicServicesApi = {
  get: async (path) => {
    calls.push({ kind: 'get', path });
    const key = Object.keys(pages).find((prefix) => path.startsWith(prefix));
    assert.ok(key, `GET tak terduga: ${path}`);
    return pages[key]();
  },
  upload: async (path, file) => {
    calls.push({ kind: 'upload', path, file });
    return { url: 'https://cdn.example/uploads/content-images/poster.webp' };
  },
  post: async (path, body) => {
    calls.push({ kind: 'post', path, body });
    if (path === '/api/turnstile/verify') return { success: true };
    return { data: { id: 'baru', ...body } };
  },
  patch: async (path, body) => { calls.push({ kind: 'patch', path, body }); return { data: { id: 'baru', ...body } }; },
  delete: async (path) => { calls.push({ kind: 'delete', path }); return null; },
};

try {
  const { getEvents, createEvent, updateEvent } = await server.ssrLoadModule('/src/services/eventService.js');
  pages = {
    '/api/events': () => ({ data: [
      { id: 'a', judul: 'Draft', status: 'draft', tanggalMulai: '2026-11-08T00:00:00.000Z', kategori: 'akademik' },
      { id: 'b', judul: 'Published', status: 'published', tanggalMulai: '2026-11-09T00:00:00.000Z', kategori: 'akademik' },
    ], pagination: { pages: 1 } }),
  };
  const publicEvents = await getEvents(true);
  assert.deepEqual(publicEvents.map((row) => row.id), ['b'], 'halaman publik harus membuang Draft');
  const adminEvents = await getEvents(false);
  assert.equal(adminEvents.length, 2, 'halaman admin tetap menerima semua status');

  const file = new File([new Uint8Array([137, 80, 78, 71])], 'poster.png', { type: 'image/png' });
  await createEvent({ judul: 'Kegiatan', kategori: 'akademik', tanggal_mulai: '2026-11-08', status: 'published', image_file: file });
  const createUpload = calls.find((call) => call.kind === 'upload');
  assert.equal(createUpload.path, '/api/uploads/content');
  assert.equal(createUpload.file, file);
  const createPost = calls.findLast((call) => call.kind === 'post');
  assert.equal(createPost.body.gambar_url, 'https://cdn.example/uploads/content-images/poster.webp');
  assert.equal('image_file' in createPost.body, false);

  await updateEvent('b', { judul: 'Ubah', kategori: 'akademik', tanggal_mulai: '2026-11-09', status: 'published', image_file: file });
  const patchCall = calls.findLast((call) => call.kind === 'patch');
  assert.equal(patchCall.body.gambar_url, 'https://cdn.example/uploads/content-images/poster.webp');
  assert.equal('image_file' in patchCall.body, false);

  // Tanpa berkas baru, URL lama dipertahankan dan tidak ada unggahan tambahan.
  const uploadsBefore = calls.filter((call) => call.kind === 'upload').length;
  await updateEvent('b', { judul: 'Ubah', kategori: 'akademik', tanggal_mulai: '2026-11-09', status: 'published', gambar_url: 'https://old.example/poster.png', image_file: null });
  assert.equal(calls.filter((call) => call.kind === 'upload').length, uploadsBefore);
  assert.equal(calls.findLast((call) => call.kind === 'patch').body.gambar_url, 'https://old.example/poster.png');

  pages = {
    '/api/berita': () => ({ data: [
      { id: '1', judul: 'Draft berita', status: 'draft' },
      { id: '2', judul: 'Published berita', status: 'published' },
    ] }),
    '/api/pengumuman': () => ({ data: [
      { id: '3', status: 'draft' }, { id: '4', status: 'published' },
    ] }),
    '/api/bkk': () => ({ data: [
      { id: '5', status: 'ditutup' }, { id: '6', status: 'aktif' },
    ] }),
    '/api/spmb': () => ({ data: [
      { id: '7', jenis: 'jadwal', status: 'draft' }, { id: '8', jenis: 'jadwal', status: 'published' },
    ] }),
  };
  const { getPublishedBerita } = await server.ssrLoadModule('/src/services/beritaService.js');
  const { getPublishedPengumuman } = await server.ssrLoadModule('/src/services/pengumumanService.js');
  const { getActiveBkk } = await server.ssrLoadModule('/src/services/bkkService.js');
  const { getSpmbInformation } = await server.ssrLoadModule('/src/services/spmbInformationService.js');
  assert.deepEqual((await getPublishedBerita()).map((row) => row.id), ['2']);
  assert.deepEqual((await getPublishedPengumuman()).map((row) => row.id), ['4']);
  assert.deepEqual((await getActiveBkk()).map((row) => row.id), ['6']);
  assert.deepEqual((await getSpmbInformation(true)).map((row) => row.id), ['8']);

  // Normalisasi tanggal: API mengirim ISO DateTime, kalender memakai YYYY-MM-DD.
  const { toCalendarEvent, eventsOnDate, validateEvent } = await server.ssrLoadModule('/src/utils/events.js');
  const calendarEvent = toCalendarEvent({ id: 'x', judul: 'Uji', status: 'published', tanggal_mulai: '2026-11-08T00:00:00.000Z', tanggal_selesai: null });
  assert.equal(calendarEvent.date, '2026-11-08');
  assert.equal(calendarEvent.endDate, '2026-11-08');
  assert.equal(eventsOnDate([calendarEvent], '2026-11-08').length, 1, 'event harus cocok pada sel tanggalnya');
  assert.equal(eventsOnDate([calendarEvent], '2026-11-09').length, 0);

  const base = { judul: 'Uji', kategori: 'akademik', tanggal_mulai: '2026-11-08', status: 'draft' };
  assert.equal(validateEvent({ ...base, gambar_url: 'http://localhost:3000/uploads/content-images/x.webp' }).gambar_url, undefined, 'media loopback lokal harus diterima');
  assert.ok(validateEvent({ ...base, gambar_url: 'http://example.com/x.png' }).gambar_url, 'HTTP non-loopback harus ditolak');

  // Verifikasi Turnstile harus lewat apiClient agar CSRF ikut; bukan fetch mentah.
  const { verifyTurnstileToken } = await server.ssrLoadModule('/src/components/TurnstileWidget.jsx');
  await verifyTurnstileToken('token-uji');
  const turnstile = calls.findLast((call) => call.kind === 'post');
  assert.equal(turnstile.path, '/api/turnstile/verify');
  assert.deepEqual(turnstile.body, { token: 'token-uji' });

  // apiClient asli: 304 tanpa body harus diulang sekali dengan cache reload.
  const realFetch = globalThis.fetch;
  const attempts = [];
  const reply = (status, body = '') => ({ status, ok: status >= 200 && status < 300, async text() { return body; } });
  globalThis.fetch = async (url, options) => {
    attempts.push(options?.cache);
    if (attempts.length === 1) return reply(304);
    return reply(200, JSON.stringify({ data: { ok: true } }));
  };
  try {
    const { apiRequest } = await server.ssrLoadModule('/src/services/apiClient.js');
    assert.deepEqual(await apiRequest('/api/contoh'), { data: { ok: true } });
    assert.deepEqual(attempts, ['no-store', 'reload'], '304 harus memaksa muat ulang');
    globalThis.fetch = async () => reply(304);
    assert.equal(await apiRequest('/api/kosong'), null, '304 kedua kalinya dikembalikan sebagai null');
  } finally {
    globalThis.fetch = realFetch;
  }

  console.log('PASS filter publik, unggah gambar event, normalisasi tanggal kalender, validasi URL loopback, Turnstile via apiClient, dan penanganan 304.');
} finally {
  delete globalThis.__publicServicesApi;
  await server.close();
}