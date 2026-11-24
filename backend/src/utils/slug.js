// Utilitas slug murni (tanpa database) untuk URL berita.
//
// Format yang dihasilkan: `judul-berita-<kode>` dengan kode angka acak 3–8
// digit di paling belakang. Modul ini sengaja bebas efek samping agar bisa
// diuji tanpa koneksi database; pengecekan keunikan ada di services/beritaSlug.js.
import crypto from 'node:crypto';

export const CODE_MIN_LENGTH = 3;
export const CODE_MAX_LENGTH = 8;
export const MAX_SLUG_LENGTH = 255;
export const FALLBACK_BASE = 'berita';

// Judul -> potongan URL bersih. Aman untuk karakter non-ASCII: diakritik
// diurai (NFKD) lalu tanda kombinasinya dibuang, sisanya menjadi tanda hubung.
export function slugify(title, fallback = FALLBACK_BASE) {
  const base = String(title ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

// Kode angka acak, panjang `minLength`–`maxLength` digit inklusif, tanpa
// leading zero. `randomInt` dapat disuntik untuk pengujian deterministik.
export function generateCode(randomInt = crypto.randomInt, {
  minLength = CODE_MIN_LENGTH,
  maxLength = CODE_MAX_LENGTH,
} = {}) {
  if (minLength < 1 || maxLength < minLength) throw new RangeError('Rentang panjang kode tidak valid.');
  const length = randomInt(minLength, maxLength + 1);
  let code = String(randomInt(1, 10)); // digit pertama 1–9, tidak boleh 0
  for (let i = 1; i < length; i += 1) code += String(randomInt(0, 10));
  return code;
}

// Menggabungkan slug judul dengan kode, memotong basis agar total <= MAX_SLUG_LENGTH.
export function composeSlug(title, code) {
  const suffix = `-${code}`;
  const budget = Math.max(MAX_SLUG_LENGTH - suffix.length, 1);
  const base = slugify(title).slice(0, budget).replace(/-+$/g, '') || FALLBACK_BASE;
  return `${base}${suffix}`;
}

// Slug lengkap sekali jalan (judul + kode baru).
export function createSlug(title, options = {}) {
  const { randomInt, minLength, maxLength } = options;
  return composeSlug(title, generateCode(randomInt, { minLength, maxLength }));
}
