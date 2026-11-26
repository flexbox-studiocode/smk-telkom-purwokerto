// Adapter OpenAI Chat Completions. Digunakan oleh OpenAI, DeepSeek, Qwen, dan
// Custom OpenAI-compatible; perbedaan provider hanya default endpoint/label.
import { defineAdapter, DEFAULT_MAX_OUTPUT_TOKENS, joinEndpoint } from '../aiProviderShared.js';
import { AiProviderError, AI_ERROR_CODES } from '../aiErrors.js';

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
  const content = data?.choices?.[0]?.message?.content;
  // Beberapa endpoint compatible mengembalikan content array ala Responses API.
  const text = Array.isArray(content)
    ? content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('').trim()
    : typeof content === 'string' ? content.trim() : '';
  if (!text) throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { reason: 'empty_choice' });
  return text;
}

export function createOpenAiCompatibleAdapter({ id, label, defaultEndpoint = null, requiresEndpoint = !defaultEndpoint }) {
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
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: buildOpenAiBody(messages, { model: config.model, maxOutputTokens }),
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
  requiresEndpoint: true,
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
