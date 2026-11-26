import crypto from 'node:crypto';

const VERSION = 'aes-256-gcm-v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey() {
  const raw = process.env.AI_CONFIG_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('AI_CONFIG_ENCRYPTION_KEY belum dikonfigurasi.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('AI_CONFIG_ENCRYPTION_KEY harus berupa base64 dari 32 byte.');
  return key;
}

export function encryptAiApiKey(secret) {
  if (typeof secret !== 'string' || !secret.trim()) return null;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptAiApiKey(payload) {
  if (!payload) return null;
  const [version, ivText, tagText, dataText] = String(payload).split('.');
  if (version !== VERSION || !ivText || !tagText || !dataText) throw new Error('Format konfigurasi AI tidak valid.');
  const iv = Buffer.from(ivText, 'base64url');
  const tag = Buffer.from(tagText, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error('Metadata enkripsi AI tidak valid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64url')), decipher.final()]).toString('utf8');
}

export const AI_CONFIG_ENCRYPTION_VERSION = VERSION;
export const validateAiEncryptionKey = () => { encryptionKey(); return true; };
