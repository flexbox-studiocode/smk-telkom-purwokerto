import dns from 'node:dns/promises';
import net from 'node:net';
import { decryptAiApiKey } from './aiConfigCrypto.js';
import {
  AiProviderError,
  AI_ERROR_CODES,
  classifyProviderError,
  logProviderEvent,
  newRequestId,
} from './aiErrors.js';

export const GEMINI_DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROVIDERS = new Set(['gemini', 'openai']);

// Batas keluaran default. Model thinking (gemini-2.5-*) memakai sebagian budget
// ini untuk token "thought" yang TIDAK muncul di content.parts; budget terlalu
// kecil membuat jawaban tampak kosong. Nilai di bawah terukur cukup untuk
// jawaban FAQ sekolah dan tetap murah.
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1024);
const TEST_MAX_OUTPUT_TOKENS = 256;

export function normalizeProvider(value) {
  return value === 'google-gemini' ? 'gemini' : value === 'openai-compatible' ? 'openai' : value;
}

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

export function validateProviderConfig(input) {
  const provider = normalizeProvider(input.provider);
  if (!PROVIDERS.has(provider)) throw new Error('Provider tidak didukung.');
  const model = String(input.model ?? '').trim();
  if (!model || model.length > 180) throw new Error('Model wajib diisi.');
  const endpoint = provider === 'gemini' ? validateEndpoint(input.endpoint, { allowGeminiDefault: true }) : validateEndpoint(input.endpoint);
  if (provider === 'openai' && !endpoint) throw new Error('Endpoint wajib diisi untuk OpenAI-compatible.');
  return { provider, endpoint, model };
}

export function configWithSecret(row) {
  if (!row) return null;
  let apiKey = null;
  try { apiKey = decryptAiApiKey(row.encryptedApiKey); } catch { return null; }
  return { provider: row.provider, endpoint: row.endpoint, model: row.model, enabled: row.enabled, apiKey };
}

