import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, notFound, parsePagination } from '../utils/http.js';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { decodeSqlBuffer } from '../../wordpress-archive/src/lib/sql-parser.js';
import { looksLikeSqlDump, validateDumpStructure } from '../wordpress/dumpValidator.js';
import {
  createImportJob, requestCancel, isJobActive,
} from '../wordpress/importService.js';
import {
  getArchiveItem, getArchiveItems, updateArchiveItem, reviewArchiveItem,
  skipArchiveItem, importToPublicContent,
} from '../wordpress/archiveRepository.js';
import { resolveItemMedia, resolveBatch } from '../wordpress/mediaResolver.js';
import { deleteImportJob } from '../wordpress/jobDeletion.js';

export const wordpressAdminRouter = express.Router();
wordpressAdminRouter.use(requireAuth, requireAdmin);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak upload SQL. Coba lagi nanti.', code: 'rate_limited' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.WORDPRESS_IMPORT_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/\.sql$/i.test(file.originalname)) return cb(null, true);
    cb(badRequest('File harus berekstensi .sql.'));
  },
});

const allowedUploadMime = new Set([
  'application/sql', 'application/x-sql', 'application/octet-stream', 'text/plain', 'text/sql', '',
]);

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)));
}

function parseId(value) {
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw badRequest('ID tidak valid.');
  return value;
}

function enumQuery(value, values, label) {
  if (value === undefined || value === '') return undefined;
  if (!values.includes(value)) throw badRequest(`${label} tidak valid.`);
  return value;
}

wordpressAdminRouter.post('/imports', uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw badRequest('File SQL wajib diunggah.');
  if (!allowedUploadMime.has(String(file.mimetype).toLowerCase())) throw badRequest('MIME file SQL tidak diizinkan.');
  if (file.size > env.WORDPRESS_IMPORT_MAX_BYTES) throw badRequest('Ukuran file SQL melebihi batas.');
  const { text } = decodeSqlBuffer(file.buffer);
  if (!looksLikeSqlDump(text.slice(0, 65536))) throw badRequest('File bukan dump SQL yang dikenali.');
  try {
    // Struktur dicek sebelum job dibuat. Statement ditolak; tidak ada SQL yang dieksekusi.
    validateDumpStructure(text);
  } catch (error) {
    throw badRequest(error.message, error.details);
  }
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const existing = await prisma.wordPressImportJob.findUnique({ where: { sourceChecksum: checksum } });
  if (existing) {
    return res.status(200).json({ data: jsonSafe(existing), duplicate: true, warning: 'File dengan checksum sama sudah pernah diproses.' });
  }
  const result = await createImportJob({ buffer: file.buffer, originalFileName: file.originalname, mimeType: file.mimetype, userId: req.user.id });
  res.status(202).json({ data: jsonSafe(result.job), duplicate: result.duplicate });
}));

wordpressAdminRouter.get('/imports', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { maxLimit: 50 });
  const status = enumQuery(req.query.status, ['uploaded', 'processing', 'completed', 'partially_completed', 'failed', 'cancelled'], 'Status');
  const where = status ? { status } : {};
  const [data, total] = await prisma.$transaction([
    prisma.wordPressImportJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.wordPressImportJob.count({ where }),
  ]);
  res.json({ data: jsonSafe(data), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

wordpressAdminRouter.get('/imports/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = await prisma.wordPressImportJob.findUnique({ where: { id } });
  if (!data) throw notFound();
  res.json({ data: jsonSafe(data) });
}));

wordpressAdminRouter.get('/imports/:id/progress', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = await prisma.wordPressImportJob.findUnique({ where: { id }, select: {
    id: true, status: true, progress: true, processedRows: true, totalSourceRecords: true,
    candidateCount: true, beritaCount: true, pengumumanCount: true, prestasiCount: true,
    reviewCount: true, skippedCount: true, failedCount: true, errorSummary: true, completedAt: true,
  } });
  if (!data) throw notFound();
  res.json({ data: { ...jsonSafe(data), active: isJobActive(id) } });
}));

