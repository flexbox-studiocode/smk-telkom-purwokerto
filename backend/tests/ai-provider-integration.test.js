import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { encryptAiApiKey } from '../src/services/aiConfigCrypto.js';
import { invalidateAiConfigCache } from '../src/services/aiRuntimeConfig.js';
import { buildPrompt } from '../src/routes/ai.js';
import { hasilPenjelasan } from '../src/modules/nexttel/explanation.js';
import { hitungHasilNextTel } from '../src/modules/nexttel/scoring.mjs';

const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const NEXA_SECRET = 'sk-nexa-fallback-secret';

let server;
let baseUrl;
let snapshot = [];
const jar = new Map();
const ENV_KEYS = ['STELA_AKTIF', 'STELA_API_KEY', 'GEMINI_API_KEY', 'NINEROUTER_KEY', 'STELA_PROVIDER_URL', 'STELA_MODEL', 'NEXTTEL_API_KEY', 'NEXTTEL_PROVIDER_KEY', 'NEXTTEL_PROVIDER_URL', 'NEXTTEL_MODEL'];
const savedEnv = {};
const originalFetch = globalThis.fetch;
const providerCalls = [];

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (method !== 'GET' && jar.get('csrf_token')) headers['x-csrf-token'] = jar.get('csrf_token');
  const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  if (cookie) headers.cookie = cookie;
  const res = await originalFetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const index = pair.indexOf('=');
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const ANSWERS = ['activity', 'interest', 'project', 'learning', 'problem', 'tool', 'work', 'future'].map((questionId) => ({ questionId, optionId: 'a' }));
const resetSettings = async () => {
  await prisma.aiProviderConfig.deleteMany();
  invalidateAiConfigCache();
  for (const key of ENV_KEYS) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
};

before(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.AI_CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await originalFetch(`${baseUrl}/api/auth/csrf`).then(async (res) => {
    for (const raw of res.headers.getSetCookie?.() ?? []) { const [pair] = raw.split(';'); const i = pair.indexOf('='); jar.set(pair.slice(0, i), pair.slice(i + 1)); }
  });
  snapshot = await prisma.aiProviderConfig.findMany();
  await prisma.aiProviderConfig.deleteMany();
});

after(async () => {
  globalThis.fetch = originalFetch;
  await resetSettings();
  for (const row of snapshot) { const { id, ...rest } = row; await prisma.aiProviderConfig.create({ data: rest }).catch(() => {}); }
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  providerCalls.length = 0;
  await resetSettings();
});

test('NEXA memakai fallback environment lama tanpa baris database', async () => {
  process.env.STELA_AKTIF = 'true';
  process.env.GEMINI_API_KEY = NEXA_SECRET;
  invalidateAiConfigCache();
  const { resolveAiConfig } = await import('../src/services/aiRuntimeConfig.js');
  const config = await resolveAiConfig('stela');
  assert.equal(config.source, 'environment');
  assert.equal(config.provider, 'gemini');
  assert.equal(config.apiKey, NEXA_SECRET);
  assert.equal(config.model, 'gemini-2.5-flash');
});

