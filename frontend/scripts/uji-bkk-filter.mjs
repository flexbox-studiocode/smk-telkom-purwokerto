// Pemeriksaan filter lowongan BKK.
//
// Ditulis karena panel filternya sempat punya empat cacat sekaligus dan tidak
// bisa dibuktikan lewat browser: database dev kosong, jadi tidak ada lowongan
// yang bisa disaring di layar.
//
// Jalankan: node scripts/uji-bkk-filter.mjs

import assert from 'node:assert/strict';
import { opsiFilter, saringLowongan } from '../src/utils/bkkFilter.js';

// Meniru bentuk keluaran toBkkItem() dari baris tabel `bkk` yang sebenarnya --
// termasuk dua ejaan tipe pekerjaan yang berbeda, persis seperti isi database
// sekarang ("Full-time" dan "Full Time").
const LOWONGAN = [
  { role: 'Manager', company: 'Shoope', lokasi: 'Purwokerto', tipe_pekerjaan: 'Full-time', tags: ['Full-time', 'Purwokerto'] },
  { role: 'tes', company: 'tes', lokasi: null, tipe_pekerjaan: 'Full Time', tags: ['Full Time'] },
  { role: 'Backend Engineer', company: 'Telkom', lokasi: 'Jakarta', tipe_pekerjaan: 'Magang', tags: ['Magang', 'Jakarta'] },
  { role: 'QA Analyst', company: 'Agate', lokasi: 'Jakarta Selatan', tipe_pekerjaan: 'Full-time', tags: ['Full-time', 'Jakarta Selatan'] },
];

const peran = (hasil) => hasil.map((j) => j.role).sort();
let lulus = 0;
const cek = (nama, fn) => { fn(); lulus += 1; console.log(`  ok  ${nama}`); };

console.log('\nopsiFilter');

cek('hanya menawarkan lokasi yang benar-benar ada', () => {
  const { lokasiOptions } = opsiFilter(LOWONGAN);
  assert.deepEqual(lokasiOptions, ['Jakarta', 'Jakarta Selatan', 'Purwokerto']);
  // Yogyakarta dan Remote dulu tampil dari daftar tetap meski tanpa lowongan.
  assert.ok(!lokasiOptions.includes('Yogyakarta'));
});

cek('lowongan tanpa lokasi tidak jadi pilihan kosong', () => {
  const { lokasiOptions } = opsiFilter(LOWONGAN);
  assert.ok(!lokasiOptions.includes(null));
  assert.ok(!lokasiOptions.includes('Lokasi belum tersedia'));
});

cek('tipe pekerjaan diambil dari kolomnya sendiri', () => {
  const { tipeOptions } = opsiFilter(LOWONGAN);
  assert.deepEqual(tipeOptions, ['Full Time', 'Full-time', 'Magang']);
});

cek('daftar kosong tidak melempar galat', () => {
  assert.deepEqual(opsiFilter([]), { lokasiOptions: [], tipeOptions: [] });
  assert.deepEqual(opsiFilter(), { lokasiOptions: [], tipeOptions: [] });
});

console.log('\nsaringLowongan');

cek('tanpa filter mengembalikan semuanya', () => {
  assert.equal(saringLowongan(LOWONGAN).length, 4);
  assert.equal(saringLowongan(LOWONGAN, {}).length, 4);
});

cek('filter lokasi cocok persis, bukan substring', () => {
  // Inti perbaikannya: dulu memakai includes(), sehingga memilih "Jakarta"
  // ikut menarik "Jakarta Selatan".
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { lokasi: 'Jakarta' })), ['Backend Engineer']);
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { lokasi: 'Jakarta Selatan' })), ['QA Analyst']);
});

cek('filter tipe menyaring pada kolom tipe_pekerjaan', () => {
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { tipe: 'Full-time' })), ['Manager', 'QA Analyst']);
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { tipe: 'Magang' })), ['Backend Engineer']);
});

cek('dua ejaan tidak saling tertukar', () => {
  // "Full-time" dan "Full Time" adalah dua nilai berbeda di database; filter
  // tidak boleh menganggapnya sama.
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { tipe: 'Full Time' })), ['tes']);
});

