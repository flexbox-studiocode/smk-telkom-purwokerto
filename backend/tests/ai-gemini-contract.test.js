import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  callAiProvider,
  buildGeminiBody,
  geminiModelPath,
  geminiDisableThinking,
  parseGeminiResponse,
} from '../src/services/aiProvider.js';
import { AiProviderError, AI_ERROR_CODES, classifyProviderError } from '../src/services/aiErrors.js';

// Regresi akar masalah NEXA: provider Gemini sudah dikonfigurasi tetapi chat
// selalu gagal. Uji di bawah mengunci KONTRAK REQUEST Gemini (bukan hanya
// membungkam fetch), sehingga bentuk request yang salah akan langsung gagal.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SECRET = 'AIza-test-secret-should-never-leak';
const originalFetch = globalThis.fetch;

const config = (over = {}) => ({ provider: 'gemini', endpoint: ENDPOINT, model: 'gemini-2.5-flash', apiKey: SECRET, ...over });

const captureFetch = (responder) => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return responder(String(url), options);
  };
  return calls;
};

afterEach(() => { globalThis.fetch = originalFetch; });

test('Gemini: endpoint generateContent tepat satu /models tanpa duplikasi', async () => {
  const calls = captureFetch(() => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  await callAiProvider(config(), [{ role: 'user', content: 'Halo' }], { skipDnsCheck: true });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    'URL harus {endpoint}/{model}:generateContent tanpa /models ganda',
  );
  assert.ok(!calls[0].url.includes('?key='), 'API key tidak boleh berada di query string');
  assert.ok(!calls[0].url.includes(SECRET), 'API key tidak boleh muncul di URL');
});

test('Gemini: API key dikirim lewat header x-goog-api-key', async () => {
  const calls = captureFetch(() => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  await callAiProvider(config(), [{ role: 'user', content: 'Halo' }], { skipDnsCheck: true });
  assert.equal(calls[0].options.headers['x-goog-api-key'], SECRET);
  assert.equal(calls[0].options.headers.authorization, undefined, 'Gemini tidak memakai Bearer');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.redirect, 'error', 'redirect harus ditolak (SSRF)');
});

test('Gemini: model boleh memakai prefix models/ dan tidak di-encode menjadi %2F', async () => {
  assert.equal(geminiModelPath('gemini-2.5-flash'), 'gemini-2.5-flash');
  assert.equal(geminiModelPath('models/gemini-2.5-flash'), 'gemini-2.5-flash');
  assert.equal(geminiModelPath('tunedModels/abc123'), 'tunedModels/abc123');
  const calls = captureFetch(() => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  await callAiProvider(config({ model: 'models/gemini-2.5-flash' }), [{ role: 'user', content: 'x' }], { skipDnsCheck: true });
  assert.ok(calls[0].url.endsWith('/models/gemini-2.5-flash:generateContent'));
});

test('Gemini: systemInstruction, role model, dan thinkingBudget diatur benar', () => {
  const body = buildGeminiBody(
    [
      { role: 'system', content: 'Anda NEXA.' },
      { role: 'user', content: 'Halo' },
      { role: 'assistant', content: 'Hai' },
      { role: 'user', content: 'Jurusan apa saja?' },
    ],
    { model: 'gemini-2.5-flash', maxOutputTokens: 1024 },
  );
  assert.equal(body.systemInstruction.parts[0].text, 'Anda NEXA.');
  assert.deepEqual(body.contents.map((c) => c.role), ['user', 'model', 'user'], 'assistant harus menjadi role model');
  assert.equal(body.contents.at(-1).parts[0].text, 'Jurusan apa saja?');
  assert.equal(body.generationConfig.maxOutputTokens, 1024);
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingBudget: 0 }, 'model flash harus menonaktifkan thinking');
  assert.ok(!('safetySettings' in body));
});

test('Gemini: model pro tidak diberi thinkingBudget 0 (tidak didukung)', () => {
  assert.equal(geminiDisableThinking('gemini-2.5-flash'), true);
  assert.equal(geminiDisableThinking('gemini-2.5-flash-lite'), true);
  assert.equal(geminiDisableThinking('gemini-2.5-pro'), false);
  assert.equal(geminiDisableThinking('gemini-1.5-pro'), false);
  const body = buildGeminiBody([{ role: 'user', content: 'x' }], { model: 'gemini-2.5-pro' });
  assert.equal(body.generationConfig.thinkingConfig, undefined);
});

test('Gemini 3+: thinking diminimalkan lewat thinkingLevel, bukan thinkingBudget 0', () => {
  const body = (model) => buildGeminiBody([{ role: 'user', content: 'x' }], { model }).generationConfig.thinkingConfig;
  assert.deepEqual(body('gemini-3.5-flash-lite'), { thinkingLevel: 'minimal' });
  assert.deepEqual(body('models/gemini-3.5-flash'), { thinkingLevel: 'minimal' });
  assert.deepEqual(body('gemini-2.5-flash-lite'), { thinkingBudget: 0 });
  assert.equal(body('gemini-3.5-pro'), undefined);
});

