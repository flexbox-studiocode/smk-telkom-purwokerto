import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
const originalFetch = globalThis.fetch;
const requests = [];
const row = { id: 'wave', jenis: 'jadwal', judul: 'DIGITEST', status: 'published', tanggalMulai: '2030-01-01T00:00:00.000Z', tanggalSelesai: '2030-12-31T00:00:00.000Z', urutan: 1, sumberUrl: '/spmb' };
globalThis.fetch = async (url, options) => {
  requests.push({ url, options });
  if (url.endsWith('/api/settings')) return new Response(JSON.stringify({ data: { schoolName: 'SMK Telkom Purwokerto', academicYear: '2027/2028', spmbOpen: true, newsPageSize: 5, logoUrl: null, revision: 3 } }));
  return new Response(JSON.stringify({ data: options.method === 'PATCH' ? row : [row, { ...row, id: 'draft', status: 'draft' }] }), { headers: { 'content-type': 'application/json' } });
};
// apiClient reads the CSRF cookie for admin updates; no external server is used here.
globalThis.document = { cookie: 'csrf_token=adapter-test' };
try {
  const service = await server.ssrLoadModule('/src/services/spmbInformationService.js');
  const { getSiteSettings } = await server.ssrLoadModule('/src/services/siteSettingsService.js');
  const settings = await getSiteSettings();
  assert.equal(settings.academic_year, '2027/2028');
  assert.equal(settings.spmb_open, true);
  assert.equal(settings.school_name, 'SMK Telkom Purwokerto');
  assert.equal(settings.news_page_size, 5);
  const { toSpmbWave, registrationForSpmb } = await server.ssrLoadModule('/src/utils/spmbInformation.js');
  const controller = new AbortController();
  const rows = await service.getSpmbInformation(true, controller.signal);
  assert.equal(rows.length, 1, 'Public reads must exclude drafts even with an admin session.');
  assert.equal(rows[0].tanggal_mulai, '2030-01-01');
  assert.equal(rows[0].tanggal_selesai, '2030-12-31');
  assert.equal(requests.at(-1).options.signal, controller.signal);
  assert(Number.isFinite(Date.parse(toSpmbWave(rows[0]).opensAt)));
  assert.equal(registrationForSpmb(rows, null, Date.parse('2030-02-01')).wave, 'DIGITEST');
  assert.equal((await service.getSpmbInformation(false)).length, 2, 'Admin reads retain drafts.');
  await service.updateSpmbInformation('wave', rows[0]);
  const payload = JSON.parse(requests.at(-1).options.body);
  assert.equal(payload.tanggalMulai, '2030-01-01');
  assert.equal(payload.tanggal_selesai, '2030-12-31');
  controller.abort();
  await assert.rejects(service.getSpmbInformation(true, controller.signal), { name: 'AbortError' });
  console.log('PASS: MySQL ISO dates, public Published filtering, admin draft access, editable payloads and abort signals.');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.document;
  await server.close();
}
