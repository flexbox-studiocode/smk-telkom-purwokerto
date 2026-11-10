// Aturan form pra-chat NEXA. Salinan klien dari backend/src/modules/stela/prechat.mjs;
// server tetap sumber kebenaran, ini hanya untuk umpan balik cepat.
export const USIA_MIN = 5;
export const USIA_MAKS = 100;
export const KATEGORI = ['sekolah', 'instansi'];

const POLA_NAMA = /^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u;
const POLA_TELEPON = /^(?:\+62|62|0)[1-9]\d{7,12}$/;

// Nomor tetap string: mengubahnya ke angka akan membuang nol di depan.
export const telepon = (raw) => String(raw ?? '').replace(/[\s\-().]/g, '');

export const usiaValid = (raw) => {
  const teks = String(raw ?? '').trim();
  return /^\d{1,3}$/.test(teks) && Number(teks) >= USIA_MIN && Number(teks) <= USIA_MAKS;
};

// Mengembalikan { field: 'teks galat berbahasa Indonesia' } (diterjemahkan oleh pemanggil).
export function validasiPrechat({ nama, telepon: hp, usia, kategori }) {
  const galat = {};
  const namaBersih = nama.trim();
  if (!namaBersih) galat.nama = 'Nama lengkap wajib diisi.';
  else if (namaBersih.length < 2) galat.nama = 'Nama minimal 2 karakter.';
  else if (!POLA_NAMA.test(namaBersih)) galat.nama = 'Nama hanya boleh berisi huruf, spasi, dan tanda baca nama (. , \' -).';

  if (!hp.trim()) galat.telepon = 'Nomor HP wajib diisi.';
  else if (!POLA_TELEPON.test(telepon(hp))) galat.telepon = 'Nomor HP tidak valid. Contoh: 081234567890 atau +6281234567890.';

  if (!String(usia).trim()) galat.usia = 'Usia wajib diisi.';
  else if (!usiaValid(usia)) galat.usia = 'Usia harus berupa bilangan bulat antara 5 dan 100.';
  // Kategori baru ditampilkan setelah usia valid, jadi baru ditagih saat itu.
  else if (!KATEGORI.includes(kategori)) galat.kategori = 'Pilih salah satu kategori.';
  return galat;
}
