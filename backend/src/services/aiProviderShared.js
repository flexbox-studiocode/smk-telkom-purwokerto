// Primitif bersama untuk seluruh adapter provider AI.
//
// Berisi validasi endpoint (anti-SSRF), runner HTTP, dan pabrik adapter.
// Tidak ada logika khusus vendor di sini; setiap adapter hanya menyediakan
// bentuk request/parsing respons miliknya sendiri.
import dns from 'node:dns/promises';
import net from 'node:net';
import {
  AiProviderError,
  AI_ERROR_CODES,
  classifyProviderError,
  logProviderEvent,
  newRequestId,
} from './aiErrors.js';

// Batas keluaran default. Model thinking (gemini-2.5-*) memakai sebagian budget
// ini untuk token "thought" yang TIDAK muncul di content.parts; budget terlalu
// kecil membuat jawaban tampak kosong. Nilai di bawah terukur cukup untuk
// jawaban FAQ sekolah dan tetap murah.
export const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1024);
export const TEST_MAX_OUTPUT_TOKENS = 256;
export const VERIFY_MAX_OUTPUT_TOKENS = 16;
export const MAX_MODELS = 200;

export const GEMINI_DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function validateEndpoint(endpoint, { allowGeminiDefault = false } = {}) {
  if (!endpoint && allowGeminiDefault) return GEMINI_DEFAULT_ENDPOINT;
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Endpoint tidak valid.'); }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('Endpoint production wajib menggunakan HTTPS.');
  if (url.username || url.password) throw new Error('Endpoint tidak boleh memuat kredensial.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || net.isIP(host) || host === '0.0.0.0' || host === '::1' || host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw new Error('Endpoint internal/private tidak diizinkan.');
  return url.toString().replace(/\/$/, '');
}

export function isPrivateAddress(address) {
  if (net.isIPv4(address)) return address === '127.0.0.1' || address === '0.0.0.0' || address.startsWith('10.') || address.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(address) || address.startsWith('169.254.');
  return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
}

// SSRF: resolusi DNS diulang tepat sebelum request agar tidak bergantung pada
// hasil lookup sebelumnya. Private/loopback/link-local ditolak. Bila resolver
// tidak tersedia, pengecekan literal (validateEndpoint) tetap berlaku.
export async function resolveHostnameSafely(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('Endpoint internal/private tidak diizinkan.');
    return true;
  }
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return true;
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('Endpoint internal/private tidak diizinkan.');
  return true;
}

// Menyusun URL dari basis + path tanpa menduplikasi path bila basis sudah
// memuatnya (mis. konfigurasi lama menyimpan URL lengkap `/chat/completions`).
export function joinEndpoint(base, path) {
  const trimmedBase = String(base ?? '').replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (trimmedBase.toLowerCase().endsWith(suffix.toLowerCase())) return trimmedBase;
  return `${trimmedBase}${suffix}`;
}

