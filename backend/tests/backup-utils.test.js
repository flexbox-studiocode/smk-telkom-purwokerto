import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  BACKUP_MAGIC, IV_LENGTH, TAG_LENGTH, MIN_ENCRYPTED_SIZE,
  isValidBucketName, sha256Hex, parseEncryptionKey, keyFingerprint as fingerprintKey,
  encryptBuffer, decryptBuffer, backupDateOf, cutoffDate, ageExceedsRetention,
  assertRestoreTargetAllowed, assertSafeRemotePath, withRetry,
} from '../src/utils/backup.js';
import { jakartaDateString } from '../src/utils/date.js';
import { isUnsafeArchiveEntry } from '../scripts/archive-safe.mjs';

test('BACKUP_MAGIC adalah 8 byte SMKBACK1', () => {
  assert.equal(BACKUP_MAGIC.toString('utf8'), 'SMKBACK1');
  assert.equal(BACKUP_MAGIC.length, 8);
});

test('isValidBucketName menerima nama valid dan menolak yang tidak', () => {
  assert.ok(isValidBucketName('mysql-backups'));
  assert.ok(isValidBucketName('a-b.c'));
  assert.ok(!isValidBucketName('x'));
  assert.ok(isValidBucketName('a'.repeat(63)));
  assert.ok(!isValidBucketName('MyBucket'));
  assert.ok(isValidBucketName('mysql_backups'));
  assert.ok(!isValidBucketName('a b'));
  assert.ok(!isValidBucketName('a-b.'));
  assert.ok(!isValidBucketName(''));
  assert.ok(!isValidBucketName('a'.repeat(64)));
});

test('parseEncryptionKey menerima base64 32 byte', () => {
  const key32 = Buffer.alloc(32).fill(0xab);
  const b64 = key32.toString('base64');
  const k = parseEncryptionKey(b64);
  assert.equal(k.length, 32);
  assert.ok(k.equals(key32));
});

test('parseEncryptionKey menolak panjang bukan 32 byte', () => {
  assert.throws(() => parseEncryptionKey(''));
  assert.throws(() => parseEncryptionKey(Buffer.alloc(16).toString('base64')));
  assert.throws(() => parseEncryptionKey(Buffer.alloc(64).toString('base64')));
});

test('fingerprintKey mengembalikan 16 karakter hex', () => {
  const key = Buffer.alloc(32).fill(0x42);
  const fp = fingerprintKey(key);
  assert.equal(fp.length, 16);
  assert.match(fp, /^[0-9a-f]{16}$/);
});

test('fingerprintKey berbeda untuk key berbeda', () => {
  const k1 = Buffer.alloc(32, 0x11);
  const k2 = Buffer.alloc(32, 0x22);
  assert.notEqual(fingerprintKey(k1), fingerprintKey(k2));
});

test('sha256Hex menghasilkan hash hex konsisten', () => {
  const buf = Buffer.from('hello');
  const h = sha256Hex(buf);
  assert.match(h, /^[0-9a-f]{64}$/);
  const expected = crypto.createHash('sha256').update(buf).digest('hex');
  assert.equal(h, expected);
});

test('encryptBuffer menghasilkan container terenkripsi', () => {
  const key = Buffer.alloc(32, 0xab);
  const pt = Buffer.from('isi backup database');
  const ct = encryptBuffer(pt, key);
  assert.ok(ct.subarray(0, 8).equals(BACKUP_MAGIC));
  assert.equal(ct.subarray(8, 8 + IV_LENGTH).length, IV_LENGTH);
  assert.ok(ct.subarray(ct.length - TAG_LENGTH).length === TAG_LENGTH);
  assert.equal(ct.length, pt.length + 8 + IV_LENGTH + TAG_LENGTH);
});

test('decryptBuffer mengembalikan plaintext', () => {
  const key = Buffer.alloc(32, 0xcd);
  const pt = Buffer.from('data yang disalin');
  const ct = encryptBuffer(pt, key);
  const recovered = decryptBuffer(ct, key);
  assert.ok(recovered.equals(pt));
});