wordpressAdminRouter.post('/imports/:id/cancel', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!requestCancel(id)) throw conflict('Job tidak sedang diproses.', 'not_processing');
  res.json({ data: { id, status: 'cancelling' } });
}));

// Menghapus job + arsipnya. Konten CMS yang sudah dibuat tetap utuh.
wordpressAdminRouter.delete('/imports/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deleteImportJob(parseId(req.params.id), req.user.id) });
}));

wordpressAdminRouter.get('/archive', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 });
  const targetType = enumQuery(req.query.targetType, ['berita', 'pengumuman', 'prestasi', 'needs_review'], 'Target');
  const reviewStatus = enumQuery(req.query.reviewStatus, ['pending_review', 'ready', 'imported', 'skipped', 'failed'], 'Status review');
  const where = {
    ...(targetType ? { targetType } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(req.query.jobId ? { jobId: parseId(req.query.jobId) } : {}),
    ...(req.query.search ? { OR: [
      { title: { contains: String(req.query.search).slice(0, 100) } },
      { content: { contains: String(req.query.search).slice(0, 100) } },
      { slug: { contains: String(req.query.search).slice(0, 100) } },
    ] } : {}),
  };
  const orderField = ['title', 'sourceDate', 'createdAt', 'reviewStatus'].includes(req.query.sort) ? req.query.sort : 'createdAt';
  const orderDirection = req.query.order === 'asc' ? 'asc' : 'desc';
  const result = await getArchiveItems({ where, skip, take: limit, orderBy: { [orderField]: orderDirection } });
  res.json({ data: jsonSafe(result.items), pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
}));

wordpressAdminRouter.get('/archive/:id', asyncHandler(async (req, res) => {
  res.json({ data: jsonSafe(await getArchiveItem(parseId(req.params.id))) });
}));

wordpressAdminRouter.patch('/archive/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const allowed = ['title', 'slug', 'summary', 'content', 'imageUrl', 'targetType', 'reviewStatus', 'reviewNotes'];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (patch.targetType && !['berita', 'pengumuman', 'prestasi', 'needs_review'].includes(patch.targetType)) throw badRequest('Target tidak valid.');
  if (patch.reviewStatus && !['pending_review', 'ready', 'imported', 'skipped', 'failed'].includes(patch.reviewStatus)) throw badRequest('Status review tidak valid.');
  if (patch.title !== undefined && (typeof patch.title !== 'string' || !patch.title.trim())) throw badRequest('Judul wajib diisi.');
  if (patch.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(patch.slug)) throw badRequest('Slug tidak valid.');
  res.json({ data: jsonSafe(await updateArchiveItem(id, patch, req.user.id)) });
}));

wordpressAdminRouter.post('/archive/:id/review', asyncHandler(async (req, res) => {
  const body = req.body || {};
  res.json({ data: jsonSafe(await reviewArchiveItem(parseId(req.params.id), {
    reviewStatus: body.reviewStatus,
    reviewNotes: body.reviewNotes,
    targetType: body.targetType,
    actorId: req.user.id,
  })) });
}));

wordpressAdminRouter.post('/archive/:id/skip', asyncHandler(async (req, res) => {
  res.json({ data: jsonSafe(await skipArchiveItem(parseId(req.params.id), { actorId: req.user.id, reviewNotes: req.body?.reviewNotes })) });
}));

wordpressAdminRouter.post('/archive/:id/import', asyncHandler(async (req, res) => {
  const status = req.body?.status ?? 'draft';
  res.status(201).json({ data: jsonSafe(await importToPublicContent(parseId(req.params.id), req.user.id, status)) });
}));

wordpressAdminRouter.post('/archive/:id/media', asyncHandler(async (req, res) => {
  res.json({ data: jsonSafe(await resolveItemMedia(parseId(req.params.id), req.user.id)) });
}));

wordpressAdminRouter.post('/archive/media/batch', asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body?.ids)) throw badRequest('ids wajib berupa array.');
  res.json({ data: jsonSafe(await resolveBatch(req.body.ids, req.user.id, { limit: 5 })) });
}));
