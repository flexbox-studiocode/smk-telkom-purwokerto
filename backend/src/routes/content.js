import express from 'express';
import { prisma } from '../db.js';
import { requireAdmin, requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, notFound, parsePagination } from '../utils/http.js';
import { beritaSchema, pengumumanSchema, prestasiSchema, bkkSchema } from '../validators/content.js';

const definitions = {
  berita: { model: 'berita', schema: beritaSchema, publicWhere: { status: 'published' }, orderBy: { createdAt: 'desc' }, mapInput: mapContentInput },
  pengumuman: { model: 'pengumuman', schema: pengumumanSchema, publicWhere: { status: 'published' }, orderBy: { createdAt: 'desc' }, mapInput: mapContentInput },
  prestasi: { model: 'prestasi', schema: prestasiSchema, publicWhere: {}, orderBy: { tanggal: 'desc' }, mapInput: mapContentInput },
  bkk: { model: 'bkk', schema: bkkSchema, publicWhere: { status: 'aktif' }, orderBy: { createdAt: 'desc' }, mapInput: mapContentInput, publicSlug: false },
};

function mapContentInput(input) {
  const aliases = {
    gambar_url: 'gambarUrl',
    instagram_url: 'instagramUrl',
    tipe_pekerjaan: 'tipePekerjaan',
    link_pendaftaran: 'linkPendaftaran',
    logo_url: 'logoUrl',
  };
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [aliases[key] || key, value]));
}

export function createContentRouter(type) {
  const def = definitions[type];
  const router = express.Router();
  router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const where = req.isAdmin ? {} : def.publicWhere;
    const [data, total] = await prisma.$transaction([
      prisma[def.model].findMany({ where, orderBy: def.orderBy, skip, take: limit }),
      prisma[def.model].count({ where }),
    ]);
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));
  router.get('/:idOrSlug', optionalAuth, asyncHandler(async (req, res) => {
    const identifier = req.params.idOrSlug;
    // Tidak semua model punya slug (mis. bkk); filter slug hanya jika ada.
    const where = req.isAdmin
      ? { OR: def.publicSlug ? [{ id: identifier }, { slug: identifier }] : [{ id: identifier }] }
      : { OR: def.publicSlug ? [{ id: identifier }, { slug: identifier }] : [{ id: identifier }], ...def.publicWhere };
    const data = await prisma[def.model].findFirst({ where });
    if (!data) throw notFound();
    res.json({ data });
  }));
  router.use(requireAuth, requireAdmin);
  router.post('/', asyncHandler(async (req, res) => {
    const input = def.mapInput(def.schema.parse(req.body));
    res.status(201).json({ data: await prisma[def.model].create({ data: input }) });
  }));
  router.patch('/:id', asyncHandler(async (req, res) => {
    const input = def.mapInput(def.schema.partial().parse(req.body));
    res.json({ data: await prisma[def.model].update({ where: { id: req.params.id }, data: input }) });
  }));
  router.delete('/:id', asyncHandler(async (req, res) => { await prisma[def.model].delete({ where: { id: req.params.id } }); res.status(204).end(); }));
  return router;
}