test('decryptBuffer menolak key salah (GCM auth fail)', () => {
  const key = Buffer.alloc(32, 0xaa);
  const wrongKey = Buffer.alloc(32, 0xbb);
  const ct = encryptBuffer(Buffer.from('secret'), key);
  assert.throws(() => decryptBuffer(ct, wrongKey));
});

test('decryptBuffer menolak data yang dirusak', () => {
  const key = Buffer.alloc(32, 0x11);
  const ct = encryptBuffer(Buffer.from('data'), key);
  const tampered = Buffer.from(ct);
  tampered[tampered.length - 5] ^= 0xff;
  assert.throws(() => decryptBuffer(tampered, key));
});

test('decryptBuffer menolak magic header salah', () => {
  const key = Buffer.alloc(32, 0x55);
  const bad = Buffer.concat([Buffer.from('NOTBACK00'), Buffer.alloc(12 + 10 + 16)]);
  assert.throws(() => decryptBuffer(bad, key));
});

test('decryptBuffer menolak data pendek (< MIN_ENCRYPTED_SIZE)', () => {
  const key = Buffer.alloc(32, 0x99);
  assert.throws(() => decryptBuffer(Buffer.alloc(10), key));
  assert.throws(() => decryptBuffer(Buffer.alloc(35), key));
  // exactly 36 should fail on magic check
  const almost = Buffer.concat([Buffer.from('SMKBACK1'), Buffer.alloc(28)]);
  assert.throws(() => decryptBuffer(almost, key));
});

test('backupDateOf mengekstrak tanggal YYYY-MM-DD', () => {
  assert.equal(backupDateOf('mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc'), '2026-11-04');
  assert.equal(backupDateOf('uploads/uploads-backup-2026-11-04.tar.gz.enc'), '2026-11-04');
  assert.equal(backupDateOf('manifests/backup-2026-01-01.json'), '2026-01-01');
  assert.equal(backupDateOf('no-date-here'), null);
  assert.equal(backupDateOf(''), null);
  assert.equal(backupDateOf(null), null);
  assert.equal(backupDateOf('/path/2026-12-31.sql.gz.enc'), '2026-12-31');
});

test('cutoffDate menghitung tanggal batas retensi (Asia/Jakarta)', () => {
  // retention 30 hari dari 2026-11-04 → batas 2026-10-05
  assert.equal(cutoffDate('2026-11-04', 30), '2026-10-05');
  // retention 7 hari
  assert.equal(cutoffDate('2026-11-04', 7), '2026-10-28');
  // retention 1 hari
  assert.equal(cutoffDate('2026-11-04', 1), '2026-11-03');
});

test('ageExceedsRetention: object tanpa tanggal tidak pernah dihapus', () => {
  assert.equal(ageExceedsRetention('mysql/no-date.sql', '2026-11-04', 30), false);
  assert.equal(ageExceedsRetention('uploads/uploads-backup-filename.tar.gz', '2026-11-04', 30), false);
});

test('ageExceedsRetention: object lebih tua dari cutoff dihapus', () => {
  // 2026-09-15 < 2026-10-05 (cutoff) → hapus
  assert.equal(ageExceedsRetention('mysql/2026/09/mysql-backup-2026-09-15.sql.gz.enc', '2026-11-04', 30), true);
  // 2026-10-05 >= cutoff → simpan
  assert.equal(ageExceedsRetention('mysql/2026/10/mysql-backup-2026-10-05.sql.gz.enc', '2026-11-04', 30), false);
  // 2026-10-06 > cutoff → simpan
  assert.equal(ageExceedsRetention('mysql/2026/10/mysql-backup-2026-10-06.sql.gz.enc', '2026-11-04', 30), false);
  // 2026-11-04 (hari ini) → simpan
  assert.equal(ageExceedsRetention('mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc', '2026-11-04', 30), false);
});

test('ageExceedsRetention: object hari ini tidak terhapus walau retensi 0', () => {
  // cutoff = today when retention=0
  assert.equal(ageExceedsRetention('mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc', '2026-11-04', 0), false);
});

