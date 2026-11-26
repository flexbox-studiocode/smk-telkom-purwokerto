// Adapter Anthropic Messages API.
import { defineAdapter, DEFAULT_MAX_OUTPUT_TOKENS, joinEndpoint } from '../aiProviderShared.js';
import { AiProviderError, AI_ERROR_CODES } from '../aiErrors.js';

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export function buildAnthropicBody(messages, { model, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS } = {}) {
  const system = messages.filter((m) => m.role === 'system').map((m) => String(m.content ?? '')).join('\n\n').trim();
  const body = {
    model,
    max_tokens: maxOutputTokens,
    messages: messages
      .filter((m) => m.role !== 'system' && String(m.content ?? '').trim())
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })),
  };
  if (system) body.system = system;
  return body;
}

export function parseAnthropicResponse(data) {
  const text = (data?.content ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new AiProviderError(AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE, { reason: 'empty_content' });
  return text;
}

export const anthropicAdapter = defineAdapter({
  id: 'anthropic',
  label: 'Anthropic',
  hint: 'anthropic',
  requiresEndpoint: false,
  defaultEndpoint: DEFAULT_ENDPOINT,
  // Anthropic models endpoint is not universally available for every account,
  // so discovery is explicitly unsupported; verification uses cheap generation.
  supportsModelList: false,
  buildChatRequest(config, messages, { maxOutputTokens }) {
    return {
      url: joinEndpoint(config.endpoint, '/messages'),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: buildAnthropicBody(messages, { model: config.model, maxOutputTokens }),
    };
  },
  parseChatResponse: parseAnthropicResponse,
});

export default anthropicAdapter;