cek('lokasi dan tipe berlaku bersamaan', () => {
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { lokasi: 'Purwokerto', tipe: 'Full-time' })), ['Manager']);
  assert.deepEqual(saringLowongan(LOWONGAN, { lokasi: 'Purwokerto', tipe: 'Magang' }), []);
});

cek('kata kunci mencari posisi, perusahaan, dan tag', () => {
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { keyword: 'manager' })), ['Manager']);
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { keyword: 'telkom' })), ['Backend Engineer']);
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { keyword: 'magang' })), ['Backend Engineer']);
});

cek('kata kunci mengabaikan besar-kecil huruf dan spasi tepi', () => {
  assert.deepEqual(peran(saringLowongan(LOWONGAN, { keyword: '  SHOOPE ' })), ['Manager']);
});

cek('lowongan tanpa lokasi tetap muncul selama lokasi tidak difilter', () => {
  assert.ok(peran(saringLowongan(LOWONGAN, { tipe: 'Full Time' })).includes('tes'));
});

cek('kategori menyaring bidang tanpa mengganti lokasi dan tipe', () => {
  const jobs = [
    { role: 'Backend Engineer', lokasi: 'Jakarta', tipe_pekerjaan: 'Magang' },
    { role: 'Network Engineer', lokasi: 'Jakarta', tipe_pekerjaan: 'Magang' },
    { role: 'QA Analyst', lokasi: 'Jakarta', tipe_pekerjaan: 'Full Time', kategori: 'UI/UX' },
  ];
  assert.deepEqual(peran(saringLowongan(jobs, { kategori: 'Programming', lokasi: 'Jakarta', tipe: 'Magang' })), ['Backend Engineer']);
  assert.deepEqual(peran(saringLowongan(jobs, { kategori: 'Networking' })), ['Network Engineer']);
  assert.deepEqual(peran(saringLowongan(jobs, { kategori: 'UI/UX' })), ['QA Analyst']);
  assert.deepEqual(saringLowongan(jobs, { kategori: 'LKS' }), []);
});

cek('kategori eksplisit/tag dipakai tanpa menebak jangkauan perusahaan', () => {
  const jobs = [{ role: 'Engineer', company: 'PT Nasional Indonesia', tags: ['Internasional', 'AI'] }, {}];
  assert.equal(saringLowongan(jobs, { kategori: 'Internasional' }).length, 1);
  assert.equal(saringLowongan(jobs, { kategori: 'AI' }).length, 1);
  assert.equal(saringLowongan(jobs, { kategori: 'Nasional' }).length, 0);
  assert.equal(saringLowongan(jobs, { kategori: 'Programming' }).length, 0);
});

cek('pencarian profil alumni mencakup nama, angkatan dan peran', () => {
  const alumni = [{ name: 'Alfa Putra Kurnia', meta: 'Alumni TKJ', role: 'Co-founder & CEO Arkademy.com' }];
  assert.equal(saringLowongan(alumni, { keyword: '  ALFA ' }).length, 1);
  assert.equal(saringLowongan(alumni, { keyword: 'TKJ' }).length, 1);
  assert.equal(saringLowongan(alumni, { keyword: 'CEO', kategori: 'Networking' }).length, 1);
  assert.deepEqual(saringLowongan(alumni, { keyword: 'unknown' }), []);
});

cek('kata AI tidak cocok dengan potongan kata lain', () => {
  assert.equal(saringLowongan([{ role: 'Chairman' }], { kategori: 'AI' }).length, 0);
  assert.equal(saringLowongan([{ role: 'AI Research Intern' }], { kategori: 'AI' }).length, 1);
});

cek('kategori dalam deskripsi disaring tanpa menebak nama perusahaan', () => {
  const jobs = [{ deskripsi: 'Lowongan perusahaan internasional untuk alumni LKS.' }, { deskripsi: 'Perusahaan nasional.' }];
  assert.equal(saringLowongan(jobs, { kategori: 'Internasional' }).length, 1);
  assert.equal(saringLowongan(jobs, { kategori: 'Nasional' }).length, 1);
  assert.equal(saringLowongan(jobs, { kategori: 'LKS' }).length, 1);
});

console.log(`\n${lulus} pemeriksaan lulus.\n`);
