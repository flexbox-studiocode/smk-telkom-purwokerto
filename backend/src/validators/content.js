import { z } from 'zod';

// Hanya tautan web. Menolak skema seperti ftp:/data: dan kredensial di URL.
const url = z.string().max(2048).refine((value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, 'Gunakan tautan HTTP/HTTPS yang valid.').nullable().optional();
const status = z.enum(['draft', 'published']).default('draft');

// Slug berita tidak berasal dari klien: backend membuat slug judul + kode unik
// 3-8 digit. `regenerateSlug` (khusus PATCH berita) meminta slug baru eksplisit.
const beritaFields = {
  judul: z.string().trim().min(1).max(255),
  ringkasan: z.string().max(10000).nullable().optional(), konten: z.string().min(1),
  gambar_url: url, penulis: z.string().max(180).nullable().optional(), status,
};
export const beritaSchema = z.object({ ...beritaFields, regenerateSlug: z.boolean().optional() });
export const pengumumanSchema = z.object({ ...beritaFields, slug: z.string().trim().min(1).max(255), tanggal: z.coerce.date().nullable().optional() });
export const prestasiSchema = z.object({
  judul: z.string().trim().min(1).max(255), slug: z.string().trim().min(1).max(255),
  kategori: z.string().max(120).nullable().optional(), deskripsi: z.string().min(1),
  gambar_url: url, instagram_url: url, tingkat: z.string().max(120).nullable().optional(), tanggal: z.coerce.date().nullable().optional(), status,
});
export const bkkSchema = z.object({
  perusahaan: z.string().trim().min(1).max(255), posisi: z.string().trim().min(1).max(255), deskripsi: z.string().max(10000).nullable().optional(),
  lokasi: z.string().max(255).nullable().optional(), tipe_pekerjaan: z.string().max(100).nullable().optional(), deadline: z.coerce.date().nullable().optional(),
  status: z.enum(['aktif', 'ditutup']), link_pendaftaran: url, logo_url: url,
});
export const idSchema = z.object({ id: z.string().uuid() });
