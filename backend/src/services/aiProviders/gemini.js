// Adapter untuk Google Gemini.
//
// Gemini menggunakan header x-goog-api-key (bukan query string) dan endpoint
// https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent.
// Model Flash 2.5/3 memakai token "thought" dari budget maxOutputTokens tetapi
// tidak dikembalikan dalam content.parts; menonaktifkan thinking menjaga
// jawaban tetap terisi.
import { defineAdapter, DEFAULT_MAX_OUTPUT_TOKENS, GEMINI_DEFAULT_ENDPOINT } from '../aiProviderShared.js';
import { AiProviderError, AI_ERROR_CODES } from '../aiErrors.js';

// Gemini menerima id model apa adanya setelah `/models/`, termasuk path model
// yang disetel khusus (`tunedModels/...`). Encode per segmen supaya `/` tidak
// berubah menjadi `%2F`.
export const geminiModelPath = (model) =>
  String(model ?? '').trim().replace(/^models\//i, '').split('/').filter(Boolean).map(encodeURIComponent).join('/');

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

export const geminiAdapter = defineAdapter({
  id: 'gemini',
  label: 'Google Gemini',
  hint: 'google',
  requiresEndpoint: false,
  defaultEndpoint: GEMINI_DEFAULT_ENDPOINT,
  supportsModelList: true,
  buildChatRequest(config, messages, { maxOutputTokens }) {
    return {
      url: `${config.endpoint}/${geminiModelPath(config.model)}:generateContent`,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: buildGeminiBody(messages, { model: config.model, maxOutputTokens }),
    };
  },
  parseChatResponse: parseGeminiResponse,
  buildModelsRequest(config) {
    const url = new URL(config.endpoint);
    url.searchParams.set('pageSize', '1000');
    return { url: url.toString(), method: 'GET', headers: { 'x-goog-api-key': config.apiKey } };
  },
  parseModelsResponse(data) {
    // Hanya model yang mendukung generateContent (chat/teks).
    return (data?.models ?? [])
      .filter((m) => !Array.isArray(m.supportedGenerationMethods) || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => ({
      id: String(m.name ?? '').replace(/^models\//i, ''),
      label: m.displayName || undefined,
    }));
  },
});

export default geminiAdapter;