function withTimeout(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Menjalankan satu request HTTP ke provider lalu mengembalikan JSON.
 *
 * - Kredensial hanya lewat header yang disiapkan adapter.
 * - redirect: 'error' menutup celah SSRF via redirect.
 * - Galat non-2xx dipetakan ke AiProviderError terklasifikasi; badan respons
 *   provider tidak pernah diteruskan (dapat memuat key/endpoint).
 */
export async function sendProviderRequest(adapter, request, { timeoutMs, provider, model, requestId, startedAt, eventPrefix = 'ai_provider' }) {
  let response;
  try {
    response = await fetch(request.url, {
      method: request.method || 'POST',
      signal: withTimeout(timeoutMs),
      headers: request.headers,
      redirect: 'error',
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || /timeout|aborted/i.test(error?.message || '');
    const code = timedOut ? AI_ERROR_CODES.PROVIDER_TIMEOUT : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    logProviderEvent('warn', `${eventPrefix}_request_failed`, { provider, model, code, requestId, ms: Date.now() - startedAt });
    throw new AiProviderError(code, { provider, model, requestId, cause: error });
  }

  if (!response.ok) {
    let bodyText = '';
    try { bodyText = (await response.text()).slice(0, 2000); } catch { bodyText = ''; }
    const code = classifyProviderError({ status: response.status, providerText: bodyText, hint: adapter.hint });
    throw new AiProviderError(code, { status: response.status, provider, model, requestId });
  }

  try {
    return await response.json();
  } catch (error) {
    logProviderEvent('warn', `${eventPrefix}_parse_failed`, { provider, model, status: response.status, code: AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, requestId, ms: Date.now() - startedAt });
    throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { provider, model, status: response.status, requestId, cause: error });
  }
}

// Validasi endpoint + DNS sekali pakai untuk satu konfigurasi. Mengembalikan
// endpoint ternormalisasi. Melempar AiProviderError INVALID_ENDPOINT bila gagal.
async function resolveEndpoint(adapter, config, skipDnsCheck) {
  let endpoint;
  try {
    endpoint = validateEndpoint(config.endpoint, { allowGeminiDefault: adapter.id === 'gemini' });
  } catch (error) {
    throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: adapter.id, model: config.model, cause: error });
  }
  if (!endpoint) throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: adapter.id, model: config.model });
  if (!skipDnsCheck) {
    try { await resolveHostnameSafely(new URL(endpoint).hostname); } catch (error) {
      throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: adapter.id, model: config.model, cause: error });
    }
  }
  return endpoint;
}

function wrapParseError(error, { provider, model, requestId, startedAt, eventPrefix }) {
  const code = error instanceof AiProviderError ? error.code : AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE;
  logProviderEvent('warn', `${eventPrefix}_empty_response`, { provider, model, code, requestId, reason: error?.reason, ms: Date.now() - startedAt });
  if (error instanceof AiProviderError) { error.provider = provider; error.model = model; error.requestId = requestId; return error; }
  return new AiProviderError(code, { provider, model, requestId, cause: error });
}

/** Menjalankan percakapan dan mengembalikan teks jawaban. */
export async function generateResponse(adapter, config, messages, { timeoutMs = 25000, testOnly = false, skipDnsCheck = false, maxOutputTokens, eventPrefix = 'ai_provider' } = {}) {
  if (!config?.apiKey) throw new AiProviderError(AI_ERROR_CODES.CREDENTIAL_MISSING, { provider: adapter.id, model: config?.model });
  const endpoint = await resolveEndpoint(adapter, config, skipDnsCheck);
  const requestId = newRequestId();
  const startedAt = Date.now();
  const budget = Number.isFinite(maxOutputTokens) ? maxOutputTokens : (testOnly ? TEST_MAX_OUTPUT_TOKENS : DEFAULT_MAX_OUTPUT_TOKENS);
  const request = adapter.buildChatRequest({ ...config, endpoint }, messages, { maxOutputTokens: budget, testOnly });
  const data = await sendProviderRequest(adapter, request, { timeoutMs, provider: adapter.id, model: config.model, requestId, startedAt, eventPrefix });
  try {
    return adapter.parseChatResponse(data);
  } catch (error) {
    throw wrapParseError(error, { provider: adapter.id, model: config.model, requestId, startedAt, eventPrefix });
  }
}

