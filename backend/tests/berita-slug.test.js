import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, generateCode, composeSlug, createSlug,
  CODE_MIN_LENGTH, CODE_MAX_LENGTH, MAX_SLUG_LENGTH,
} from '../src/utils/slug.js';

// randomInt palsu: mengembalikan nilai berurutan agar panjang kode deterministik.
function sequenceRandomInt(values) {
  let index = 0;
  return (min, max) => {
    assert.ok(max > min, `rentang randomInt tidak valid: ${min}..${max}`);
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error('nilai randomInt habis');
    assert.ok(value >= min && value < max, `nilai ${value} di luar rentang ${min}..${max}`);
    return value;
  };
}

test('slugify menormalkan judul umum', () => {
  assert.equal(slugify('SMK Telkom Purwokerto Raih Prestasi Nasional!'), 'smk-telkom-purwokerto-raih-prestasi-nasional');
});

test('slugify menurunkan huruf kapital', () => {
  assert.equal(slugify('BERITA SEKOLAH'), 'berita-sekolah');
});

test('slugify membuang tanda baca dan simbol', () => {
  assert.equal(slugify('Juara 1, "Lomba" #Nasional (2026)!'), 'juara-1-lomba-nasional-2026');
});

test('slugify merapatkan spasi berulang menjadi satu tanda hubung', () => {
  assert.equal(slugify('Kegiatan    Belajar    Siswa'), 'kegiatan-belajar-siswa');
});

test('slugify tanpa spasi di awal/akhir', () => {
  assert.equal(slugify('  Prestasi  '), 'prestasi');
});

test('slugify judul kosong memakai fallback berita', () => {
  assert.equal(slugify(''), 'berita');
  assert.equal(slugify('   ---  '), 'berita');
  assert.equal(slugify(null), 'berita');
  assert.equal(slugify(undefined), 'berita');
  assert.equal(slugify('!!!'), 'berita');
});

test('slugify menangani karakter non-ASCII dengan aman', () => {
  assert.equal(slugify('Café Crème à la Mode'), 'cafe-creme-a-la-mode');
  assert.equal(slugify('Siswa Berprestasi Súper'), 'siswa-berprestasi-super');
  // Karakter non-Latin dibuang tanpa membuat slug kosong.
  assert.equal(slugify('日本語'), 'berita');
  assert.equal(slugify('Событие'), 'berita');
});

for (const length of [3, 4, 5, 6, 7, 8]) {
  test(`generateCode menghasilkan ${length} digit`, () => {
    const digits = Array.from({ length }, (_, i) => (i === 0 ? 5 : 0));
    const randomInt = sequenceRandomInt([length, ...digits]);
    const code = generateCode(randomInt);
    assert.equal(code.length, length);
    assert.match(code, /^[1-9][0-9]*$/, 'kode harus angka tanpa leading zero');
  });
}

test('generateCode tidak memakai leading zero walau digit berikutnya nol', () => {
  // Panjang 3, digit pertama 9, sisanya 0 -> "900"
  const code = generateCode(sequenceRandomInt([3, 9, 0, 0]));
  assert.equal(code, '900');
});

test('generateCode rentang 3-8 terdistribusi sesuai sumber acak', () => {
  for (let length = CODE_MIN_LENGTH; length <= CODE_MAX_LENGTH; length += 1) {
    const flat = Array.from({ length }, (_, i) => (i === 0 ? 1 : 2));
    const code = generateCode(sequenceRandomInt([length, ...flat]));
    assert.equal(code.length, length);
  }
});

test('composeSlug menaruh kode di paling belakang', () => {
  assert.equal(composeSlug('Berita Sekolah', '731'), 'berita-sekolah-731');
});

test('createSlug menghasilkan format judul-kode', () => {
  const slug = createSlug('Prestasi Nasional SMK Telkom', { randomInt: sequenceRandomInt([5, 8, 3, 7, 2, 6]) });
  assert.match(slug, /^prestasi-nasional-smk-telkom-[1-9][0-9]{4}$/);
});

test('composeSlug memotong judul panjang agar total <= batas kolom', () => {
  const title = 'Kata '.repeat(120); // jauh melebihi 255 karakter setelah slugify
  const slug = composeSlug(title, '12345678');
  assert.ok(slug.length <= MAX_SLUG_LENGTH, `panjang slug ${slug.length} melebihi ${MAX_SLUG_LENGTH}`);
  assert.ok(slug.endsWith('-12345678'));
  assert.ok(!/-{2,}/.test(slug), 'tidak boleh ada tanda hubung ganda');
});
