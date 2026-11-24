import express from 'express';
import { prisma } from '../db.js';
import { requireAdmin, requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, notFound, parsePagination } from '../utils/http.js';
import { beritaSchema, pengumumanSchema, prestasiSchema, bkkSchema } from '../validators/content.js';
import { createBeritaWithSlug, generateBeritaSlug, isSlugConflict, recordBeritaSlugAlias } from '../services/beritaSlug.js';

const definitions = {
  berita: { model: 'berita', schema: beritaSchema, publicWhere: { status: 'published' }, orderBy: { createdAt: 'desc' }, mapInput: mapContentInput, uniqueSlug: true },
  pengumuman: { model: 'pengumuman', schema: pengumumanSchema, publicWhere: { status: 'published' }, orderBy: { createdAt: 'desc' }, mapInput: mapContentInput },
  prestasi: { model: 'prestasi', schema: prestasiSchema, publicWhere: { status: 'published' }, orderBy: { tanggal: 'desc' }, mapInput: mapContentInput },
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
    // `publicSlug: false` menandai model tanpa slug; undefined berarti punya slug.
    const lookup = def.publicSlug === false
      ? [{ id: identifier }]
      : [{ id: identifier }, { slug: identifier }];
    const where = req.isAdmin
      ? { OR: lookup }
      : { OR: lookup, ...def.publicWhere };
    const data = await prisma[def.model].findFirst({ where });
    if (data) { res.json({ data }); return; }

    // Berita: URL lama (tanpa kode unik) tetap dilayani lewat tabel alias.
    if (type === 'berita') {
      const alias = await prisma.beritaSlugAlias.findUnique({
        where: { slug: identifier },
        include: { berita: true },
      });
      if (alias?.berita && (req.isAdmin || alias.berita.status === 'published')) {
        // Beri tahu frontend URL kanonis agar riwayat browser bisa diganti.
        res.set('X-Canonical-Slug', alias.berita.slug);
        res.json({ data: alias.berita, canonicalSlug: alias.berita.slug });
        return;
      }
    }
    throw notFound();
  }));
  router.use(requireAuth, requireAdmin);
  router.post('/', asyncHandler(async (req, res) => {
    const input = def.mapInput(def.schema.parse(req.body));
    if (def.uniqueSlug) {
      delete input.regenerateSlug;
      res.status(201).json({ data: await createBeritaWithSlug(input) });
      return;
    }
    res.status(201).json({ data: await prisma[def.model].create({ data: input }) });
  }));
  router.patch('/:id', asyncHandler(async (req, res) => {
    const input = def.mapInput(def.schema.partial().parse(req.body));
    if (def.uniqueSlug) {
      const regenerate = Boolean(input.regenerateSlug);
      delete input.regenerateSlug;
      // Judul baru tidak mengubah URL lama. Regenerasi harus eksplisit.
      if (regenerate) {
        const current = await prisma.berita.findUnique({ where: { id: req.params.id }, select: { judul: true, slug: true } });
        if (!current) throw notFound();
        // Konflik dari request paralel ditangani dengan mencoba slug baru.
        let updated;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
          const slug = await generateBeritaSlug(input.judul ?? current.judul);
          try {
            // eslint-disable-next-line no-await-in-loop -- retry berurutan disengaja
            updated = await prisma.berita.update({ where: { id: req.params.id }, data: { ...input, slug } });
            break;
          } catch (error) {
            if (!isSlugConflict(error) || attempt === 4) throw error;
          }
        }
        // URL lama dipetakan ke berita yang sama agar tidak 404.
        await recordBeritaSlugAlias(updated.id, current.slug);
        res.json({ data: updated });
        return;
      }
      delete input.slug;
      res.json({ data: await prisma.berita.update({ where: { id: req.params.id }, data: input }) });
      return;
    }
    res.json({ data: await prisma[def.model].update({ where: { id: req.params.id }, data: input }) });
  }));
  router.delete('/:id', asyncHandler(async (req, res) => { await prisma[def.model].delete({ where: { id: req.params.id } }); res.status(204).end(); }));
  return router;
}