/** Mengambil daftar model. Provider tanpa dukungan mengembalikan supported:false. */
export async function listModels(adapter, config, { timeoutMs = 15000, skipDnsCheck = false } = {}) {
  if (!adapter.supportsModelList || typeof adapter.buildModelsRequest !== 'function') return { supported: false, models: [] };
  if (!config?.apiKey) throw new AiProviderError(AI_ERROR_CODES.CREDENTIAL_MISSING, { provider: adapter.id, model: config?.model });
  const endpoint = await resolveEndpoint(adapter, config, skipDnsCheck);
  const requestId = newRequestId();
  const startedAt = Date.now();
  const request = adapter.buildModelsRequest({ ...config, endpoint }, {});
  const data = await sendProviderRequest(adapter, request, { timeoutMs, provider: adapter.id, model: config.model, requestId, startedAt, eventPrefix: 'ai_models' });
  let models;
  try {
    models = adapter.parseModelsResponse(data);
  } catch (error) {
    throw wrapParseError(error, { provider: adapter.id, model: config.model, requestId, startedAt, eventPrefix: 'ai_models' });
  }
  const unique = [];
  const seen = new Set();
  for (const item of Array.isArray(models) ? models : []) {
    const id = String(item?.id ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push({ id, label: item?.label ? String(item.label) : id });
    if (unique.length >= MAX_MODELS) break;
  }
  return { supported: true, models: unique };
}

/**
 * Memverifikasi API key tanpa menyimpan apa pun.
 * Bila provider mendukung daftar model, cukup daftar model (murah). Bila tidak,
 * kirim satu permintaan minimal ke model terpilih.
 */
export async function verifyApiKey(adapter, config, { timeoutMs = 12000, skipDnsCheck = false } = {}) {
  if (!config?.apiKey) throw new AiProviderError(AI_ERROR_CODES.CREDENTIAL_MISSING, { provider: adapter.id, model: config?.model });
  if (adapter.supportsModelList) {
    const result = await listModels(adapter, config, { timeoutMs, skipDnsCheck });
    return { verified: true, method: 'model_list', modelCount: result.models.length };
  }
  await generateResponse(adapter, config, [{ role: 'user', content: 'ping' }], { timeoutMs, skipDnsCheck, maxOutputTokens: VERIFY_MAX_OUTPUT_TOKENS, testOnly: true });
  return { verified: true, method: 'generate' };
}

function validateConfigFor(adapter, input) {
  const model = String(input?.model ?? '').trim();
  if (!model || model.length > 180) throw new Error('Model wajib diisi.');
  let endpoint = String(input?.endpoint ?? '').trim();
  if (!endpoint && adapter.requiresEndpoint) throw new Error('Endpoint wajib diisi untuk provider ini.');
  if (!endpoint) {
    if (adapter.defaultEndpoint) endpoint = adapter.defaultEndpoint;
    else throw new Error('Endpoint wajib diisi untuk provider ini.');
  }
  endpoint = validateEndpoint(endpoint, { allowGeminiDefault: adapter.id === 'gemini' && !input?.endpoint });
  return { provider: adapter.id, endpoint, model };
}

/**
 * Menutup sebuah spesifikasi adapter menjadi objek adapter lengkap.
 * Setiap adapter wajib menyediakan: id, label, hint, requiresEndpoint,
 * defaultEndpoint, supportsModelList, buildChatRequest, parseChatResponse.
 * buildModelsRequest/parseModelsResponse wajib bila supportsModelList true.
 */
export function defineAdapter(spec) {
  const adapter = { ...spec, defaultEndpoint: spec.defaultEndpoint ?? null };
  adapter.validateConfig = (input) => validateConfigFor(adapter, input);
  adapter.generateResponse = (config, messages, opts) => generateResponse(adapter, config, messages, opts);
  adapter.testConnection = (config, opts = {}) => generateResponse(adapter, config, [{ role: 'user', content: 'Balas singkat: koneksi berhasil.' }], { ...opts, testOnly: true });
  adapter.listModels = (config, opts) => listModels(adapter, config, opts);
  adapter.verifyApiKey = (config, opts) => verifyApiKey(adapter, config, opts);
  adapter.normalizeError = (error) => (error instanceof AiProviderError ? error.code : AI_ERROR_CODES.PROVIDER_UNAVAILABLE);
  adapter.parseResponse = (data) => adapter.parseChatResponse(data);
  return Object.freeze(adapter);
}
