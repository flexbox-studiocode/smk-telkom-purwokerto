import express from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../utils/http.js';
import { jakartaToday } from '../utils/date.js';

export const statsRouter = express.Router();
statsRouter.get('/visitors', asyncHandler(async (_req, res) => {
  const today = jakartaToday();
  const last30 = new Date(today); last30.setUTCDate(last30.getUTCDate() - 29);
  const last12 = new Date(today); last12.setUTCMonth(last12.getUTCMonth() - 11);
  const [todayCount, monthCount, yearCount] = await prisma.$transaction([
    prisma.siteVisitor.count({ where: { day: today } }),
    prisma.siteVisitor.count({ where: { day: { gte: last30 } } }),
    prisma.siteVisitor.count({ where: { day: { gte: last12 } } }),
  ]);
  res.json({ data: { today: todayCount, month: monthCount, year: yearCount } });
}));
statsRouter.post('/visitors', asyncHandler(async (req, res) => {
  const hash = String(req.body?.visitor_hash || '').slice(0, 128);
  if (!hash) return res.status(400).json({ error: 'visitor_hash diperlukan.' });
  const day = jakartaToday();
  await prisma.siteVisitor.upsert({ where: { visitorHash_day: { visitorHash: hash, day } }, create: { visitorHash: hash, day }, update: {} });
  res.status(204).end();
}));
statsRouter.get('/spmb', asyncHandler(async (_req, res) => {
  const [total, accepted, settings] = await prisma.$transaction([
    prisma.ppdb.count(), prisma.ppdb.count({ where: { status: 'diterima' } }), prisma.spmbInformation.findFirst({ where: { jenis: 'statistik', status: 'published' } }),
  ]);
  res.json({ data: { total_pendaftar: total, diterima: accepted, kuota_total: settings?.kuotaTotal ?? null, kuota_tersedia: settings?.kuotaTotal != null ? Math.max(0, settings.kuotaTotal - accepted) : null } });
}));
