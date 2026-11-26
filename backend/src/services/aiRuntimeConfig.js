import { prisma } from '../db.js';
import { decryptAiApiKey } from './aiConfigCrypto.js';
import { normalizeProvider, resolveHostnameSafely, validateEndpoint } from './aiProvider.js';

const CACHE_TTL_MS = 15_000;
const cache = new Map();

export const invalidateAiConfigCache = () => cache.clear();
export const aiConfigCacheReset = invalidateAiConfigCache;

// Fallback environment lama. Dijaga per layanan supaya kunci NEXA tidak
// diam-diam dipakai NextTel: penjelasan NextTel hanya menyalakan provider bila
// admin memang mengonfigurasinya (atau mengisi variabel NEXTTEL_* khusus).
const environmentFallbacks = {
  stela() {
    const apiKey = process.env.STELA_API_KEY || process.env.GEMINI_API_KEY || process.env.NINEROUTER_KEY;
    if (!apiKey) return null;
    const providerUrl = process.env.STELA_PROVIDER_URL;
    const enabled = process.env.STELA_AKTIF !== 'false';
    if (providerUrl) return { source: 'environment', provider: 'openai', endpoint: providerUrl, apiKey, model: process.env.STELA_MODEL || process.env.NINEROUTER_MODEL || 'default', enabled };
    return { source: 'environment', provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', apiKey, model: process.env.STELA_MODEL || 'gemini-2.5-flash', enabled };
  },
  nexttel() {
    const apiKey = process.env.NEXTTEL_API_KEY || process.env.NEXTTEL_PROVIDER_KEY;
    if (!apiKey) return null;
    const providerUrl = process.env.NEXTTEL_PROVIDER_URL;
    if (providerUrl) return { source: 'environment', provider: 'openai', endpoint: providerUrl, apiKey, model: process.env.NEXTTEL_MODEL || 'default', enabled: true };
    return { source: 'environment', provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', apiKey, model: process.env.NEXTTEL_MODEL || 'gemini-2.5-flash', enabled: true };
  },
};

async function readDatabaseConfig(service) {
  let row;
  try { row = await prisma.aiProviderConfig.findUnique({ where: { feature: service } }); } catch { return { source: 'unavailable' }; }
  if (!row) return null;
  if (!row.enabled) return { source: 'database', disabled: true, provider: normalizeProvider(row.provider), model: row.model };
  let apiKey = null;
  if (row.encryptedApiKey) {
    try { apiKey = decryptAiApiKey(row.encryptedApiKey); } catch { return { source: 'database', error: 'decryption_failed', provider: normalizeProvider(row.provider), model: row.model }; }
  }
  const provider = normalizeProvider(row.provider);
  return { source: 'database', provider, endpoint: row.endpoint, model: row.model, apiKey, enabled: true, lastCheckCode: row.lastCheckCode };
}

// Kode yang menggambarkan kondisi konfigurasi (bukan gangguan per-permintaan
// seperti timeout). Hanya kode ini, plus 'OK', yang direkam sebagai status.
const STATUS_CODES = new Set(['OK', 'API_KEY_INVALID', 'PERMISSION_DENIED', 'MODEL_NOT_FOUND', 'QUOTA_EXCEEDED', 'INVALID_ENDPOINT', 'INVALID_REQUEST', 'PROVIDER_UNAVAILABLE', 'DECRYPTION_FAILED']);

/**
 * Merekam hasil pemeriksaan terakhir terhadap konfigurasi TERSIMPAN suatu
 * layanan. Raw SQL dipakai agar updated_at (waktu admin mengubah konfigurasi)
 * tidak ikut berubah. Kegagalan rekam tidak boleh menggagalkan permintaan.
 */
export async function recordAiCheck(service, code) {
  if (!STATUS_CODES.has(code)) return;
  try {
    await prisma.$executeRaw`UPDATE ai_provider_configs SET last_check_code = ${code}, last_checked_at = ${new Date()} WHERE feature = ${service}`;
    const cached = cache.get(service)?.value;
    if (cached && cached.source === 'database') cached.lastCheckCode = code;
  } catch { /* status hanya informatif */ }
}

/** Rekam hasil runtime (chat/penjelasan) hanya bila statusnya berubah. */
export function noteRuntimeResult(service, config, code) {
  if (config?.source !== 'database' || config.lastCheckCode === code) return;
  void recordAiCheck(service, code);
}

/**
 * Prioritas konfigurasi: baris database (bila ada) selalu menang. Bila admin
 * belum pernah menyimpan konfigurasi, fallback environment lama dipakai agar
 * layanan tidak terputus saat migrasi.
 */
export async function resolveAiConfig(service) {
  const cached = cache.get(service);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = await readDatabaseConfig(service);
  if (value?.source === 'unavailable' || value === null) value = environmentFallbacks[service]?.() ?? null;

  if (value?.apiKey) {
    try { value = { ...value, endpoint: validateEndpoint(value.endpoint, { allowGeminiDefault: value.provider === 'gemini' }) }; } catch { value = null; }
    if (value) { try { await resolveHostnameSafely(new URL(value.endpoint).hostname); } catch { /* DNS tidak tersedia: provider yang melaporkan */ } }
  }

  cache.set(service, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
