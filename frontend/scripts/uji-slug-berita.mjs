// Regresi slug berita: util slugify frontend dan urutan route /berita.
// - slugify harus aman untuk karakter non-ASCII dan tidak menghasilkan spasi.
// - Route statis (/berita/trending, /berita/agenda) tidak boleh tertangkap
//   parameter :slug.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { slugify } from '../src/utils/slug.js';

assert.equal(slugify('SMK Telkom Purwokerto Raih Prestasi Nasional!'), 'smk-telkom-purwokerto-raih-prestasi-nasional');
assert.equal(slugify('  Kegiatan    Belajar  '), 'kegiatan-belajar');
assert.equal(slugify('Café Crème'), 'cafe-creme');
assert.equal(slugify('日本語'), '');
assert.equal(slugify(''), '');
assert.ok(!/\s/.test(slugify('Judul  Dengan  Spasi')));

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const staticTrending = app.indexOf('path="/berita/trending"');
const staticAgenda = app.indexOf('path="/berita/agenda"');
const detail = app.indexOf('path="/berita/:slug"');
assert.ok(staticTrending > 0 && staticAgenda > 0 && detail > 0, 'ketiga route berita harus ada');
assert.ok(detail > staticTrending, 'route /berita/trending harus dideklarasikan sebelum /berita/:slug');
assert.ok(detail > staticAgenda, 'route /berita/agenda harus dideklarasikan sebelum /berita/:slug');
assert.ok(app.includes('path="/berita/agenda/:slug"'), 'detail agenda tetap tersedia');

console.log('uji-slug-berita: slugify dan urutan route /berita sesuai aturan.');
