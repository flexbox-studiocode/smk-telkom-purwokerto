import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound, parsePagination } from '../utils/http.js';

export const eventsRouter = express.Router();
// Harus sinkron dengan enum `EventCategory` di prisma/schema.prisma.
export const EVENT_CATEGORIES = [
  'kegiatan', 'akademik', 'lomba', 'karier', 'lainnya',
  'awal-pkl', 'penilaian-siswa', 'libur-akhir-semester', 'cuti-bersama',
  'libur-tahun-pelajaran', 'hari-pertama-sekolah', 'upacara-nasional',
  'hut-smk', 'libur-ramadhan', 'perkiraan-kelulusan',
];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Waktu harus berformat HH:mm.');
const externalUrl = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Gunakan tautan HTTP/HTTPS yang valid.');
const schema = z.object({
  judul: z.string().trim().min(1).max(180), ringkasan: z.string().max(500).default(''), deskripsi: z.string().max(20000).default(''),
  kategori: z.enum(EVENT_CATEGORIES).default('kegiatan'), tanggal_mulai: z.coerce.date(), waktu_mulai: time.nullable().optional(),
  tanggal_selesai: z.coerce.date().nullable().optional(), waktu_selesai: time.nullable().optional(), lokasi: z.string().max(240).default(''), penyelenggara: z.string().max(160).default(''),
  gambar_url: externalUrl.nullable().optional(), link_informasi: externalUrl.nullable().optional(), status: z.enum(['draft', 'published']).default('draft'),
});
const mapInput = (data) => ({ judul: data.judul, ringkasan: data.ringkasan, deskripsi: data.deskripsi, kategori: data.kategori, tanggalMulai: data.tanggal_mulai, waktuMulai: data.waktu_mulai, tanggalSelesai: data.tanggal_selesai, waktuSelesai: data.waktu_selesai, lokasi: data.lokasi, penyelenggara: data.penyelenggara, gambarUrl: data.gambar_url, linkInformasi: data.link_informasi, status: data.status });

const dayKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
// Tanggal/waktu harus konsisten. Dijalankan pada payload gabungan agar PATCH
// parsial tetap tervalidasi terhadap nilai yang sudah tersimpan.
function assertEventRange(data) {
  const start = data.tanggal_mulai ? dayKey(data.tanggal_mulai) : '';
  const end = data.tanggal_selesai ? dayKey(data.tanggal_selesai) : '';
  if (start && end && end < start) throw badRequest('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', { code: 'invalid_date_range', path: 'tanggal_selesai' });
  if (start && start === end && data.waktu_mulai && data.waktu_selesai && data.waktu_selesai <= data.waktu_mulai) {
    throw badRequest('Waktu selesai harus setelah waktu mulai pada hari yang sama.', { code: 'invalid_time_range', path: 'waktu_selesai' });
  }
}

eventsRouter.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  // Hanya admin yang boleh melihat draft. Respons bergantung sesi, sehingga
  // app.js menetapkan Cache-Control private/no-store untuk seluruh /api.
  const where = req.isAdmin ? {} : { status: 'published' };
  const [data, total] = await prisma.$transaction([
    prisma.event.findMany({ where, orderBy: { tanggalMulai: 'asc' }, skip, take: limit }),
    prisma.event.count({ where }),
  ]);
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
eventsRouter.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.event.findFirst({ where: { id: req.params.id, ...(req.isAdmin ? {} : { status: 'published' }) } });
  if (!data) throw notFound();
  res.json({ data });
}));
eventsRouter.use(requireAuth, requireAdmin);
eventsRouter.post('/', asyncHandler(async (req, res) => {
  const input = schema.parse(req.body);
  assertEventRange(input);
  res.status(201).json({ data: await prisma.event.create({ data: mapInput(input) }) });
}));
eventsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const input = schema.partial().parse(req.body);
  const current = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!current) throw notFound();
  assertEventRange({
    tanggal_mulai: input.tanggal_mulai ?? current.tanggalMulai,
    tanggal_selesai: input.tanggal_selesai === undefined ? current.tanggalSelesai : input.tanggal_selesai,
    waktu_mulai: input.waktu_mulai === undefined ? current.waktuMulai : input.waktu_mulai,
    waktu_selesai: input.waktu_selesai === undefined ? current.waktuSelesai : input.waktu_selesai,
  });
  res.json({ data: await prisma.event.update({ where: { id: req.params.id }, data: mapInput(input) }) });
}));
eventsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await prisma.event.deleteMany({ where: { id: req.params.id } });
  if (!deleted.count) throw notFound();
  res.status(204).end();
}));