#!/usr/bin/env node
// Verifikasi backup lokal dan (opsional) remote.
// Usage:
//   node scripts/backup-verify.mjs [manifest.json] [--remote]
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BACKUP_MAGIC, sha256Hex, parseEncryptionKey, keyFingerprint as fingerprintKey } from '../src/utils/backup.js';

const root = path.resolve(process.env.BACKUP_DIR || 'backups');
const key = parseEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
const keyFingerprint = fingerprintKey(key);

const argv = process.argv.slice(2);
const remote = argv.includes('--remote');
const manifestArg = argv.find((a) => !a.startsWith('--'));
const manifests = manifestArg
  ? [path.resolve(manifestArg)]
  : (await fs.readdir(path.join(root, 'manifests'))).filter((f) => f.endsWith('.json')).sort().slice(-1).map((f) => path.join(root, 'manifests', f));
if (!manifests.length) throw new Error('Manifest backup tidak ditemukan.');
const manifest = JSON.parse(await fs.readFile(manifests[0], 'utf8'));

// Validasi field wajib manifest.
for (const field of ['date', 'database', 'encryption', 'keyFingerprint', 'tableCounts', 'objects', 'status']) {
  if (manifest[field] === undefined) throw new Error(`Manifest tidak lengkap: field "${field}" hilang.`);
}
if (manifest.encryption !== 'AES-256-GCM') throw new Error(`Format enkripsi tidak didukung: ${manifest.encryption}`);
if (manifest.keyFingerprint !== keyFingerprint) throw new Error('Key fingerprint manifest tidak cocok dengan BACKUP_ENCRYPTION_KEY aktif.');

const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const bucket = process.env.SUPABASE_BACKUP_BUCKET || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function fetchRemote(remoteKey) {
  const res = await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${remoteKey}`, { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } });
  if (!res.ok) throw new Error(`Unduh remote ${remoteKey} gagal: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const results = [];
for (const [name, object] of Object.entries(manifest.objects || {})) {
  const data = remote ? await fetchRemote(object.key) : await fs.readFile(path.join(root, object.key));
  const digest = sha256Hex(data);
  if (data.length !== object.size) throw new Error(`Ukuran tidak cocok: ${object.key} (${data.length} != ${object.size})`);
  if (digest !== object.sha256) throw new Error(`Checksum tidak cocok: ${object.key}`);
  if (!data.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) throw new Error(`Header enkripsi tidak valid: ${object.key}`);
  results.push({ name, key: object.key, size: object.size, status: 'PASS' });
}

if (remote && manifest.status !== 'REMOTE_VERIFIED') throw new Error(`Status manifest bukan REMOTE_VERIFIED: ${manifest.status}`);

console.log(JSON.stringify({
  event: 'backup_verify_complete',
  manifest: path.relative(root, manifests[0]),
  source: remote ? 'remote' : 'local',
  status: manifest.status,
  keyFingerprint,
  objects: results,
}));