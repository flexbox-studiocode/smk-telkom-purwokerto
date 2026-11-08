import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler, conflict, notFound } from '../utils/http.js';

export const settingsRouter = express.Router();
settingsRouter.get('/', optionalAuth, asyncHandler(async (_req, res) => {
  const data = await prisma.siteSettings.findFirst();
  if (!data) throw notFound('Pengaturan belum tersedia.');
  res.json({ data });
}));
settingsRouter.use(requireAuth, requireAdmin);
settingsRouter.patch('/', asyncHandler(async (req, res) => {
  const expectedRevision = Number(req.body.revision ?? 0);
  const current = await prisma.siteSettings.findFirst();
  if (!current || current.revision !== expectedRevision) throw conflict('Pengaturan telah berubah. Muat ulang halaman.', 'revision_conflict');
  const allowed = ['schoolName', 'npsn', 'address', 'phone', 'email', 'website', 'logoUrl', 'academicYear', 'spmbOpen', 'newsPageSize'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const updated = await prisma.siteSettings.update({ where: { id: true }, data: { ...data, revision: { increment: 1 } } });
  res.json({ data: updated });
}));
