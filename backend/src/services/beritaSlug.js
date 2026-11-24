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

// P2002 bisa berasal dari kolom unik lain; hanya konflik `slug` yang di-retry.
function isSlugConflict(error) {
  if (error?.code !== 'P2002') return false;
  const target = error?.meta?.target;
  const text = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return !text || /slug/i.test(text);
}

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

// Membuat berita dengan slug hasil generator. Dipakai transaksi import
// WordPress maupun pembuatan manual. Bila `retry` false (klien transaksi),
// konflik slug dilempar ke pemanggil agar transaksi bisa diulang utuh.
export async function createBeritaWithSlug(data, {
  db = prisma,
  maxAttempts = CREATE_ATTEMPTS,
  retry = true,
  randomInt,
  minLength,
  maxLength,
} = {}) {
  const { slug: _ignoredSlug, regenerateSlug: _ignoredRegenerate, ...payload } = data;
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
    const slug = await generateBeritaSlug(payload.judul, { db, randomInt, minLength, maxLength });
    try {
      // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
      return await db.berita.create({ data: { ...payload, slug } });
    } catch (error) {
      if (!isSlugConflict(error)) throw error;
      lastError = error;
      if (!retry) throw error;
    }
  }
  throw conflict('Slug unik bentrok berulang saat menyimpan berita. Coba lagi.', 'slug_generation_failed', { cause: lastError?.message });
}

export { isSlugConflict };

// Mencatat URL lama berita agar permintaan ke slug lama tidak menjadi 404.
// Idempoten: slug alias yang sama hanya dipetakan sekali.
export async function recordBeritaSlugAlias(beritaId, oldSlug, { db = prisma } = {}) {
  const slug = String(oldSlug ?? '').trim();
  if (!beritaId || !slug) return null;
  const existing = await db.beritaSlugAlias.findUnique({ where: { slug } });
  if (existing) {
    if (existing.beritaId !== beritaId) {
      await db.beritaSlugAlias.update({ where: { slug }, data: { beritaId } });
    }
    return existing;
  }
  return db.beritaSlugAlias.create({ data: { beritaId, slug } });
}