function isPrivateAddress(address) {
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

// --- Gemini ---------------------------------------------------------------

// Gemini menerima id model apa adanya setelah `/models/`, termasuk path model
// yang disetel khusus (`tunedModels/...`). Encode per segmen supaya `/` tidak
// berubah menjadi `%2F`.
export function geminiModelPath(model) {
  return String(model ?? '').trim().replace(/^models\//i, '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

// Model Flash 2.5/3 memakai token "thought" yang dibayar dari maxOutputTokens
// tetapi tidak dikembalikan pada `content.parts`. Menonaktifkan thinking untuk
// model yang mengizinkan budget 0 membuat jawaban deterministik dan tidak
// pernah kosong. Pro tidak mengizinkan budget 0 sehingga dibiarkan apa adanya.
export function geminiDisableThinking(model) {
  const override = process.env.GEMINI_DISABLE_THINKING;
  if (override === 'false') return false;
  const name = String(model ?? '').toLowerCase();
  if (override === 'true') return !/gemini-[\d.]*-?pro/.test(name);
  return /(^|\/)gemini-[\d.]+-flash($|-lite)/.test(name) || /(^|\/)gemini-flash($|-lite)/.test(name);
}

export function buildGeminiBody(messages, { model, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS } = {}) {
  const system = messages.filter((m) => m.role === 'system').map((m) => String(m.content ?? '')).join('\n\n').trim();
  const contents = messages
    .filter((m) => m.role !== 'system' && String(m.content ?? '').trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));
  const body = { contents, generationConfig: { temperature: 0.4, maxOutputTokens } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (geminiDisableThinking(model)) body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  return body;
}

// Parsing respons Gemini. Bagian `thought: true` dibuang: itu bukan jawaban.
export function parseGeminiResponse(data) {
  const candidate = data?.candidates?.[0];
  if (candidate) {
    const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .filter((part) => part && typeof part.text === 'string' && part.thought !== true)
      .map((part) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  const blockReason = data?.promptFeedback?.blockReason;
  const finishReason = candidate?.finishReason;
  const reason = blockReason ? `blocked:${blockReason}` : finishReason ? `finish:${finishReason}` : 'empty_candidate';
  throw new AiProviderError(
    blockReason ? AI_ERROR_CODES.INVALID_REQUEST : AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
    { reason },
  );
}

// --- OpenAI-compatible ----------------------------------------------------

export function buildOpenAiBody(messages, { model, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS } = {}) {
  return {
    model,
    messages: messages.map((m) => ({ role: m.role, content: String(m.content ?? '') })),
    temperature: 0.4,
    max_tokens: maxOutputTokens,
    stream: false,
  };
}

export function parseOpenAiResponse(data) {
  const message = data?.choices?.[0]?.message?.content;
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { reason: 'empty_choice' });
  return text;
}

// --- HTTP -----------------------------------------------------------------

async function readProviderError(response, hint, context) {
  let bodyText = '';
  try { bodyText = (await response.text()).slice(0, 2000); } catch { bodyText = ''; }
  const code = classifyProviderError({ status: response.status, providerText: bodyText, hint });
  throw new AiProviderError(code, { status: response.status, ...context });
}

/**
 * Memanggil provider AI dan mengembalikan teks jawaban.
 *
 * Kredensial selalu dikirim melalui header autentikasi resmi (Gemini memakai
 * `x-goog-api-key`, OpenAI-compatible memakai `Authorization: Bearer`), bukan
 * query string, agar API key tidak pernah muncul di URL/log akses.
 *
 * Galat yang dilempar SELALU berupa AiProviderError terklasifikasi; pesan
 * mentah provider tidak pernah diteruskan ke pemanggil.
 */
export async function callAiProvider(config, messages, { timeoutMs = 25000, testOnly = false, skipDnsCheck = false, maxOutputTokens } = {}) {
  if (!config?.apiKey) throw new AiProviderError(AI_ERROR_CODES.CREDENTIAL_MISSING, { provider: config?.provider, model: config?.model });

  let endpoint;
  try {
    endpoint = validateEndpoint(config.endpoint, { allowGeminiDefault: config.provider === 'gemini' });
  } catch (error) {
    throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: config.provider, model: config.model, cause: error });
  }
  if (!endpoint) throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: config.provider, model: config.model });

  if (!skipDnsCheck) {
    try {
      await resolveHostnameSafely(new URL(endpoint).hostname);
    } catch (error) {
      throw new AiProviderError(AI_ERROR_CODES.INVALID_ENDPOINT, { provider: config.provider, model: config.model, cause: error });
    }
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  const budget = Number.isFinite(maxOutputTokens) ? maxOutputTokens : (testOnly ? TEST_MAX_OUTPUT_TOKENS : DEFAULT_MAX_OUTPUT_TOKENS);
  const hint = config.provider === 'gemini' ? 'google' : 'openai';

  let response;
  try {
    if (config.provider === 'gemini') {
      response = await fetch(`${endpoint}/${geminiModelPath(config.model)}:generateContent`, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
        redirect: 'error',
        body: JSON.stringify(buildGeminiBody(messages, { model: config.model, maxOutputTokens: budget })),
      });
    } else {
      response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        redirect: 'error',
        body: JSON.stringify(buildOpenAiBody(messages, { model: config.model, maxOutputTokens: budget })),
      });
    }
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || /timeout|aborted/i.test(error?.message || '');
    const code = timedOut ? AI_ERROR_CODES.PROVIDER_TIMEOUT : AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    logProviderEvent('warn', 'ai_provider_request_failed', { provider: config.provider, model: config.model, code, requestId, ms: Date.now() - startedAt });
    throw new AiProviderError(code, { provider: config.provider, model: config.model, requestId, cause: error });
  }

  if (!response.ok) {
    // readProviderError selalu melempar AiProviderError terklasifikasi.
    await readProviderError(response, hint, { provider: config.provider, model: config.model, requestId });
    throw new AiProviderError(AI_ERROR_CODES.PROVIDER_UNAVAILABLE, { status: response.status, provider: config.provider, model: config.model, requestId });
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    logProviderEvent('warn', 'ai_provider_parse_failed', { provider: config.provider, model: config.model, status: response.status, code: AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, requestId, ms: Date.now() - startedAt });
    throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { provider: config.provider, model: config.model, status: response.status, requestId, cause: error });
  }

  let text;
  try {
    text = config.provider === 'gemini' ? parseGeminiResponse(data) : parseOpenAiResponse(data);
  } catch (error) {
    const code = error instanceof AiProviderError ? error.code : AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE;
    logProviderEvent('warn', 'ai_provider_empty_response', { provider: config.provider, model: config.model, status: response.status, code, requestId, ms: Date.now() - startedAt });
    if (error instanceof AiProviderError) { error.provider = config.provider; error.model = config.model; error.requestId = requestId; throw error; }
    throw new AiProviderError(code, { provider: config.provider, model: config.model, requestId, cause: error });
  }

  return text;
}

export const geminiDefaultEndpoint = GEMINI_DEFAULT_ENDPOINT;
