#!/usr/bin/env node
// Read-only ETL: Supabase REST API -> MySQL via mysql2 + Prisma.
// Usage: node scripts/etl/migrate.mjs [--dry-run] [--batch=500] [--tables=berita,bkk]
//
// Sumber Supabase hanya dibaca (GET). Tidak ada penulisan ke sumber.
// Target MySQL menerima upsert idempoten (ON DUPLICATE KEY UPDATE).
// File storage publik diunduh ke uploads/ agar gambar tetap dapat diakses
// tanpa ketergantungan operasional pada Supabase Storage.
// Dokumen privat (bucket ppdb-documents) TIDAK dibuat publik.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { prisma } from '../../src/db.js';
import { storage } from '../../src/utils/storage.js';
import { TABLES, toMysql, parseStorageObjectUrl, storageObjectUrl } from './transform.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const DRY_RUN = Boolean(args['dry-run']);
const BATCH = Number(args.batch || 1000);
const TABLE_FILTER = args.tables ? String(args.tables).split(',').map((t) => t.trim()).filter(Boolean) : null;

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const feEnvPath = path.resolve('frontend/.env');
const parentEnvPath = path.resolve('../frontend/.env');
const feEnv = fs.existsSync(feEnvPath) ? readEnv(feEnvPath) : fs.existsSync(parentEnvPath) ? readEnv(parentEnvPath) : {};
const SUPABASE_URL = process.env.SUPABASE_URL || feEnv.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || SERVICE_ROLE_KEY || feEnv.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL/SUPABASE_ANON_KEY tidak tersedia. Baca README.'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const sourceMode = SERVICE_ROLE_KEY ? 'service_role' : 'anon';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const errorsFile = path.resolve('docs', `etl-errors-${stamp}.jsonl`);
const summaryFile = path.resolve('docs', `etl-summary-${stamp}.json`);
const summary = {
  startedAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  sourceMode,
  tables: {},
  storage: { publicDownloaded: 0, privateDownloaded: 0, blocked: 0, failed: 0 },
};
let totalFailed = 0;
fs.mkdirSync(path.dirname(errorsFile), { recursive: true });

const target = await mysql.createConnection(process.env.DATABASE_URL);

async function fetchAll(table, columns) {
  const cols = columns.join(',');
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&limit=${BATCH}&offset=${offset}`;
    const res = await fetch(url, { headers: { ...headers, Prefer: 'count=exact' } });
    if (res.status === 404) { console.log(`  ${table}: tabel tidak ditemukan (404)`); return null; }
    if (!res.ok) throw new Error(`${table} REST ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    const range = res.headers.get('content-range');
    if (!range || range.endsWith('*')) break;
    const [, total] = range.split('/');
    if (rows.length >= Number(total)) break;
    offset += BATCH;
  }
  return rows;
}

