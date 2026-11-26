import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_PROVIDER_IDS, getAiProvider, listAiProviders } from '../src/services/aiProviderRegistry.js';
import { buildAnthropicBody, parseAnthropicResponse } from '../src/services/aiProviders/anthropic.js';
import { buildOpenAiBody, parseOpenAiResponse } from '../src/services/aiProviders/openaiCompatible.js';

test('registry memuat semua provider resmi tanpa rantai if/else', () => {
  assert.deepEqual(AI_PROVIDER_IDS, ['openai', 'gemini', 'anthropic', 'deepseek', 'openrouter', 'groq', 'qwen', 'custom-openai']);
  for (const id of AI_PROVIDER_IDS) {
    const adapter = getAiProvider(id);
    assert.equal(adapter.id, id);
    assert.equal(typeof adapter.validateConfig, 'function');
    assert.equal(typeof adapter.generateResponse, 'function');
    assert.equal(typeof adapter.verifyApiKey, 'function');
    assert.equal(typeof adapter.listModels, 'function');
    assert.equal(typeof adapter.testConnection, 'function');
    assert.equal(typeof adapter.normalizeError, 'function');
    assert.equal(typeof adapter.parseResponse, 'function');
  }
  assert.equal(getAiProvider('not-allowed'), null);
  assert.equal(getAiProvider('google-gemini').id, 'gemini');
  assert.equal(listAiProviders().length, 8);
});

test('adapter OpenAI-compatible normalisasi request dan respons', () => {
  const body = buildOpenAiBody([{ role: 'system', content: 'sistem' }, { role: 'assistant', content: 'jawab' }], { model: 'deepseek-chat', maxOutputTokens: 128 });
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.max_tokens, 128);
  assert.equal(parseOpenAiResponse({ choices: [{ message: { content: 'ok' } }] }), 'ok');
  assert.equal(parseOpenAiResponse({ choices: [{ message: { content: [{ type: 'text', text: 'ok' }] } }] }), 'ok');
});

test('adapter OpenAI memakai max_completion_tokens untuk model reasoning', () => {
  const reasoning = buildOpenAiBody([{ role: 'user', content: 'hai' }], { model: 'gpt-5-mini', maxOutputTokens: 128, reasoningParams: true });
  assert.equal(reasoning.max_tokens, undefined);
  assert.equal(reasoning.temperature, undefined);
  assert.ok(reasoning.max_completion_tokens >= 128);
  const chat = buildOpenAiBody([{ role: 'user', content: 'hai' }], { model: 'gpt-4o-mini', maxOutputTokens: 128, reasoningParams: true });
  assert.equal(chat.max_tokens, 128);
});

test('adapter Anthropic memakai Messages API headers dan body', () => {
  const body = buildAnthropicBody([{ role: 'system', content: 'sistem' }, { role: 'user', content: 'halo' }], { model: 'claude-3-5-haiku-latest', maxOutputTokens: 64 });
  assert.equal(body.system, 'sistem');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'halo' }]);
  assert.equal(body.max_tokens, 64);
  assert.equal(parseAnthropicResponse({ content: [{ type: 'text', text: 'jawaban' }] }), 'jawaban');
});
