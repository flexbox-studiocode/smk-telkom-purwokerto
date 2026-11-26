// Lapisan kompatibilitas provider AI.
//
// Call site lama tetap mengimpor file ini. Implementasi dipisah ke registry dan
// adapter vendor agar penambahan provider tidak berubah menjadi rantai if/else.
import { decryptAiApiKey } from './aiConfigCrypto.js';
import { getAiProvider, normalizeProvider, requireAiProvider } from './aiProviderRegistry.js';
import { AiProviderError, AI_ERROR_CODES } from './aiErrors.js';
export { normalizeProvider } from './aiProviderRegistry.js';
export { validateEndpoint, resolveHostnameSafely } from './aiProviderShared.js';
export {
  buildGeminiBody,
  geminiDisableThinking,
  geminiModelPath,
  parseGeminiResponse,
} from './aiProviders/gemini.js';
export { buildOpenAiBody, parseOpenAiResponse } from './aiProviders/openaiCompatible.js';

export const GEMINI_DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const geminiDefaultEndpoint = GEMINI_DEFAULT_ENDPOINT;

export function validateProviderConfig(input) {
  return requireAiProvider(input?.provider).validateConfig({ ...input, provider: normalizeProvider(input?.provider) });
}

export function configWithSecret(row) {
  if (!row) return null;
  let apiKey = null;
  try { apiKey = decryptAiApiKey(row.encryptedApiKey); } catch { return null; }
  return { provider: normalizeProvider(row.provider), endpoint: row.endpoint, model: row.model, enabled: row.enabled, apiKey };
}

function requireAiAdapter(provider) {
  const adapter = getAiProvider(provider);
  if (!adapter) throw new AiProviderError(AI_ERROR_CODES.INVALID_REQUEST, { provider, model: undefined });
  return adapter;
}

/** Menjalankan chat melalui adapter provider terdaftar. */
export function callAiProvider(config, messages, options) {
  const adapter = requireAiAdapter(config?.provider);
  return adapter.generateResponse({ ...config, provider: adapter.id }, messages, options);
}

/** Uji koneksi mengirim prompt minimal ke model yang dipilih. */
export function testAiProviderConnection(config, options) {
  const adapter = requireAiAdapter(config?.provider);
  return adapter.testConnection({ ...config, provider: adapter.id }, options);
}

/** Verifikasi API key tanpa menyimpan konfigurasi. */
export function verifyAiProviderApiKey(config, options) {
  const adapter = requireAiAdapter(config?.provider);
  return adapter.verifyApiKey({ ...config, provider: adapter.id }, options);
}

/** Discovery model dari backend; key tidak pernah dikirim ke browser. */
export function listAiProviderModels(config, options) {
  const adapter = requireAiAdapter(config?.provider);
  return adapter.listModels({ ...config, provider: adapter.id }, options);
}