test('Gemini: budget output cukup besar agar jawaban tidak kosong', async () => {
  const calls = captureFetch(() => Response.json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  await callAiProvider(config(), [{ role: 'user', content: 'x' }], { skipDnsCheck: true });
  const body = JSON.parse(calls[0].options.body);
  assert.ok(body.generationConfig.maxOutputTokens >= 512, `budget ${body.generationConfig.maxOutputTokens} terlalu kecil`);
});

test('Gemini: bagian thought tidak dianggap jawaban', () => {
  const text = parseGeminiResponse({
    candidates: [{ content: { parts: [{ text: 'berpikir keras', thought: true }, { text: 'Jawaban nyata.' }] } }],
  });
  assert.equal(text, 'Jawaban nyata.');
});

test('Gemini: kandidat kosong terklasifikasi, bukan crash', () => {
  assert.throws(() => parseGeminiResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), (error) => error instanceof AiProviderError && error.code === AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE);
  assert.throws(() => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } }), (error) => error.code === AI_ERROR_CODES.INVALID_REQUEST);
});

test('Gemini: status provider dipetakan ke kode galat yang tepat', async () => {
  const cases = [
    [400, 'API_KEY_INVALID', '{"error":{"code":400,"status":"INVALID_ARGUMENT","message":"API key not valid"}}'],
    [401, 'API_KEY_INVALID', '{"error":{"status":"UNAUTHENTICATED"}}'],
    [403, 'PERMISSION_DENIED', '{"error":{"status":"PERMISSION_DENIED","message":"denied"}}'],
    [404, 'MODEL_NOT_FOUND', '{"error":{"status":"NOT_FOUND","message":"models/gemini-x is not found"}}'],
    [429, 'QUOTA_EXCEEDED', '{"error":{"status":"RESOURCE_EXHAUSTED","message":"You exceeded your current quota"}}'],
    [429, 'RATE_LIMITED', '{"error":{"status":"RESOURCE_EXHAUSTED","message":"Too many requests per minute"}}'],
    [429, 'RATE_LIMITED', '{"error":{"status":"RESOURCE_EXHAUSTED","message":"Too many requests. Slow down."}}'],
    [500, 'PROVIDER_UNAVAILABLE', '{"error":{"status":"INTERNAL"}}'],
    [503, 'PROVIDER_UNAVAILABLE', '{"error":{"status":"UNAVAILABLE"}}'],
  ];
  for (const [status, expected, body] of cases) {
    captureFetch(() => new Response(body, { status }));
    await assert.rejects(
      callAiProvider(config(), [{ role: 'user', content: 'x' }], { skipDnsCheck: true }),
      (error) => error instanceof AiProviderError && error.code === expected,
      `status ${status} harus ${expected}`,
    );
  }
});

test('Gemini: galat provider tidak membocorkan API key pada pesan error', async () => {
  captureFetch(() => new Response(JSON.stringify({ error: { message: `invalid key ${SECRET}` } }), { status: 400 }));
  await assert.rejects(
    callAiProvider(config(), [{ role: 'user', content: 'x' }], { skipDnsCheck: true }),
    (error) => {
      assert.ok(!error.message.includes(SECRET), 'pesan error tidak boleh memuat API key');
      assert.ok(!JSON.stringify(error).includes(SECRET));
      return true;
    },
  );
});

test('Gemini: timeout terklasifikasi PROVIDER_TIMEOUT', async () => {
  globalThis.fetch = async () => { const error = new Error('timed out'); error.name = 'TimeoutError'; throw error; };
  await assert.rejects(
    callAiProvider(config(), [{ role: 'user', content: 'x' }], { skipDnsCheck: true, timeoutMs: 5 }),
    (error) => error.code === AI_ERROR_CODES.PROVIDER_TIMEOUT,
  );
});

test('endpoint internal ditolak sebelum request keluar', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(
    callAiProvider(config({ endpoint: 'https://127.0.0.1/v1/models' }), [{ role: 'user', content: 'x' }], { skipDnsCheck: true }),
    (error) => error.code === AI_ERROR_CODES.INVALID_ENDPOINT,
  );
  assert.equal(called, false, 'tidak boleh ada request keluar ke endpoint privat');
});

test('tanpa API key tidak ada request keluar', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(callAiProvider(config({ apiKey: '' }), [{ role: 'user', content: 'x' }], { skipDnsCheck: true }), (error) => error.code === AI_ERROR_CODES.CREDENTIAL_MISSING);
  assert.equal(called, false);
});

test('classifyProviderError mendukung format OpenAI dan Anthropic', () => {
  assert.equal(classifyProviderError({ status: 401, providerText: '{"error":{"type":"invalid_request_error","code":"invalid_api_key"}}', hint: 'openai' }), 'API_KEY_INVALID');
  assert.equal(classifyProviderError({ status: 429, providerText: '{"error":{"code":"insufficient_quota"}}', hint: 'openai' }), 'QUOTA_EXCEEDED');
  assert.equal(classifyProviderError({ status: 401, providerText: '{"type":"error","error":{"type":"authentication_error"}}', hint: 'anthropic' }), 'API_KEY_INVALID');
  assert.equal(classifyProviderError({ status: 529, providerText: '{"type":"error","error":{"type":"overloaded_error"}}', hint: 'anthropic' }), 'PROVIDER_UNAVAILABLE');
  assert.equal(classifyProviderError({ status: 404, providerText: '{"error":{"type":"not_found_error"}}', hint: 'anthropic' }), 'MODEL_NOT_FOUND');
});
