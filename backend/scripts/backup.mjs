#!/usr/bin/env node
// Backup MySQL + uploads -> gzip -> AES-256-GCM -> Supabase Storage (private).
// Alur status: LOCAL_CREATED -> REMOTE_UPLOADED -> REMOTE_VERIFIED, atau FAILED.
// Env: DATABASE_URL, BACKUP_ENCRYPTION_KEY, BACKUP_DIR, BACKUP_RETENTION_DAYS,
//      UPLOAD_ROOT, MYSQLDUMP_PATH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      SUPABASE_BACKUP_BUCKET.
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import mysql from 'mysql2/promise';
import { jakartaDateString } from '../src/utils/date.js';
import {
  BACKUP_MAGIC, IV_LENGTH, sha256Hex, parseEncryptionKey, keyFingerprint as fingerprintKey,
  isValidBucketName, assertSafeRemotePath, ageExceedsRetention, withRetry,
} from '../src/utils/backup.js';

const args = new Set(process.argv.slice(2));
const NO_UPLOAD = args.has('--no-upload');
const root = path.resolve(process.env.BACKUP_DIR || 'backups');
const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || 'uploads');
const date = jakartaDateString(new Date());
const retention = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const key = parseEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
const keyFingerprint = fingerprintKey(key);

const dbUrl = new URL(process.env.DATABASE_URL);
const database = dbUrl.pathname.slice(1);
const mysqlDump = process.env.MYSQLDUMP_PATH || (process.platform === 'win32' ? 'mysqldump.exe' : 'mysqldump');
const work = path.join(root, '.work', date);
await fs.mkdir(work, { recursive: true });

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BACKUP_BUCKET || '';
if (BUCKET && !isValidBucketName(BUCKET)) {
  throw new Error('SUPABASE_BACKUP_BUCKET tidak valid. Gunakan nama bucket Storage yang aman.');
}
const remoteReady = Boolean(SUPABASE_URL && SERVICE_KEY && BUCKET);
const lockPath = path.join(root, '.backup.lock');
let lockHandle;
try {
  await fs.mkdir(root, { recursive: true });
  lockHandle = await fs.open(lockPath, 'wx');
  await lockHandle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
} catch (error) {
  if (error.code === 'EEXIST') throw new Error(`Backup lain sedang berjalan: ${lockPath}`);
  throw error;
}
async function releaseLock() {
  try { await lockHandle?.close(); } finally { await fs.rm(lockPath, { force: true }); }
}
// process.exit() melewati blok finally, jadi lock juga dirilis lewat event 'exit'.
process.once('exit', () => { try { unlinkSync(lockPath); } catch {} });

function log(event, extra = {}) {
  console.log(JSON.stringify({ event, ...extra }));
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function encryptFile(input, output) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const out = createWriteStream(output);
  await new Promise((resolve, reject) => { out.once('open', resolve); out.once('error', reject); });
  out.write(BACKUP_MAGIC);
  out.write(iv);
  await pipeline(createReadStream(input), cipher, out);
  await fs.appendFile(output, cipher.getAuthTag());
}

async function dumpDatabase(output) {
  const child = spawn(mysqlDump, [
    '--single-transaction', '--quick', '--routines', '--triggers', '--events',
    '--no-tablespaces', '--hex-blob', '--default-character-set=utf8mb4',
    '--set-gtid-purged=OFF',
    `--host=${dbUrl.hostname}`, `--port=${dbUrl.port || 3306}`,
    `--user=${decodeURIComponent(dbUrl.username)}`, database,
  ], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(dbUrl.password) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`mysqldump gagal (${code}): ${stderr.slice(0, 800)}`)));
  });
  await pipeline(child.stdout, createGzip(), createWriteStream(output));
  await exited;
}

async function archiveUploads(output) {
  try { await fs.access(uploadRoot); } catch { return false; }
  const child = spawn('tar', ['-czf', output, '-C', uploadRoot, '.'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar gagal (${code}): ${stderr.slice(0, 500)}`)));
  });
  return true;
}

async function tableCounts() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [tables] = await conn.query('SHOW TABLES');
  const counts = {};
  for (const row of tables) {
    const name = Object.values(row)[0];
    if (name === '_prisma_migrations') continue;
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${name}\``);
    counts[name] = Number(n);
  }
  await conn.end();
  return counts;
}

async function uploadObject(remote, localFile, { contentType = 'application/octet-stream', upsert = false } = {}) {
  const safe = assertSafeRemotePath(remote);
  const headers = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'content-type': contentType };
  if (upsert) headers['x-upsert'] = 'true';
  const body = await fs.readFile(localFile);
  await withRetry(async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${safe}`, { method: 'POST', headers, body });
    if (!res.ok) {
      const error = new Error(`Upload ${safe} gagal: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      error.status = res.status;
      throw error;
    }
  }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500), onRetry: (error, attempt) => log('backup_upload_retry', { key: safe, attempt, status: error.status }) });
}

