#!/usr/bin/env node
// Restore AES-256-GCM dari file lokal atau objek Supabase Storage.
// Restore production selalu memerlukan --apply --allow-production.
// Restore test memerlukan --db=<database_baru> dan database tersebut harus belum ada.
// Contoh:
//   node scripts/restore.mjs --remote-date=2026-11-04 --target=mysql --db=smk_restore_test --apply
//   node scripts/restore.mjs backups/mysql/...enc --db=smk_restore_test --apply
//   node scripts/restore.mjs backups/uploads/...enc uploads --uploads-root=./restore-uploads --apply
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import mysql from 'mysql2/promise';
import { assertSafeTarArchive } from './archive-safe.mjs';
import {
  BACKUP_MAGIC, IV_LENGTH, TAG_LENGTH, MIN_ENCRYPTED_SIZE, sha256Hex,
  parseEncryptionKey, keyFingerprint as fingerprintKey, assertRestoreTargetAllowed, withRetry,
} from '../src/utils/backup.js';

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--') && !['mysql', 'uploads', 'both'].includes(a));
const fileArg = positional[0];
const flags = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const targetKind = flags.target
  ? String(flags.target)
  : argv.includes('uploads')
    ? 'uploads'
    : argv.includes('both')
      ? 'both'
      : (fileArg && fileArg.includes('uploads-backup') ? 'uploads' : 'mysql');
if (!fileArg && !flags['remote-date']) { console.error('Gunakan file backup atau --remote-date=YYYY-MM-DD.'); process.exit(2); }
if (!flags.apply) { console.error('Restore destruktif diblokir. Tambahkan --apply setelah target diverifikasi.'); process.exit(2); }

const key = parseEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
const keyFingerprint = fingerprintKey(key);
const root = path.resolve(process.env.BACKUP_DIR || 'backups');
const work = path.join(root, '.restore');
await fs.rm(work, { recursive: true, force: true });
await fs.mkdir(work, { recursive: true });

async function sha256Buffer(buffer) { return sha256Hex(buffer); }
async function readRemote(remote) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !bucket || !serviceKey) throw new Error('SUPABASE_URL, SUPABASE_BACKUP_BUCKET, SUPABASE_SERVICE_ROLE_KEY diperlukan untuk restore remote.');
  return withRetry(async () => {
    const res = await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${remote}`, { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } });
    if (!res.ok) {
      const error = new Error(`Download remote ${remote} gagal: HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return Buffer.from(await res.arrayBuffer());
  }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500) });
}
async function listRemote(prefix) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !bucket || !serviceKey) throw new Error('Kredensial Supabase Storage tidak lengkap.');
  const items = [];
  for (let offset = 0;; offset += 100) {
    const batch = await withRetry(async () => {
      const res = await fetch(`${base}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'content-type': 'application/json' }, body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'desc' } }) });
      if (!res.ok) {
        const error = new Error(`List remote gagal: HTTP ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return res.json();
    }, { shouldRetry: (error) => !(error.status >= 400 && error.status < 500) });
    if (!batch.length) break;
    for (const item of batch) {
      const full = `${prefix}/${item.name}`;
      if (item.id == null || item.metadata == null) items.push(...await listRemote(full));
      else items.push(full);
    }
    if (batch.length < 100) break;
  }
  return items;
}

let manifest;
let sourceRoot = root;
if (flags['remote-date']) {
  const requested = String(flags['remote-date']);
  const candidates = await listRemote('manifests');
  const manifestKey = candidates.find((name) => name.endsWith(`backup-${requested}.json`));
  if (!manifestKey) throw new Error(`Manifest remote untuk tanggal ${requested} tidak ditemukan.`);
  manifest = JSON.parse((await readRemote(manifestKey)).toString('utf8'));
  if (manifest.status !== 'REMOTE_VERIFIED') throw new Error(`Manifest remote belum terverifikasi: ${manifest.status}`);
  for (const obj of Object.values(manifest.objects || {})) {
    const data = await readRemote(obj.key);
    if (data.length !== obj.size || await sha256Buffer(data) !== obj.sha256) throw new Error(`Checksum remote tidak cocok: ${obj.key}`);
    await fs.writeFile(path.join(work, path.basename(obj.key)), data);
  }
  sourceRoot = work;
} else {
  const input = path.resolve(fileArg);
  const manifestPath = flags.manifest ? path.resolve(flags.manifest) : null;
  if (manifestPath) manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest) {
    const object = Object.values(manifest.objects || {}).find((o) => path.resolve(path.join(root, o.key)) === input || path.basename(o.key) === path.basename(input));
    if (object) {
      const data = await fs.readFile(input);
      if (data.length !== object.size || await sha256Buffer(data) !== object.sha256) throw new Error(`Checksum lokal tidak cocok: ${input}`);
    }
  }
  sourceRoot = path.dirname(input);
}

// Validasi manifest sebelum dekripsi apa pun: format enkripsi dan fingerprint key.
if (manifest) {
  if (manifest.encryption !== 'AES-256-GCM') throw new Error(`Format enkripsi tidak didukung: ${manifest.encryption}`);
  if (manifest.keyFingerprint && manifest.keyFingerprint !== keyFingerprint) {
    throw new Error(`Key fingerprint manifest (${manifest.keyFingerprint}) tidak cocok dengan BACKUP_ENCRYPTION_KEY aktif (${keyFingerprint}).`);
  }
}

