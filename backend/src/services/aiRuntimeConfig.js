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
  return { source: 'database', provider, endpoint: row.endpoint, model: row.model, apiKey, enabled: true };
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