// allowMissing=true mengembalikan null untuk objek yang benar-benar tidak ada (404/400).
async function fetchRemoteObject(remote, { allowMissing = false } = {}) {
  const safe = assertSafeRemotePath(remote);
  return withRetry(async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${safe}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    if (allowMissing && (res.status === 404 || res.status === 400)) return null;
    if (!res.ok) {
      const error = new Error(`Unduh ${safe} gagal: HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return Buffer.from(await res.arrayBuffer());
  }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500), onRetry: (error, attempt) => log('backup_download_retry', { key: safe, attempt, status: error.status }) });
}

// Memverifikasi objek remote terhadap checksum/ukuran lokal.
async function verifyRemote(remote, localSha, localSize) {
  const buffer = await fetchRemoteObject(remote);
  if (buffer.length !== localSize) throw new Error(`Ukuran objek ${remote} tidak cocok (${buffer.length} != ${localSize}).`);
  const digest = sha256Hex(buffer);
  if (digest !== localSha) throw new Error(`Checksum objek ${remote} tidak cocok.`);
}

// Idempoten dan aman: object data yang sudah ada tidak pernah ditimpa isi berbeda.
async function ensureUploaded(remote, localFile, sha, size, contentType) {
  const existing = await fetchRemoteObject(remote, { allowMissing: true });
  if (existing) {
    if (existing.length === size && sha256Hex(existing) === sha) {
      log('backup_object_already_present', { key: remote });
      return;
    }
    throw new Error(`Objek remote ${remote} sudah ada dengan isi berbeda; menolak menimpa.`);
  }
  await uploadObject(remote, localFile, { contentType });
  await verifyRemote(remote, sha, size);
}

// Menelusuri objek backup secara rekursif (folder bertingkat) + paginasi.
async function listRemoteObjects(prefix, out = []) {
  let offset = 0;
  const limit = 100; // Supabase Storage membatasi jumlah per request.
  for (;;) {
    const res = await withRetry(async () => {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
      });
      if (!r.ok) {
        const error = new Error(`List ${prefix} gagal: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
        error.status = r.status;
        throw error;
      }
      return r;
    }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500) });
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const item of items) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.id == null || item.metadata == null;
      if (isFolder) await listRemoteObjects(full, out);
      else out.push(full);
    }
    if (items.length < limit) break;
    offset += limit;
  }
  return out;
}

// Retensi: object tanpa tanggal backup tidak dihapus otomatis (lihat ageExceedsRetention).

async function cleanupLocal() {
  const deleted = [];
  async function walk(dir) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (ageExceedsRetention(entry.name, date, retention)) {
        await fs.unlink(full);
        deleted.push(path.relative(root, full).replaceAll('\\', '/'));
        log('backup_retention_deleted_local', { file: path.relative(root, full) });
      }
    }
  }
  await walk(path.join(root, 'mysql'));
  await walk(path.join(root, 'uploads'));
  await walk(path.join(root, 'manifests'));
  return deleted;
}

