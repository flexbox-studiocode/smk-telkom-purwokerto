import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, HttpError, parsePagination } from '../utils/http.js';
import { AI_CONFIG_ENCRYPTION_VERSION, decryptAiApiKey, encryptAiApiKey } from '../services/aiConfigCrypto.js';
import { listAiProviderModels, normalizeProvider, testAiProviderConnection, validateProviderConfig, verifyAiProviderApiKey } from '../services/aiProvider.js';
import { listAiProviders, requireAiProvider } from '../services/aiProviderRegistry.js';
import { AiProviderError, AI_ERROR_CODES, adminMessageForCode, httpStatusForCode, logProviderEvent } from '../services/aiErrors.js';
import { invalidateAiConfigCache, recordAiCheck, resolveAiConfig } from '../services/aiRuntimeConfig.js';

export const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

const aiServiceSchema = z.enum(['stela', 'nexttel']);
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));
// ID provider WAJIB melewati registry allowlist sebelum apa pun disentuh.
const aiProviderSchema = z.string().trim().min(1).max(40).superRefine((value, ctx) => {
  try { requireAiProvider(value); } catch { ctx.addIssue({ code: 'custom', message: 'Provider tidak didukung.' }); }
});
// Konfigurasi yang disimpan. Nama tampilan hanya label; ID internal layanan
// (stela/nexttel) tetap menjadi kunci routing dan integrasi.
const aiConfigSchema = z.object({
  displayName: optionalText(80),
  provider: aiProviderSchema,
  endpoint: optionalText(2048),
  model: z.string().trim().min(1, 'Model wajib diisi.').max(180),
  apiKey: optionalText(4096),
  enabled: z.boolean().optional(),
});
// Draft dari form yang sedang diedit; dipakai uji/verifikasi/daftar model.
const aiDraftSchema = z.object({
  provider: aiProviderSchema,
  endpoint: optionalText(2048),
  model: optionalText(180),
  apiKey: optionalText(4096),
});
const aiLimit = (limit, error) => rateLimit({ windowMs: 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error, code: 'rate_limited' } });
// Semua pemeriksaan memanggil API provider berbayar, jadi dibatasi per menit.
const aiTestLimit = aiLimit(10, 'Terlalu banyak uji koneksi. Coba lagi nanti.');
const aiDiscoveryLimit = aiLimit(10, 'Terlalu banyak permintaan daftar model. Coba lagi nanti.');
const aiVerifyLimit = aiLimit(10, 'Terlalu banyak verifikasi API key. Coba lagi nanti.');

// Bentuk publik: tidak pernah memuat API key atau ciphertext-nya.
const aiPublic = (row) => row ? {
  service: row.feature,
  displayName: row.displayName,
  provider: row.provider,
  endpoint: row.endpoint,
  model: row.model,
  enabled: row.enabled,
  configured: Boolean(row.encryptedApiKey),
  encryptionVersion: row.encryptionVersion,
  lastCheckCode: row.lastCheckCode,
  lastCheckedAt: row.lastCheckedAt,
  updatedAt: row.updatedAt,
} : null;
// Layanan yang belum dikonfigurasi tetap mengembalikan objek (bukan null).
const aiPublicEmpty = (service) => ({ service, displayName: null, provider: null, endpoint: null, model: null, enabled: false, configured: false, lastCheckCode: null, lastCheckedAt: null, updatedAt: null });

adminRouter.get('/ai-settings', asyncHandler(async (_req, res) => {
  const rows = await prisma.aiProviderConfig.findMany({ orderBy: { feature: 'asc' } });
  res.json({ data: ['stela', 'nexttel'].map((service) => aiPublic(rows.find((row) => row.feature === service) || null) ?? aiPublicEmpty(service)) });
}));

// Metadata provider untuk UI. Tidak memuat endpoint/key/model tersimpan.
adminRouter.get('/ai-settings/providers', asyncHandler(async (_req, res) => {
  res.json({ data: listAiProviders() });
}));