test('assertRestoreTargetAllowed menolak restore production tanpa flag', () => {
  assert.throws(() => assertRestoreTargetAllowed({ targetName: 'smk_telkom_purwokerto', productionName: 'smk_telkom_purwokerto', allowProduction: false, confirm: false }));
  assert.throws(() => assertRestoreTargetAllowed({ targetName: 'smk_telkom_purwokerto', productionName: 'smk_telkom_purwokerto', allowProduction: true, confirm: false }));
  assert.throws(() => assertRestoreTargetAllowed({ targetName: 'smk_telkom_purwokerto', productionName: 'smk_telkom_purwokerto', allowProduction: false, confirm: true }));
  // tidak throw untuk DB berbeda
  assert.doesNotThrow(() => assertRestoreTargetAllowed({ targetName: 'smk_restore_test', productionName: 'smk_telkom_purwokerto', allowProduction: false, confirm: false }));
  // throw hanya dengan kedua flag
  assert.doesNotThrow(() => assertRestoreTargetAllowed({ targetName: 'smk_telkom_purwokerto', productionName: 'smk_telkom_purwokerto', allowProduction: true, confirm: true }));
});

test('assertSafeRemotePath menolak path traversal', () => {
  assert.throws(() => assertSafeRemotePath('../etc/passwd'));
  assert.throws(() => assertSafeRemotePath('a/../../../secret'));
  assert.throws(() => assertSafeRemotePath('/absolute/path'));
  assert.throws(() => assertSafeRemotePath('C:\\Windows\\System32'));
  assert.throws(() => assertSafeRemotePath('a//b'));
  // ok
  assert.equal(assertSafeRemotePath('mysql/2026/11/backup.sql.gz.enc'), 'mysql/2026/11/backup.sql.gz.enc');
  assert.equal(assertSafeRemotePath('manifests/backup-2026-11-04.json'), 'manifests/backup-2026-11-04.json');
  assert.equal(assertSafeRemotePath('uploads/uploads-backup-2026-11-04.tar.gz.enc'), 'uploads/uploads-backup-2026-11-04.tar.gz.enc');
});

test('jakartaDateString menghasilkan tanggal Asia/Jakarta yang benar', () => {
  assert.equal(jakartaDateString(new Date('2026-11-04T16:59:59.000Z')), '2026-11-04');
  assert.equal(jakartaDateString(new Date('2026-11-04T17:00:00.000Z')), '2026-11-05');
  assert.equal(jakartaDateString(new Date('2026-01-01T00:00:00.000Z')), '2026-01-01');
});

test('withRetry mengembalikan hasil tanpa retry bila sukses', async () => {
  let calls = 0;
  const value = await withRetry(async () => { calls += 1; return 'ok'; }, { baseDelayMs: 1 });
  assert.equal(value, 'ok');
  assert.equal(calls, 1);
});

test('withRetry mengulang lalu berhasil', async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('sementara');
    return calls;
  }, { attempts: 5, baseDelayMs: 1 });
  assert.equal(value, 3);
  assert.equal(calls, 3);
});

test('withRetry melempar error setelah percobaan habis', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; throw new Error('gagal terus'); }, { attempts: 3, baseDelayMs: 1 }),
    /gagal terus/,
  );
  assert.equal(calls, 3);
});

test('withRetry tidak mengulang error permanen (shouldRetry=false)', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; const e = new Error('not found'); e.status = 404; throw e; }, {
      attempts: 5, baseDelayMs: 1, shouldRetry: (e) => !(e.status >= 400 && e.status < 500),
    }),
    /not found/,
  );
  assert.equal(calls, 1);
});

test('isUnsafeArchiveEntry menolak path traversal/absolut', () => {
  assert.ok(isUnsafeArchiveEntry('../evil.sh'));
  assert.ok(isUnsafeArchiveEntry('a/../../evil'));
  assert.ok(isUnsafeArchiveEntry('/etc/passwd'));
  assert.ok(isUnsafeArchiveEntry('C:\\Windows\\System32\\drivers\\etc\\hosts'));
  assert.ok(isUnsafeArchiveEntry('a\\..\\b'));
  // aman
  assert.ok(!isUnsafeArchiveEntry('content-images/2026/11/foto.webp'));
  assert.ok(!isUnsafeArchiveEntry('ppdb-documents/submissions/u/document.pdf'));
  assert.ok(!isUnsafeArchiveEntry('file.txt'));
  assert.ok(!isUnsafeArchiveEntry('./file.txt'));
});
