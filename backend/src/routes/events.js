import express from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, notFound, parsePagination } from '../utils/http.js';

export const eventsRouter = express.Router();
// Harus sinkron dengan enum `EventCategory` di prisma/schema.prisma.
export const EVENT_CATEGORIES = [
  'kegiatan', 'akademik', 'lomba', 'karier', 'lainnya',
  'awal-pkl', 'penilaian-siswa', 'libur-akhir-semester', 'cuti-bersama',
  'libur-tahun-pelajaran', 'hari-pertama-sekolah', 'upacara-nasional',
  'hut-smk', 'libur-ramadhan', 'perkiraan-kelulusan',
];
const schema = z.object({
  judul: z.string().trim().min(1).max(180), ringkasan: z.string().max(500).default(''), deskripsi: z.string().max(20000).default(''),
  kategori: z.enum(EVENT_CATEGORIES).default('kegiatan'), tanggal_mulai: z.coerce.date(), waktu_mulai: z.string().max(8).nullable().optional(),
  tanggal_selesai: z.coerce.date().nullable().optional(), waktu_selesai: z.string().max(8).nullable().optional(), lokasi: z.string().max(240).default(''), penyelenggara: z.string().max(160).default(''),
  gambar_url: z.string().url().max(2048).nullable().optional(), link_informasi: z.string().url().max(2048).nullable().optional(), status: z.enum(['draft', 'published']).default('draft'),
});
const mapInput = (data) => ({ judul: data.judul, ringkasan: data.ringkasan, deskripsi: data.deskripsi, kategori: data.kategori, tanggalMulai: data.tanggal_mulai, waktuMulai: data.waktu_mulai, tanggalSelesai: data.tanggal_selesai, waktuSelesai: data.waktu_selesai, lokasi: data.lokasi, penyelenggara: data.penyelenggara, gambarUrl: data.gambar_url, linkInformasi: data.link_informasi, status: data.status });

eventsRouter.get('/', optionalAuth, asyncHandler(async (req, res) => { const { page, limit, skip } = parsePagination(req.query); const where = req.isAdmin ? {} : { status: 'published' }; const [data, total] = await prisma.$transaction([prisma.event.findMany({ where, orderBy: { tanggalMulai: 'asc' }, skip, take: limit }), prisma.event.count({ where })]); res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }); }));
eventsRouter.get('/:id', optionalAuth, asyncHandler(async (req, res) => { const data = await prisma.event.findFirst({ where: { id: req.params.id, ...(req.isAdmin ? {} : { status: 'published' }) } }); if (!data) throw notFound(); res.json({ data }); }));
eventsRouter.use(optionalAuth, requireAdmin);
eventsRouter.post('/', asyncHandler(async (req, res) => res.status(201).json({ data: await prisma.event.create({ data: mapInput(schema.parse(req.body)) }) })));
eventsRouter.patch('/:id', asyncHandler(async (req, res) => res.json({ data: await prisma.event.update({ where: { id: req.params.id }, data: mapInput(schema.partial().parse(req.body)) }) })));
eventsRouter.delete('/:id', asyncHandler(async (req, res) => { await prisma.event.delete({ where: { id: req.params.id } }); res.status(204).end(); }));
