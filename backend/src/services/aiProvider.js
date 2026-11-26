import dns from 'node:dns/promises';
import net from 'node:net';
import { decryptAiApiKey } from './aiConfigCrypto.js';

const GEMINI_DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROVIDERS = new Set(['gemini', 'openai']);

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

async function safeLookup(hostname) {
  return dns.lookup(hostname, { all: true });
}

// SSRF: resolusi DNS diulang tepat sebelum request agar tidak bergantung pada
// hasil lookup sebelumnya. Private/loopback/link-local ditolak.
export async function resolveHostnameSafely(hostname) {
  const addresses = await safeLookup(hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('Endpoint internal/private tidak diizinkan.');
  return true;
}

export async function callAiProvider(config, messages, { timeoutMs = 10000, testOnly = false, skipDnsCheck = false } = {}) {
  if (!config?.apiKey) throw new Error('API key belum dikonfigurasi.');
  const endpoint = validateEndpoint(config.endpoint, { allowGeminiDefault: config.provider === 'gemini' });
  if (!skipDnsCheck) await resolveHostnameSafely(new URL(endpoint).hostname);
  const signal = AbortSignal.timeout(timeoutMs);
  let response;
  if (config.provider === 'gemini') {
    const contents = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
    response = await fetch(`${endpoint}/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, { method: 'POST', signal, headers: { 'content-type': 'application/json' }, redirect: 'error', body: JSON.stringify({ systemInstruction: { parts: [{ text: messages.find((message) => message.role === 'system')?.content || '' }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: testOnly ? 8 : 800 } }) });
  } else {
    response = await fetch(endpoint, { method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` }, redirect: 'error', body: JSON.stringify({ model: config.model, messages, temperature: 0.4, max_tokens: testOnly ? 8 : 800 }) });
  }
  if (!response.ok) throw new Error(`provider_${response.status}`);
  const data = await response.json();
  const text = config.provider === 'gemini' ? data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('').trim() : data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('provider_empty');
  return text;
}

export const geminiDefaultEndpoint = GEMINI_DEFAULT_ENDPOINT;
