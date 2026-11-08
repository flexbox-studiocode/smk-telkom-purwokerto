import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { storage } from '../utils/storage.js';
import { badRequest, forbidden, notFound, asyncHandler } from '../utils/http.js';
import { prisma } from '../db.js';

export const uploadsRouter = express.Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.mimetype)) return cb(null, true);
    cb(badRequest('Jenis file tidak diizinkan.'));
  },
});
const images = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const pdf = 'application/pdf';

// Magic bytes mencegah file yang hanya mengganti Content-Type.
const MAGIC = {
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};
function hasMagic(buffer, mimetype) {
  const magic = MAGIC[mimetype];
  return Boolean(magic) && magic.every((byte, index) => buffer[index] === byte);
}
const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
const ppdbDocumentKey = (userId) => `submissions/${userId}/document.pdf`;

uploadsRouter.post('/content', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.isAdmin) throw forbidden();
  if (!req.file || !images.includes(req.file.mimetype)) throw badRequest('Hanya gambar yang diizinkan.');
  if (!hasMagic(req.file.buffer, req.file.mimetype)) throw badRequest('Isi file tidak cocok dengan jenis gambar.');
  const key = `${crypto.randomUUID()}.${extension[req.file.mimetype]}`;
  const url = await storage.put('content-images', key, req.file.buffer);
  res.status(201).json({ url });
}));

uploadsRouter.post('/ppdb-documents', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file || req.file.mimetype !== pdf || !hasMagic(req.file.buffer, pdf)) throw badRequest('Dokumen harus berupa PDF valid.');
  const key = ppdbDocumentKey(req.user.id);
  await storage.put('ppdb-documents', key, req.file.buffer);
  res.status(201).json({ path: key });
}));

uploadsRouter.get('/ppdb-documents/me', requireAuth, asyncHandler(async (req, res) => {
  const key = ppdbDocumentKey(req.user.id);
  if (!(await storage.exists('ppdb-documents', key))) throw notFound('Dokumen belum diunggah.');
  res.type('application/pdf').send(await storage.get('ppdb-documents', key));
}));

uploadsRouter.get('/ppdb-documents/:userId', requireAuth, asyncHandler(async (req, res) => {
  const owner = req.user.id === req.params.userId;
  if (!owner && !req.isAdmin) throw forbidden();
  const application = await prisma.ppdb.findUnique({ where: { userId: req.params.userId } });
  if (!application && !req.isAdmin) throw notFound();
  const key = ppdbDocumentKey(req.params.userId);
  if (!(await storage.exists('ppdb-documents', key))) throw notFound('Dokumen belum diunggah.');
  res.type('application/pdf').send(await storage.get('ppdb-documents', key));
}));