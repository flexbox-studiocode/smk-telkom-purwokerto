import { OFFICIAL_ADMISSIONS_URL, isHiddenAdmissionsPath } from '../src/utils/admissions.js';
import assert from 'node:assert/strict';
import { canonicalAdmissionsPath, formatAdmissionsText } from '../src/utils/admissions.js';
import { createServer } from 'vite';
import { jawabanFaqCepat, kategoriPertanyaan, topikDiizinkan } from '../../supabase/functions/stela/inti.mjs';

for (const path of ['/spmb/masuk', '/spmb/formulir', '/SPMB/masuk', '/%73pmb/masuk', '/ppdb', '/ppdb/status', '/ketentuan-spmb', '/lupa-sandi', '/auth/confirm']) assert(isHiddenAdmissionsPath(path));
for (const path of ['/spmb', '/spmb/', '/SPMB', '/%73pmb', '/dashboard/spmb', '/dashboard/informasi-spmb', '/login', '/spmb-other', '/berita/spmb']) assert(!isHiddenAdmissionsPath(path), `${path}: public information must remain accessible`);

for (const step of ['masuk', 'daftar', 'verifikasi', 'atur-sandi', 'formulir', 'berkas', 'selesai', 'status', 'dokumen-peserta']) {
  assert.equal(canonicalAdmissionsPath(`/ppdb/${step}`), `/spmb/${step}`);
}
assert.equal(canonicalAdmissionsPath('/ppdb'), '/spmb');
assert.equal(canonicalAdmissionsPath('/ppdb/atur-sandi?mode=recovery#access_token=test'), '/spmb/atur-sandi?mode=recovery#access_token=test');
assert.equal(canonicalAdmissionsPath('/dashboard/ppdb'), '/dashboard/spmb');
assert.equal(canonicalAdmissionsPath('/ketentuan-ppdb'), '/ketentuan-spmb');
for (const unrelated of ['/ppdb-other', '/berita/ppdb-lama', '/spmb/masuk', '/services/ppdbService']) {
  assert.equal(canonicalAdmissionsPath(unrelated), unrelated);
}
assert.equal(formatAdmissionsText('Masuk PPDB'), 'Masuk SPMB');
assert.equal(formatAdmissionsText('PPDB_VALIDATION'), 'PPDB_VALIDATION');
for (const term of ['spmb', 'ppdb']) {
  assert.match(jawabanFaqCepat(`cara daftar ${term}`, 'id'), /\/spmb/);
  assert.match(jawabanFaqCepat(`how to apply ${term}`, 'en'), /\/spmb/);
  assert.equal(kategoriPertanyaan(`Kapan ${term} dibuka?`), 'ppdb');
  assert.equal(topikDiizinkan([{ content: `${term} rahasia` }]), false);
}

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  assert.equal(translate('Masuk PPDB', 'id'), 'Masuk SPMB');
  assert.equal(translate('Masuk PPDB', 'en'), 'SPMB Login');
  assert.equal(translate('Daftar PPDB Sekarang', 'en'), 'Register for SPMB');
  assert.equal(translate('Lihat Info SPMB', 'en'), 'View SPMB Information');
  assert.equal(translate('Kembali ke {label}', 'id', { label: 'PPDB' }), 'Kembali ke SPMB');
  assert.equal(translate('Kelola PPDB dari dashboard', 'id'), 'Kelola SPMB dari dashboard');
  const data = await server.ssrLoadModule('/src/data/dummyData.js');
  assert.equal(data.ctaMasukPpdb.href, OFFICIAL_ADMISSIONS_URL);
  assert.equal(data.navLinks.find(item => item.label === 'Informasi').children.find(item => item.label === 'Informasi SPMB').href, '/spmb');
  assert.equal(data.footerData.informasi.find(item => item.label === 'SPMB').href, '/spmb');
  assert.ok(data.ppdbLangkahPortal.every(({ to }) => to.startsWith('/spmb/')));
  console.log('SPMB: routes, legacy redirects, query/hash preservation, bilingual terminology, and portal links pass.');
} finally {
  await server.close();
}
