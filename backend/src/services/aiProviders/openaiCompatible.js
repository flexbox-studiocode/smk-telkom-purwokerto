// Adapter OpenAI Chat Completions. Digunakan oleh OpenAI, DeepSeek, Qwen, dan
// Custom OpenAI-compatible; perbedaan provider hanya default endpoint/label.
import { defineAdapter, DEFAULT_MAX_OUTPUT_TOKENS, joinEndpoint } from '../aiProviderShared.js';
import { AiProviderError, AI_ERROR_CODES } from '../aiErrors.js';

// Model reasoning OpenAI (o1/o3/o4/gpt-5*) menolak max_tokens dan temperature
// selain default; parameter yang benar adalah max_completion_tokens.
export const isOpenAiReasoningModel = (model) => /^(o\d|gpt-5)/i.test(String(model ?? ''));

export function buildOpenAiBody(messages, { model, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS, reasoningParams = false } = {}) {
  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: String(m.content ?? '') })),
    stream: false,
  };
  if (reasoningParams && isOpenAiReasoningModel(model)) {
    // Token reasoning ikut memakai budget; effort rendah menjaga jawaban terisi.
    // ponytail: effort tetap 'low'; jadikan pengaturan bila admin butuh kualitas lebih.
    body.max_completion_tokens = Math.max(maxOutputTokens, 2048);
    body.reasoning_effort = 'low';
  } else {
    body.temperature = 0.4;
    body.max_tokens = maxOutputTokens;
  }
  return body;
}

export function parseOpenAiResponse(data) {
  const content = data?.choices?.[0]?.message?.content;
  // Beberapa endpoint compatible mengembalikan content array ala Responses API.
  const text = Array.isArray(content)
    ? content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('').trim()
    : typeof content === 'string' ? content.trim() : '';
  const finish = data?.choices?.[0]?.finish_reason;
  if (!text) throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { reason: finish ? `finish:${finish}` : 'empty_choice' });
  return text;
}

export function createOpenAiCompatibleAdapter({ id, label, defaultEndpoint = null, requiresEndpoint = !defaultEndpoint, reasoningParams = false, extraHeaders = {} }) {
  return defineAdapter({
    id,
    label,
    hint: 'openai',
    requiresEndpoint,
    defaultEndpoint,
    supportsModelList: true,
    buildChatRequest(config, messages, { maxOutputTokens }) {
      return {
        url: joinEndpoint(config.endpoint, '/chat/completions'),
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}`, ...extraHeaders },
        body: buildOpenAiBody(messages, { model: config.model, maxOutputTokens, reasoningParams }),
      };
    },
    parseChatResponse: parseOpenAiResponse,
    buildModelsRequest(config) {
      return { url: joinEndpoint(config.endpoint, '/models'), method: 'GET', headers: { authorization: `Bearer ${config.apiKey}` } };
    },
    parseModelsResponse(data) {
      return (data?.data ?? []).map((m) => ({ id: m.id, label: m.id }));
    },
  });
}

export const openAiAdapter = createOpenAiCompatibleAdapter({
  id: 'openai',
  label: 'OpenAI',
  defaultEndpoint: 'https://api.openai.com/v1',
  reasoningParams: true,
});

export const openRouterAdapter = createOpenAiCompatibleAdapter({
  id: 'openrouter',
  label: 'OpenRouter',
  defaultEndpoint: 'https://openrouter.ai/api/v1',
  // Header atribusi opsional yang direkomendasikan OpenRouter.
  extraHeaders: { 'x-title': 'SMK Telkom Purwokerto' },
});

export const groqAdapter = createOpenAiCompatibleAdapter({
  id: 'groq',
  label: 'Groq',
  defaultEndpoint: 'https://api.groq.com/openai/v1',
});

export const deepseekAdapter = createOpenAiCompatibleAdapter({
  id: 'deepseek',
  label: 'DeepSeek',
  defaultEndpoint: 'https://api.deepseek.com',
});

export const qwenAdapter = createOpenAiCompatibleAdapter({
  id: 'qwen',
  label: 'Qwen (Alibaba DashScope)',
  defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const customOpenAiAdapter = createOpenAiCompatibleAdapter({
  id: 'custom-openai',
  label: 'Custom OpenAI-compatible',
  requiresEndpoint: true,
});
