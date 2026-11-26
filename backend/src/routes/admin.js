import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, parsePagination } from '../utils/http.js';
import { AI_CONFIG_ENCRYPTION_VERSION, encryptAiApiKey } from '../services/aiConfigCrypto.js';
import { callAiProvider, validateProviderConfig } from '../services/aiProvider.js';
import { invalidateAiConfigCache } from '../services/aiRuntimeConfig.js';

export const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

const aiServiceSchema = z.enum(['stela', 'nexttel']);
const aiConfigSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  endpoint: z.string().trim().max(2048).optional().or(z.literal('')),
  model: z.string().trim().min(1).max(180),
  apiKey: z.string().trim().max(4096).optional().or(z.literal('')),
  enabled: z.boolean().optional(),
});
const aiTestLimit = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak uji koneksi. Coba lagi nanti.', code: 'rate_limited' } });
const aiPublic = (row) => row ? { service: row.feature, provider: row.provider, endpoint: row.endpoint, model: row.model, enabled: row.enabled, configured: Boolean(row.encryptedApiKey), encryptionVersion: row.encryptionVersion, updatedAt: row.updatedAt } : null;

adminRouter.get('/ai-settings', asyncHandler(async (_req, res) => {
  const rows = await prisma.aiProviderConfig.findMany({ orderBy: { feature: 'asc' } });
  res.json({ data: ['stela', 'nexttel'].map((service) => aiPublic(rows.find((row) => row.feature === service) || null)) });
}));

adminRouter.put('/ai-settings/:service', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiConfigSchema.parse(req.body);
  let normalized;
  try { normalized = validateProviderConfig(body); } catch (error) { throw badRequest(error.message, undefined); }
  let encryptedApiKey;
  if (body.apiKey) {
    try { encryptedApiKey = encryptAiApiKey(body.apiKey); } catch (error) { throw badRequest(error.message, undefined); }
  }
  const existing = await prisma.aiProviderConfig.findUnique({ where: { feature: service } });
  const data = {
    feature: service,
    provider: normalized.provider,
    endpoint: normalized.endpoint,
    model: normalized.model,
    enabled: body.enabled ?? existing?.enabled ?? false,
    updatedBy: req.user.id,
    encryptionVersion: encryptedApiKey ? AI_CONFIG_ENCRYPTION_VERSION : existing?.encryptionVersion ?? null,
    ...(body.apiKey ? { encryptedApiKey } : {}),
  };
  const row = existing
    ? await prisma.aiProviderConfig.update({ where: { feature: service }, data })
    : await prisma.aiProviderConfig.create({ data: { ...data, encryptedApiKey: encryptedApiKey || null } });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row) });
}));

adminRouter.patch('/ai-settings/:service/status', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
  const row = await prisma.aiProviderConfig.update({ where: { feature: service }, data: { enabled, updatedBy: req.user.id } });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row) });
}));

adminRouter.delete('/ai-settings/:service/key', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const row = await prisma.aiProviderConfig.update({ where: { feature: service }, data: { encryptedApiKey: null, enabled: false, updatedBy: req.user.id } });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row), fallback: { environment: true } });
}));

adminRouter.post('/ai-settings/:service/test', aiTestLimit, asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiConfigSchema.parse(req.body);
  let normalized;
  try { normalized = validateProviderConfig(body); } catch (error) { throw badRequest(error.message, undefined); }
  if (!body.apiKey) throw badRequest('API key wajib diisi untuk uji koneksi.', undefined);
  try {
    await callAiProvider({ ...normalized, apiKey: body.apiKey }, [{ role: 'user', content: 'Balas singkat: koneksi berhasil.' }], { timeoutMs: 10000, testOnly: true });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || /timeout/i.test(error?.message || '');
    return res.status(timeout ? 504 : 502).json({ error: 'Koneksi gagal. Periksa provider, model, endpoint, dan API key.', code: timeout ? 'provider_timeout' : 'provider_failed' });
  }
  res.json({ data: { service, message: 'Koneksi berhasil.' } });
}));

adminRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const [berita, pengumuman, prestasi, bkk, ppdb, recentPpdb] = await prisma.$transaction([
    prisma.berita.count(), prisma.pengumuman.count(), prisma.prestasi.count(), prisma.bkk.count(), prisma.ppdb.count(),
    prisma.ppdb.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  res.json({ counts: { berita, pengumuman, prestasi, bkk, ppdb }, recentPpdb });
}));

adminRouter.get('/ppdb', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const where = req.query.status ? { status: req.query.status } : {};
  const [data, total] = await prisma.$transaction([
    prisma.ppdb.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.ppdb.count({ where }),
  ]);
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

adminRouter.patch('/ppdb/:id/status', asyncHandler(async (req, res) => {
  const allowed = ['menunggu', 'diproses', 'diterima', 'ditolak'];
  const { status, catatanAdmin } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });
  const data = await prisma.ppdb.update({ where: { id: req.params.id }, data: { status, catatanAdmin: catatanAdmin ?? undefined } });
  res.json({ data });
}));