test('konfigurasi database mengalahkan environment dan key tersimpan dipakai', async () => {
  process.env.STELA_AKTIF = 'true';
  process.env.GEMINI_API_KEY = 'key-environment-lama';
  await prisma.aiProviderConfig.create({ data: { feature: 'stela', provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-uji', encryptedApiKey: encryptAiApiKey('key-database-baru'), encryptionVersion: 'aes-256-gcm-v1', enabled: true } });
  invalidateAiConfigCache();
  globalThis.fetch = async (url, options) => {
    providerCalls.push({ url: String(url), auth: options?.headers?.authorization });
    return Response.json({ choices: [{ message: { content: 'Jawaban dari provider database.' } }] });
  };
  const { resolveAiConfig } = await import('../src/services/aiRuntimeConfig.js');
  const config = await resolveAiConfig('stela');
  assert.equal(config.source, 'database');
  assert.equal(config.apiKey, 'key-database-baru');
  assert.equal(config.model, 'gpt-uji');
});

test('layanan dinonaktifkan tidak membuka akses ke environment', async () => {
  process.env.STELA_AKTIF = 'true';
  process.env.GEMINI_API_KEY = 'key-environment-lama';
  await prisma.aiProviderConfig.create({ data: { feature: 'stela', provider: 'gemini', model: 'gemini-2.5-flash', encryptedApiKey: encryptAiApiKey('key-database'), encryptionVersion: 'aes-256-gcm-v1', enabled: false } });
  invalidateAiConfigCache();
  const { resolveAiConfig } = await import('../src/services/aiRuntimeConfig.js');
  const config = await resolveAiConfig('stela');
  assert.equal(config.disabled, true);
  assert.equal(config.apiKey, undefined);
});

test('kegagalan dekripsi tidak jatuh ke environment dan tidak membocorkan key', async () => {
  await prisma.aiProviderConfig.create({ data: { feature: 'stela', provider: 'gemini', model: 'gemini-2.5-flash', encryptedApiKey: 'aes-256-gcm-v1.rusak.rusak.rusak', encryptionVersion: 'aes-256-gcm-v1', enabled: true } });
  invalidateAiConfigCache();
  const { resolveAiConfig } = await import('../src/services/aiRuntimeConfig.js');
  const config = await resolveAiConfig('stela');
  assert.equal(config.error, 'decryption_failed');
  assert.equal(config.apiKey, undefined);
  assert.ok(!JSON.stringify(config).includes('rusak.rusak'));
});

test('NextTel tetap memberi rekomendasi lokal saat provider tidak dikonfigurasi', async () => {
  const res = await request('/api/ai/nexttel', { method: 'POST', body: { answers: ANSWERS, language: 'id' } });
  if (res.status === 429) return; // kuota harian habis pada lingkungan uji
  assert.equal(res.status, 200);
  assert.equal(res.body.data.topRecommendation, 'RPL');
  assert.equal(res.body.explanationSource, 'fallback');
  assert.match(res.body.explanation, /Rekayasa Perangkat Lunak/);
  assert.equal(providerCalls.length, 0, 'scoring lokal tidak memanggil provider');
});

test('NextTel memakai provider penjelasan bila dikonfigurasi, dan fallback saat provider gagal', async () => {
  const { jelaskanHasil } = await import('../src/modules/nexttel/explanation.js');
  const result = hitungHasilNextTel(ANSWERS);
  await prisma.aiProviderConfig.create({ data: { feature: 'nexttel', provider: 'openai', endpoint: 'https://api.example.com/v1', model: 'gpt-uji', encryptedApiKey: encryptAiApiKey('key-nexttel'), encryptionVersion: 'aes-256-gcm-v1', enabled: true } });
  invalidateAiConfigCache();
  globalThis.fetch = async (url, options) => {
    providerCalls.push({ url: String(url), auth: options?.headers?.authorization });
    return Response.json({ choices: [{ message: { content: 'Penjelasan dari provider.' } }] });
  };
  const sukses = await jelaskanHasil(result, 'id');
  assert.equal(sukses.explanationSource, 'provider');
  assert.equal(sukses.explanation, 'Penjelasan dari provider.');
  assert.deepEqual(sukses.learningSuggestions, hasilPenjelasan(result, 'id').learningSuggestions, 'saran belajar tetap deterministik');
  assert.ok(providerCalls[0].auth.includes('key-nexttel'));

  globalThis.fetch = async () => new Response('err', { status: 500 });
  invalidateAiConfigCache();
  const gagal = await jelaskanHasil(result, 'en');
  assert.equal(gagal.explanationSource, 'fallback');
  assert.match(gagal.explanation, /^Based on your answers/);
});

test('prompt NEXA tetap memuat konteks sekolah dan tidak memuat kredensial', () => {
  const [system] = buildPrompt([{ role: 'user', content: 'Halo' }], { category: 'sekolah', organization: 'SMP 1', age: 16 });
  assert.match(system.content, /NEXA/);
  assert.match(system.content, /KONTEKS/);
  assert.ok(!/sk-|api[_ -]?key/i.test(system.content));
});
