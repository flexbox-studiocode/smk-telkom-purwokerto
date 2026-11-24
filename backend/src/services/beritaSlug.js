// Generator slug unik untuk konten berita.
//
// Database adalah sumber kebenaran keunikan slug: kandidat diperiksa ke tabel
// `berita`, dan bentrok unique constraint dari request bersamaan ditangani
// dengan retry (kode Prisma P2002), bukan hanya mengandalkan pengecekan awal.
import { prisma } from '../db.js';
import { conflict } from '../utils/http.js';
import { createSlug } from '../utils/slug.js';

const LOOKUP_ATTEMPTS = 12;
const CREATE_ATTEMPTS = 5;

async function slugExists(db, slug) {
  const row = await db.berita.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(row);
}

// Membuat slug unik dari judul. Melempar error yang dapat ditangani bila semua
// percobaan gagal (praktis tidak terjadi dengan ruang 3–8 digit).
export async function generateBeritaSlug(title, {
  db = prisma,
  randomInt,
  minLength,
  maxLength,
  maxAttempts = LOOKUP_ATTEMPTS,
} = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createSlug(title, { randomInt, minLength, maxLength });
    // eslint-disable-next-line no-await-in-loop -- pemeriksaan unik harus berurutan
    if (!(await slugExists(db, candidate))) return candidate;
  }
  throw conflict('Slug unik gagal dibuat setelah beberapa percobaan. Coba lagi.', 'slug_generation_failed');
}

// Membuat berita dengan slug hasil generator. Retry menangkap P2002 dari request
// paralel yang menyisipkan slug sama di antara pengecekan dan insert.
export async function createBeritaWithSlug(data, { db = prisma, maxAttempts = CREATE_ATTEMPTS } = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
    const slug = await generateBeritaSlug(data.judul, { db });
    try {
      // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
      return await db.berita.create({ data: { ...data, slug } });
    } catch (error) {
      if (error?.code === 'P2002') { lastError = error; continue; }
      throw error;
    }
  }
  throw conflict('Slug unik bentrok berulang saat menyimpan berita. Coba lagi.', 'slug_generation_failed', { cause: lastError?.message });
}
