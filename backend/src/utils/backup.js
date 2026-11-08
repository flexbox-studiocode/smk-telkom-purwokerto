// Logika murni backup/restore terenkripsi.
// Dipisahkan dari script CLI agar bisa diuji tanpa jaringan/Supabase.
// Format container terenkripsi: "SMKBACK1" (8B) | IV (12B) | ciphertext | GCM tag (16B).
import crypto from 'node:crypto';
import { jakartaDateString } from './date.js';

export const BACKUP_MAGIC = Buffer.from('SMKBACK1');
export const IV_LENGTH = 12;
export const TAG_LENGTH = 16;
export const MIN_ENCRYPTED_SIZE = BACKUP_MAGIC.length + IV_LENGTH + TAG_LENGTH; // 36 byte

// Nama bucket Supabase Storage yang aman (huruf kecil, angka, . _ -).
export function isValidBucketName(name) {
  return typeof name === 'string' && /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(name);
}

export function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Mengurai BACKUP_ENCRYPTION_KEY (base64 32 byte) dan menolak nilai yang salah.
export function parseEncryptionKey(base64) {
  const key = Buffer.from(base64 || '', 'base64');
  if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY harus base64 dari 32 byte (AES-256).');
  return key;
}

// Fingerprint singkat agar manifest dapat mendeteksi key yang salah tanpa menyimpan key.
export function keyFingerprint(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Encryption key harus Buffer 32 byte.');
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function encryptBuffer(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([BACKUP_MAGIC, iv, ciphertext, cipher.getAuthTag()]);
}

export function decryptBuffer(container, key) {
  if (!Buffer.isBuffer(container) || container.length < MIN_ENCRYPTED_SIZE || !container.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error('Format backup tidak dikenal atau file tidak lengkap.');
  }
  const iv = container.subarray(BACKUP_MAGIC.length, BACKUP_MAGIC.length + IV_LENGTH);
  const tag = container.subarray(container.length - TAG_LENGTH);
  const ciphertext = container.subarray(BACKUP_MAGIC.length + IV_LENGTH, container.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Menemukan tanggal backup (YYYY-MM-DD) di dalam path object.
export function backupDateOf(objectPath) {
  const match = String(objectPath).match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// Tanggal cutoff retensi dalam zona Asia/Jakarta (today - retentionDays).
export function cutoffDate(todayStr, retentionDays) {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - retentionDays);
  return jakartaDateString(d);
}

// True hanya jika object punya tanggal backup dan tanggal itu lebih tua dari cutoff.
// Object tanpa tanggal tidak pernah dihapus otomatis (aman secara default).
export function ageExceedsRetention(objectPath, todayStr, retentionDays) {
  const d = backupDateOf(objectPath);
  if (!d) return false;
  return d < cutoffDate(todayStr, retentionDays);
}

// Guard restore: menolak menimpa database produksi tanpa --allow-production + --confirm.
export function assertRestoreTargetAllowed({ targetName, productionName, allowProduction = false, confirm = false }) {
  if (targetName !== productionName) return;
  if (!allowProduction) throw new Error(`Menolak database production "${productionName}". Gunakan --allow-production setelah backup diverifikasi.`);
  if (!confirm) throw new Error('Restore production memerlukan --confirm selain --allow-production.');
}

// Menjalankan operasi jaringan dengan retry + backoff sederhana.
// `shouldRetry(error, attempt)` boleh mengembalikan false untuk error permanen
// (mis. HTTP 404/401) agar tidak diulang sia-sia.
export async function withRetry(fn, { attempts = 3, baseDelayMs = 250, shouldRetry = () => true, onRetry } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) break;
      if (onRetry) onRetry(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
  throw lastError;
}

// Guard path object remote: menolak absolut, traversal, dan segmen kosong.
export function assertSafeRemotePath(remotePath) {
  const normalized = String(remotePath).replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').includes('..') || normalized.split('/').includes('')) {
    throw new Error(`Path object remote tidak aman: ${remotePath}`);
  }
  return normalized;
}