async function cleanupRemote() {
  if (!remoteReady) return { deleted: [], skipped: 'remote_not_configured' };
  const deleted = [];
  const toDelete = [];
  for (const prefix of ['mysql', 'uploads', 'manifests']) {
    const objects = await listRemoteObjects(prefix);
    for (const objectPath of objects) {
      if (ageExceedsRetention(objectPath, date, retention)) toDelete.push(objectPath);
    }
  }
  if (toDelete.length) {
    // Hapus per batch agar payload tetap wajar.
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      await withRetry(async () => {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ prefixes: batch }),
        });
        if (!res.ok) {
          const error = new Error(`Hapus objek remote gagal: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
          error.status = res.status;
          throw error;
        }
      }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500) });
      deleted.push(...batch);
      log('backup_retention_deleted_remote', { objects: batch });
    }
  }
  return { deleted, skipped: null };
}

const manifest = {
  version: 2,
  date,
  startedAt: new Date().toISOString(),
  database,
  schemaVersion: null,
  encryption: 'AES-256-GCM',
  keyFingerprint,
  retentionDays: retention,
  tableCounts: {},
  objects: {},
  status: 'STARTED',
};

let exitCode = 0;
try {
  manifest.schemaVersion = await (async () => {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    try {
      const [rows] = await conn.query('SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1');
      return rows[0]?.migration_name ?? 'unknown';
    } catch { return 'unknown'; } finally { await conn.end(); }
  })();
  manifest.tableCounts = await tableCounts();

  const dumpPlain = path.join(work, `mysql-${date}.sql.gz`);
  const dumpEnc = path.join(root, 'mysql', date.slice(0, 4), date.slice(5, 7), `mysql-backup-${date}.sql.gz.enc`);
  await fs.mkdir(path.dirname(dumpEnc), { recursive: true });
  await dumpDatabase(dumpPlain);
  await encryptFile(dumpPlain, dumpEnc);
  manifest.objects.database = { key: path.relative(root, dumpEnc).replaceAll('\\', '/'), size: (await fs.stat(dumpEnc)).size, sha256: await sha256(dumpEnc) };
  await fs.unlink(dumpPlain);

  const uploadsPlain = path.join(work, `uploads-${date}.tar.gz`);
  if (await archiveUploads(uploadsPlain)) {
    const uploadsEnc = path.join(root, 'uploads', `uploads-backup-${date}.tar.gz.enc`);
    await fs.mkdir(path.dirname(uploadsEnc), { recursive: true });
    await encryptFile(uploadsPlain, uploadsEnc);
    manifest.objects.uploads = { key: path.relative(root, uploadsEnc).replaceAll('\\', '/'), size: (await fs.stat(uploadsEnc)).size, sha256: await sha256(uploadsEnc) };
    await fs.unlink(uploadsPlain);
  }
  manifest.status = 'LOCAL_CREATED';
} catch (error) {
  manifest.status = 'FAILED';
  manifest.error = error.message;
  console.error(JSON.stringify({ level: 'error', event: 'backup_failed', message: error.message }));
  exitCode = 1;
}

manifest.finishedAt = new Date().toISOString();
const manifestPath = path.join(root, 'manifests', `backup-${date}.json`);
await fs.mkdir(path.dirname(manifestPath), { recursive: true });

async function writeManifest() {
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

await writeManifest();
await fs.rm(work, { recursive: true, force: true });

if (manifest.status === 'FAILED') process.exit(exitCode);

if (NO_UPLOAD) {
  log('backup_upload_skipped', { reason: '--no-upload' });
} else if (!remoteReady) {
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({ level: 'error', event: 'backup_upload_failed', reason: 'Supabase backup env belum dikonfigurasi' }));
    process.exit(1);
  }
  log('backup_upload_skipped', { reason: 'Supabase backup env belum dikonfigurasi (local test)' });
} else {
  try {
    // 1) Upload + verifikasi setiap objek database/uploads.
    for (const [name, obj] of Object.entries(manifest.objects)) {
      await ensureUploaded(obj.key, path.join(root, obj.key), obj.sha256, obj.size, 'application/octet-stream');
      log('backup_object_uploaded_verified', { object: name, key: obj.key });
    }
    // 2) Tandai REMOTE_UPLOADED lalu unggah manifest.
    manifest.status = 'REMOTE_UPLOADED';
    manifest.finishedAt = new Date().toISOString();
    await writeManifest();
    const manifestKey = `manifests/backup-${date}.json`;
    await uploadObject(manifestKey, manifestPath, { contentType: 'application/json', upsert: true });
    // 3) Verifikasi manifest remote sebelum menyatakan sukses.
    const remoteManifest = await fetchRemoteObject(manifestKey);
    const parsed = JSON.parse(remoteManifest.toString('utf8'));
    if (parsed.status !== 'REMOTE_UPLOADED') throw new Error(`Status manifest remote tidak sesuai: ${parsed.status}`);
    // 4) Status final REMOTE_VERIFIED, unggah ulang, verifikasi ulang.
    manifest.status = 'REMOTE_VERIFIED';
    manifest.verifiedAt = new Date().toISOString();
    manifest.finishedAt = manifest.verifiedAt;
    await writeManifest();
    await uploadObject(manifestKey, manifestPath, { contentType: 'application/json', upsert: true });
    const finalManifest = JSON.parse((await fetchRemoteObject(manifestKey)).toString('utf8'));
    if (finalManifest.status !== 'REMOTE_VERIFIED') throw new Error(`Manifest remote final tidak terverifikasi: ${finalManifest.status}`);
    log('backup_remote_verified', { manifest: manifestKey, objects: Object.keys(manifest.objects) });
  } catch (error) {
    manifest.status = 'FAILED';
    manifest.error = error.message;
    manifest.finishedAt = new Date().toISOString();
    await writeManifest();
    console.error(JSON.stringify({ level: 'error', event: 'backup_upload_failed', message: error.message }));
    process.exit(1);
  }
}

// Retensi 30 hari (Asia/Jakarta). Kegagalan cleanup dilaporkan dan menghasilkan
// exit code non-zero, tetapi tidak mengubah status backup yang sudah terverifikasi.
try {
  const remote = await cleanupRemote();
  const localDeleted = await cleanupLocal();
  log('backup_complete', {
    date,
    status: manifest.status,
    objects: Object.keys(manifest.objects),
    remoteDeleted: remote.deleted ?? [],
    remoteCleanupSkipped: remote.skipped ?? null,
    localDeleted,
    retentionDays: retention,
  });
} catch (error) {
  console.error(JSON.stringify({ level: 'error', event: 'backup_retention_failed', message: error.message }));
  process.exitCode = 1;
} finally {
  await releaseLock();
}