const credentialMissing = (message) => new HttpError(400, message, AI_ERROR_CODES.CREDENTIAL_MISSING);
const decryptStored = (row) => {
  try { return decryptAiApiKey(row.encryptedApiKey); } catch { throw new HttpError(400, adminMessageForCode(AI_ERROR_CODES.DECRYPTION_FAILED), AI_ERROR_CODES.DECRYPTION_FAILED); }
};

/**
 * Menyiapkan konfigurasi draft untuk uji/verifikasi/daftar model tanpa
 * menyimpan apa pun. Key yang sedang diketik dipakai bila ada; bila kosong,
 * key tersimpan didekripsi di server (tidak pernah dikirim ke browser).
 * `matchesStored` true bila draft identik dengan konfigurasi tersimpan,
 * sehingga hasilnya boleh direkam sebagai status layanan.
 */
async function prepareDraft(service, body, requiredMessage) {
  let normalized;
  try { normalized = validateProviderConfig({ provider: body.provider, endpoint: body.endpoint, model: body.model || 'placeholder' }); } catch (error) { throw badRequest(error.message); }
  const existing = await prisma.aiProviderConfig.findUnique({ where: { feature: service } });
  let apiKey = body.apiKey || null;
  if (!apiKey && existing?.encryptedApiKey) apiKey = decryptStored(existing);
  if (!apiKey && !existing) apiKey = (await resolveAiConfig(service))?.apiKey || null;
  if (!apiKey) throw credentialMissing(requiredMessage);
  const matchesStored = !body.apiKey && Boolean(existing?.encryptedApiKey)
    && normalizeProvider(existing.provider) === normalized.provider
    && existing.endpoint === normalized.endpoint
    && existing.model === normalized.model;
  return { normalized, apiKey, matchesStored };
}

function sendProviderFailure(res, event, normalized, error) {
  const code = error instanceof AiProviderError ? error.code : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
  logProviderEvent('warn', event, { provider: normalized.provider, model: normalized.model, code, status: error?.status || 0, requestId: error?.requestId, detail: error?.detail });
  // `detail` = pesan provider yang sudah disensor, membantu admin mendiagnosis.
  res.status(httpStatusForCode(code)).json({ error: adminMessageForCode(code), code, detail: error?.detail ?? null });
}

// Muat daftar model: non-destruktif, hanya membaca dari provider.
adminRouter.post('/ai-settings/:service/models', aiDiscoveryLimit, asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiDraftSchema.parse(req.body);
  const adapter = requireAiProvider(body.provider);
  if (!adapter.supportsModelList) return res.json({ data: { service, provider: adapter.id, supported: false, models: [] } });
  const { normalized, apiKey } = await prepareDraft(service, body, 'Masukkan API key untuk memuat daftar model.');
  try {
    const result = await listAiProviderModels({ ...normalized, apiKey }, { timeoutMs: 12000 });
    res.json({ data: { service, provider: adapter.id, supported: result.supported, models: result.models } });
  } catch (error) {
    sendProviderFailure(res, 'ai_models_failed', normalized, error);
  }
}));

// Uji koneksi: endpoint provider dapat dijangkau. Non-destruktif.
adminRouter.post('/ai-settings/:service/test', aiTestLimit, asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiDraftSchema.parse(req.body);
  const { normalized, apiKey } = await prepareDraft(service, body, 'Masukkan API key untuk menguji koneksi.');
  try {
    const result = await testAiProviderConnection({ ...normalized, apiKey }, { timeoutMs: 10000 });
    const message = result.accepted
      ? 'Endpoint provider terjangkau dan merespons.'
      : `Endpoint terjangkau, tetapi provider menolak permintaan: ${adminMessageForCode(result.code)}`;
    res.json({ data: { service, reachable: true, accepted: result.accepted, code: result.code ?? null, message, detail: result.detail ?? null } });
  } catch (error) {
    sendProviderFailure(res, 'ai_test_failed', normalized, error);
  }
}));