async function downloaPublicObject(originalUrl) {
  const res = await fetch(originalUrl);
  if (!res.ok) throw new Error(`Storage ${originalUrl} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function downloadPrivateObject(bucket, objectPath) {
  if (!SERVICE_ROLE_KEY) return null;
  const url = storageObjectUrl(SUPABASE_URL, bucket, objectPath);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } });
  if (!res.ok) throw new Error(`Storage privat ${bucket}/${objectPath} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function upsertSql(table, insertColumns) {
  const cols = insertColumns.map((c) => `\`${c}\``).join(',');
  const updateCols = insertColumns.filter((c) => c !== 'id' && !(table === 'site_visitors' && (c === 'visitor_hash' || c === 'day')) && !(table === 'ppdb_drafts' && c === 'auth_user_id') && !(table === 'ai_daily_attempts' && (c === 'feature' || c === 'day')));
  const update = updateCols.length ? updateCols.map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(',') : '`id`=VALUES(`id`)';
  return `INSERT INTO \`${table}\` (${cols}) VALUES (${insertColumns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${update}`;
}

const selected = TABLES.filter((spec) => !TABLE_FILTER || TABLE_FILTER.includes(spec.table));

for (const spec of selected) {
  const { table, select, insert, optional = false, storageColumns = {} } = spec;
  try {
    const rows = await fetchAll(table, select);
    if (rows === null) { summary.tables[table] = { source: 0, imported: 0, failed: 0, skipped: 0, target: 'n/a', status: 'missing' }; console.log(`${table}: missing`); continue; }
    let imported = 0; let failed = 0; let skipped = 0;
    const sql = upsertSql(table, insert);
    for (const row of rows) {
      try {
        for (const [field, visibility] of Object.entries(storageColumns)) {
          const original = row[field];
          if (!original || typeof original !== 'string') continue;
          const parsed = parseStorageObjectUrl(original);
          if (!parsed) continue;
          if (visibility === 'private' || parsed.visibility === 'private') {
            const buffer = await downloadPrivateObject(parsed.bucket, parsed.objectPath);
            if (!buffer) { summary.storage.blocked += 1; skipped += 1; continue; }
            if (!DRY_RUN) {
              await storage.put(parsed.bucket, parsed.objectPath, buffer);
              // Simpan referensi key privat (bukan URL publik permanen).
              row[field] = `${parsed.bucket}/${parsed.objectPath}`;
            }
            summary.storage.privateDownloaded += 1;
            continue;
          }
          const buffer = await downloaPublicObject(original);
          if (!DRY_RUN) row[field] = await storage.put(parsed.bucket, parsed.objectPath, buffer);
          summary.storage.publicDownloaded += 1;
        }
        if (spec.derive) Object.assign(row, spec.derive(row));
        if (!DRY_RUN) await target.execute(sql, insert.map((c) => toMysql(row[c])));
        imported += 1;
      } catch (err) {
        failed += 1; totalFailed += 1;
        fs.appendFileSync(errorsFile, JSON.stringify({ table, id: row.id ?? row.auth_user_id ?? row.visitor_hash ?? row.feature, error: err.message }) + '\n');
      }
    }
    let targetCount = 'n/a';
    if (!DRY_RUN) { const [targetRows] = await target.query(`SELECT count(*) AS n FROM \`${table}\``); targetCount = targetRows[0].n; }
    summary.tables[table] = { source: rows.length, imported, failed, skipped, target: targetCount, status: failed === 0 ? 'PASS' : 'PARTIAL' };
    console.log(`${table}: source=${rows.length} imported=${imported} failed=${failed} skipped=${skipped} target=${targetCount}`);
  } catch (err) {
    const blocked = optional && /401|permission denied|42501/.test(err.message);
    summary.tables[table] = { source: 'blocked', imported: 0, failed: 0, skipped: 0, target: 'n/a', status: blocked ? 'BLOCKED_RLS' : 'FAIL', error: err.message };
    console.error(`${table}: ${blocked ? 'BLOCKED (RLS)' : 'ERROR'} ${err.message}`);
  }
}

// FK integrity
const [orphanPpdb] = await target.query('SELECT count(*) AS n FROM ppdb p LEFT JOIN users u ON u.id = p.auth_user_id WHERE p.auth_user_id IS NOT NULL AND u.id IS NULL');
const [orphanDraft] = await target.query('SELECT count(*) AS n FROM ppdb_drafts d LEFT JOIN users u ON u.id = d.auth_user_id WHERE u.id IS NULL');
const [orphanAdmin] = await target.query('SELECT count(*) AS n FROM admins a LEFT JOIN users u ON u.id = a.user_id WHERE u.id IS NULL');
summary.integrity = { orphanPpdb: orphanPpdb[0].n, orphanDraft: orphanDraft[0].n, orphanAdmin: orphanAdmin[0].n };
summary.finishedAt = new Date().toISOString();
summary.totalFailed = totalFailed;
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
console.log(`Summary: ${summaryFile}`);
if (!DRY_RUN) await target.end();
await prisma.$disconnect();
const orphans = summary.integrity.orphanPpdb + summary.integrity.orphanDraft + summary.integrity.orphanAdmin;
process.exit(totalFailed > 0 || orphans > 0 ? 1 : 0);
