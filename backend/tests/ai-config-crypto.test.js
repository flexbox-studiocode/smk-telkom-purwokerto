import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encryptAiApiKey, decryptAiApiKey, AI_CONFIG_ENCRYPTION_VERSION } from '../src/services/aiConfigCrypto.js';

const KEY = crypto.randomBytes(32).toString('base64');
const SECRET = 'sk-live-rahasia-1234567890';

test('API key tersimpan terenkripsi AES-256-GCM dengan IV acak', () => {
  const previous = process.env.AI_CONFIG_ENCRYPTION_KEY;
  process.env.AI_CONFIG_ENCRYPTION_KEY = KEY;
  try {
    const first = encryptAiApiKey(SECRET);
    const second = encryptAiApiKey(SECRET);
    assert.ok(first.startsWith(`${AI_CONFIG_ENCRYPTION_VERSION}.`), 'ciphertext memuat versi skema');
    assert.ok(!first.includes(SECRET), 'plaintext tidak boleh muncul di ciphertext');
    assert.notEqual(first, second, 'IV acak menghasilkan ciphertext berbeda');
    assert.equal(decryptAiApiKey(first), SECRET);
    assert.equal(decryptAiApiKey(second), SECRET);
  } finally {
    if (previous === undefined) delete process.env.AI_CONFIG_ENCRYPTION_KEY; else process.env.AI_CONFIG_ENCRYPTION_KEY = previous;
  }
});

test('ciphertext yang diubah gagal didekripsi (authentication tag)', () => {
  const previous = process.env.AI_CONFIG_ENCRYPTION_KEY;
  process.env.AI_CONFIG_ENCRYPTION_KEY = KEY;
  try {
    const payload = encryptAiApiKey(SECRET);
    const parts = payload.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2]}.${Buffer.from('ubah-secret').toString('base64url')}`;
    assert.throws(() => decryptAiApiKey(tampered));
  } finally {
    if (previous === undefined) delete process.env.AI_CONFIG_ENCRYPTION_KEY; else process.env.AI_CONFIG_ENCRYPTION_KEY = previous;
  }
});

test('tanpa AI_CONFIG_ENCRYPTION_KEY penyimpanan ditolak, tidak pernah menyimpan plaintext', () => {
  const previous = process.env.AI_CONFIG_ENCRYPTION_KEY;
  delete process.env.AI_CONFIG_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptAiApiKey(SECRET), /AI_CONFIG_ENCRYPTION_KEY/);
  } finally {
    if (previous !== undefined) process.env.AI_CONFIG_ENCRYPTION_KEY = previous;
  }
});

test('key dengan panjang salah ditolak', () => {
  const previous = process.env.AI_CONFIG_ENCRYPTION_KEY;
  process.env.AI_CONFIG_ENCRYPTION_KEY = Buffer.from('terlalu-pendek').toString('base64');
  try {
    assert.throws(() => encryptAiApiKey(SECRET), /32 byte/);
  } finally {
    if (previous === undefined) delete process.env.AI_CONFIG_ENCRYPTION_KEY; else process.env.AI_CONFIG_ENCRYPTION_KEY = previous;
  }
});

test('nilai kosong tidak dienkripsi menjadi ciphertext', () => {
  assert.equal(encryptAiApiKey(''), null);
  assert.equal(decryptAiApiKey(null), null);
});