// Verifikasi API key: kredensial + akses ke model terpilih. Non-destruktif;
// hanya merekam status bila yang diuji adalah konfigurasi tersimpan.
adminRouter.post('/ai-settings/:service/verify', aiVerifyLimit, asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiDraftSchema.parse(req.body);
  if (!body.model) throw badRequest('Model wajib diisi untuk verifikasi.');
  const { normalized, apiKey, matchesStored } = await prepareDraft(service, body, 'Masukkan API key untuk verifikasi.');
  try {
    await verifyAiProviderApiKey({ ...normalized, apiKey }, { timeoutMs: 20000 });
    if (matchesStored) await recordAiCheck(service, 'OK');
    res.json({ data: { service, provider: normalized.provider, model: normalized.model, verified: true, recorded: matchesStored } });
  } catch (error) {
    if (matchesStored && error instanceof AiProviderError) await recordAiCheck(service, error.code);
    sendProviderFailure(res, 'ai_verify_failed', normalized, error);
  }
}));

adminRouter.put('/ai-settings/:service', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const body = aiConfigSchema.parse(req.body);
  let normalized;
  try { normalized = validateProviderConfig(body); } catch (error) { throw badRequest(error.message); }
  const existing = await prisma.aiProviderConfig.findUnique({ where: { feature: service } });

  // Key kosong = pertahankan key tersimpan. Key tersimpan tidak pernah ditimpa
  // string kosong/null melalui endpoint ini (penghapusan hanya lewat DELETE).
  if (!body.apiKey && !existing?.encryptedApiKey) throw credentialMissing('API key wajib diisi saat konfigurasi pertama kali.');
  if (!body.apiKey) decryptStored(existing);

  let encryptedApiKey;
  if (body.apiKey) {
    try { encryptedApiKey = encryptAiApiKey(body.apiKey); } catch (error) { throw badRequest(error.message); }
  }
  // Perubahan yang memengaruhi koneksi membuat status kembali "belum terverifikasi".
  const connectionChanged = !existing || Boolean(body.apiKey)
    || normalizeProvider(existing.provider) !== normalized.provider
    || existing.endpoint !== normalized.endpoint
    || existing.model !== normalized.model;
  const data = {
    feature: service,
    displayName: body.displayName || null,
    provider: normalized.provider,
    endpoint: normalized.endpoint,
    model: normalized.model,
    enabled: body.enabled ?? existing?.enabled ?? false,
    updatedBy: req.user.id,
    encryptionVersion: encryptedApiKey ? AI_CONFIG_ENCRYPTION_VERSION : existing?.encryptionVersion ?? null,
    ...(encryptedApiKey ? { encryptedApiKey } : {}),
    ...(connectionChanged ? { lastCheckCode: null, lastCheckedAt: null } : {}),
  };
  const row = existing
    ? await prisma.aiProviderConfig.update({ where: { feature: service }, data })
    : await prisma.aiProviderConfig.create({ data });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row) });
}));

// Aktifkan/nonaktifkan tanpa menyentuh API key.
adminRouter.patch('/ai-settings/:service/status', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
  const existing = await prisma.aiProviderConfig.findUnique({ where: { feature: service } });
  if (!existing) throw badRequest('Konfigurasi layanan belum tersedia.');
  if (enabled && !existing.encryptedApiKey) throw credentialMissing('Layanan tidak dapat diaktifkan sebelum API key disimpan.');
  const row = await prisma.aiProviderConfig.update({ where: { feature: service }, data: { enabled, updatedBy: req.user.id } });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row) });
}));

// Hapus key HANYA milik layanan ini dan nonaktifkan layanannya. Selama baris
// database ada, fallback environment tidak dipakai.
adminRouter.delete('/ai-settings/:service/key', asyncHandler(async (req, res) => {
  const service = aiServiceSchema.parse(req.params.service);
  const existing = await prisma.aiProviderConfig.findUnique({ where: { feature: service } });
  if (!existing) throw badRequest('Konfigurasi layanan belum tersedia.');
  const row = await prisma.aiProviderConfig.update({ where: { feature: service }, data: { encryptedApiKey: null, encryptionVersion: null, enabled: false, lastCheckCode: null, lastCheckedAt: null, updatedBy: req.user.id } });
  invalidateAiConfigCache();
  res.json({ data: aiPublic(row), fallback: { environment: false } });
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