async function decrypt(input, output) {
  const raw = await fs.readFile(input);
  if (raw.length < MIN_ENCRYPTED_SIZE || !raw.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error('Format backup tidak dikenal atau file tidak lengkap.');
  }
  const iv = raw.subarray(BACKUP_MAGIC.length, BACKUP_MAGIC.length + IV_LENGTH);
  const tag = raw.subarray(raw.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  await pipeline(createReadStream(input, { start: BACKUP_MAGIC.length + IV_LENGTH, end: raw.length - TAG_LENGTH - 1 }), decipher, createWriteStream(output));
}

const selected = new Set();
if (targetKind === 'mysql' || targetKind === 'both') selected.add('database');
if (targetKind === 'uploads' || targetKind === 'both') selected.add('uploads');

function localObjectPath(obj) {
  if (sourceRoot === work) return path.join(work, path.basename(obj.key));
  return path.join(root, obj.key);
}

const objects = manifest?.objects || {};
if (!manifest && fileArg) {
  const input = path.resolve(fileArg);
  objects[ input.includes('uploads-backup') ? 'uploads' : 'database' ] = { key: path.relative(root, input).replaceAll('\\', '/') };
}

for (const kind of selected) {
  const obj = objects[kind];
  if (!obj) { if (kind === 'uploads') continue; throw new Error(`Objek backup ${kind} tidak ada di manifest.`); }
  const encrypted = localObjectPath(obj);
  const decrypted = path.join(work, kind === 'uploads' ? 'uploads.tar.gz' : 'database.sql.gz');
  await decrypt(encrypted, decrypted);
  if (kind === 'uploads') {
    const count = await assertSafeTarArchive(decrypted);
    const dest = path.resolve(flags['uploads-root'] || process.env.UPLOAD_ROOT || 'uploads');
    const activeUploadRoot = path.resolve(process.env.UPLOAD_ROOT || 'uploads');
    if (dest === activeUploadRoot && !flags['allow-production'] && !flags.confirm) {
      throw new Error('Menolak menimpa UPLOAD_ROOT aktif. Gunakan --uploads-root=<direktori_test> atau --allow-production --confirm.');
    }
    await fs.mkdir(dest, { recursive: true });
    await new Promise((resolve, reject) => {
      const child = spawn('tar', ['-xzf', decrypted, '-C', dest], { stdio: ['ignore', 'ignore', 'pipe'] });
      let error = ''; child.stderr.on('data', (chunk) => { error += chunk.toString(); });
      child.on('error', reject); child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar restore gagal (${code}): ${error.slice(0, 500)}`)));
    });
    console.log(JSON.stringify({ event: 'restore_uploads_complete', destination: dest, archiveEntries: count }));
  } else {
    const sql = path.join(work, 'backup.sql');
    await pipeline(createReadStream(decrypted), createGunzip(), createWriteStream(sql));
    const head = (await fs.readFile(sql, 'utf8')).slice(0, 10000);
    if (!/CREATE TABLE|INSERT INTO/i.test(head)) throw new Error('File hasil dekripsi bukan dump SQL yang valid.');
    const targetUrl = flags['target-url'] || (() => { if (!flags.db) return null; const u = new URL(process.env.DATABASE_URL); u.pathname = `/${flags.db}`; return u.toString(); })();
    if (!targetUrl) throw new Error('Tentukan --db=nama_database atau --target-url.');
    const target = new URL(targetUrl);
    const productionName = new URL(process.env.DATABASE_URL).pathname.slice(1);
    assertRestoreTargetAllowed({
      targetName: target.pathname.slice(1),
      productionName,
      allowProduction: Boolean(flags['allow-production']),
      confirm: Boolean(flags.confirm),
    });
    const conn = await mysql.createConnection({ host: target.hostname, port: Number(target.port || 3306), user: decodeURIComponent(target.username), password: decodeURIComponent(target.password), database: target.pathname.slice(1) });
    const [before] = await conn.query('SHOW TABLES');
    await conn.end();
    if (before.length && !flags['allow-existing']) throw new Error(`Database tujuan sudah berisi ${before.length} tabel. Gunakan database test baru atau --allow-existing.`);
    const mysqlBin = process.env.MYSQL_PATH || (process.platform === 'win32' ? 'mysql.exe' : 'mysql');
    const args = [`--host=${target.hostname}`, `--port=${target.port || 3306}`, `--user=${decodeURIComponent(target.username)}`, '--default-character-set=utf8mb4', target.pathname.slice(1)];
    await new Promise((resolve, reject) => { const child = spawn(mysqlBin, args, { env: { ...process.env, MYSQL_PWD: decodeURIComponent(target.password) }, stdio: ['pipe', 'ignore', 'pipe'] }); createReadStream(sql).pipe(child.stdin); let error = ''; child.stderr.on('data', (chunk) => { error += chunk.toString(); }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`mysql restore gagal (${code}): ${error.slice(0, 800)}`))); });
    const check = await mysql.createConnection({ host: target.hostname, port: Number(target.port || 3306), user: decodeURIComponent(target.username), password: decodeURIComponent(target.password), database: target.pathname.slice(1) });
    const [tables] = await check.query('SHOW TABLES');
    const counts = {};
    for (const row of tables) { const table = Object.values(row)[0]; if (table === '_prisma_migrations') continue; const [[{ n }]] = await check.query(`SELECT COUNT(*) AS n FROM \`${table}\``); counts[table] = Number(n); }
    await check.end();
    if (manifest?.tableCounts) {
      for (const [table, expected] of Object.entries(manifest.tableCounts)) if (counts[table] !== expected) throw new Error(`Count ${table} tidak cocok (${counts[table]} != ${expected}).`);
    }
    console.log(JSON.stringify({ event: 'restore_mysql_complete', database: target.pathname.slice(1), keyFingerprint, tableCounts: counts }));
  }
}
await fs.rm(work, { recursive: true, force: true });
console.log(JSON.stringify({ event: 'restore_complete', target: targetKind }));
