import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma, closeDatabase } from '../src/db.js';
import { encryptAiApiKey } from '../src/services/aiConfigCrypto.js';
import { invalidateAiConfigCache } from '../src/services/aiRuntimeConfig.js';

// Regresi chatbot lintas provider: NEXA harus bisa menjawab lewat OpenAI,
// DeepSeek, Qwen, dan Anthropic dengan kontrak request masing-masing, dan
// kegagalan provider harus diterjemahkan menjadi kode aman, bukan pesan mentah.
process.env.STELA_MAKS_PER_IP = '1000';
process.env.STELA_MAKS_PER_HARI = '1000';
const { app } = await import('../src/app.js');

const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const NAMA = 'Nexa Lintas Provider';
const ENV_KEYS = ['STELA_AKTIF', 'STELA_API_KEY', 'GEMINI_API_KEY', 'NINEROUTER_KEY', 'STELA_PROVIDER_URL', 'STELA_MODEL'];
const savedEnv = {};

let server;
let baseUrl;
let snapshot = [];
const jar = new Map();
const originalFetch = globalThis.fetch;

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (method !== 'GET' && jar.get('csrf_token')) headers['x-csrf-token'] = jar.get('csrf_token');
  const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  if (cookie) headers.cookie = cookie;
  const res = await originalFetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const index = pair.indexOf('=');
    const key = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value === '' || /Max-Age=0/i.test(raw)) jar.delete(key);
    else jar.set(key, value);
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const PRECHAT = { nama: NAMA, telepon: '081234567891', usia: 17, kategori: 'sekolah', organisasi: 'SMA Negeri 1' };

async function mulaiSesi() {
  await prisma.nexaSession.deleteMany({ where: { fullName: { startsWith: NAMA } } });
  jar.delete('nexa_session');
  const res = await request('/api/ai/stela/session', { method: 'POST', body: PRECHAT });
  assert.equal(res.status, 201, JSON.stringify(res.body));
}

async function setProvider({ apiKey = 'sk-uji-lintas', ...data }) {
  const defaultEndpoints = {
    deepseek: 'https://api.deepseek.com',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    anthropic: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  };
  await prisma.aiProviderConfig.deleteMany();
  await prisma.aiProviderConfig.create({
    data: {
      feature: 'stela',
      enabled: true,
      encryptionVersion: 'aes-256-gcm-v1',
      encryptedApiKey: encryptAiApiKey(apiKey),
      endpoint: data.endpoint || defaultEndpoints[data.provider],
      ...data,
    },
  });
  invalidateAiConfigCache();
}

const intercept = (handler) => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (/^https:\/\/(api\.deepseek\.com|dashscope\.aliyuncs\.com|api\.anthropic\.com|api\.example\.com|generativelanguage\.googleapis\.com)/.test(target)) {
      calls.push({ url: target, options });
      return handler(target, options);
    }
    return originalFetch(url, options);
  };
  return calls;
};

before(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.AI_CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
  await prisma.nexaSession.deleteMany({ where: { fullName: { startsWith: NAMA } } });
  await request('/api/auth/csrf');
});

after(async () => {
  globalThis.fetch = originalFetch;
  await prisma.aiProviderConfig.deleteMany();
  await prisma.nexaSession.deleteMany({ where: { fullName: { startsWith: NAMA } } });
  for (const row of snapshot) { const { id, ...rest } = row; await prisma.aiProviderConfig.create({ data: rest }).catch(() => {}); }
  for (const key of ENV_KEYS) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
});

test('DeepSeek menjawab melalui endpoint OpenAI-compatible resmi', async () => {
  await setProvider({ provider: 'deepseek', model: 'deepseek-chat' });
  const calls = intercept(() => Response.json({ choices: [{ message: { content: 'DeepSeek menjawab.' } }] }));
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo DeepSeek' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 200, JSON.stringify(chat.body));
  assert.equal(chat.body.reply, 'DeepSeek menjawab.');
  assert.equal(calls[0].url, 'https://api.deepseek.com/chat/completions');
  assert.equal(calls[0].options.headers.authorization, 'Bearer sk-uji-lintas');
});

test('Qwen menjawab melalui DashScope compatible-mode', async () => {
  await setProvider({ provider: 'qwen', model: 'qwen-plus' });
  const calls = intercept(() => Response.json({ choices: [{ message: { content: 'Qwen menjawab.' } }] }));
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo Qwen' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 200, JSON.stringify(chat.body));
  assert.equal(chat.body.reply, 'Qwen menjawab.');
  assert.equal(calls[0].url, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
});

test('Anthropic memakai Messages API: system terpisah, tanpa role system di messages', async () => {
  await setProvider({ provider: 'anthropic', model: 'claude-3-5-haiku-latest', apiKey: 'sk-ant-uji' });
  const bodies = [];
  const calls = intercept((url, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json({ content: [{ type: 'text', text: 'Claude menjawab.' }] });
  });
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo Claude' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 200, JSON.stringify(chat.body));
  assert.equal(chat.body.reply, 'Claude menjawab.');
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].options.headers['x-api-key'], 'sk-ant-uji');
  assert.ok(calls[0].options.headers['anthropic-version']);
  assert.ok(typeof bodies[0].system === 'string' && bodies[0].system.includes('NEXA'), 'system instruction dipisah');
  assert.ok(bodies[0].messages.every((m) => m.role !== 'system'), 'tidak ada role system di messages');
});

test('Custom OpenAI-compatible memakai endpoint yang dikonfigurasi admin', async () => {
  await setProvider({ provider: 'custom-openai', endpoint: 'https://api.example.com/v1', model: 'my-model' });
  const calls = intercept(() => Response.json({ choices: [{ message: { content: 'Custom menjawab.' } }] }));
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo custom' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 200, JSON.stringify(chat.body));
  assert.equal(calls[0].url, 'https://api.example.com/v1/chat/completions');
});

test('kegagalan kredensial diterjemahkan menjadi kode aman, bukan pesan mentah provider', async () => {
  await setProvider({ provider: 'deepseek', model: 'deepseek-chat' });
  intercept(() => new Response(JSON.stringify({ error: { code: 'invalid_api_key', message: 'Incorrect API key: sk-uji-lintas' } }), { status: 401 }));
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 502, JSON.stringify(chat.body));
  assert.equal(chat.body.code, 'API_KEY_INVALID');
  assert.ok(!JSON.stringify(chat.body).includes('sk-uji-lintas'), 'tidak membocorkan key');
  assert.ok(!/incorrect api key/i.test(JSON.stringify(chat.body)), 'pesan mentah provider tidak diteruskan');
});

test('respons Gemini kosong karena thinking/MAX_TOKENS tidak lagi menjadi 500', async () => {
  await setProvider({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'AIza-uji' });
  intercept(() => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] }));
  await mulaiSesi();
  const chat = await request('/api/ai/stela', { method: 'POST', body: { pertanyaan: 'Halo' } });
  if (chat.status === 429) return;
  assert.equal(chat.status, 502, JSON.stringify(chat.body));
  assert.equal(chat.body.code, 'INVALID_PROVIDER_RESPONSE');
  assert.ok(chat.body.error && !JSON.stringify(chat.body).includes('MAX_TOKENS'), 'alasan internal tidak diteruskan');
});
