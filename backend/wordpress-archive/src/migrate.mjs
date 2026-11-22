#!/usr/bin/env node
// Migration engine arsip WordPress -> MySQL project.
//
//   node src/migrate.mjs --dry-run                 # rencana lengkap, tanpa menulis
//   node src/migrate.mjs --media-only --dry-run    # validasi media saja
//   node src/migrate.mjs --import                  # tulis ke target (butuh --yes)
//
// Aman secara bawaan: tanpa --import tidak ada operasi tulis. Tidak pernah
// menghapus/mengosongkan tabel; hanya INSERT/UPDATE per baris dengan ID
// deterministik (idempoten).

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { readSqlFile } from './lib/sql-parser.js';
import { collectMediaUrls, resolveMedia, mediaPublicUrl } from './lib/media.js';
import { extractContentImageUrls } from './lib/transform.js';
import { mapPost, emptySlugRegistry, indexManifest } from './lib/record.js';
import { toDateOnly } from './lib/base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.resolve(ROOT, '..');

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const DRY_RUN = Boolean(args['dry-run']) || !Boolean(args.import);
const DO_IMPORT = Boolean(args.import);
const MEDIA_ONLY = Boolean(args['media-only']);
const MEDIA_DOWNLOAD = MEDIA_ONLY && Boolean(args['media-download']);
const SKIP_MEDIA = Boolean(args['skip-media']);
const SKIP_DB = Boolean(args['skip-db']);
const CONCURRENCY = Number(args['media-concurrency'] || 6);
const BATCH = Number(args.batch || 50);
const LIMIT = args.limit ? Number(args.limit) : 0;
const SQL_PATH = path.resolve(args.sql || path.join(ROOT, 'wordpres_posts.sql'));
const OUT_DIR = path.resolve(args.out || path.join(ROOT, 'results'));
const UPLOAD_ROOT = path.resolve(args['upload-root'] || process.env.UPLOAD_ROOT || path.join(BACKEND, 'uploads'));
const MEDIA_BASE_URL = (args['media-base-url'] || process.env.MEDIA_BASE_URL || process.env.PUBLIC_STORAGE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const MANIFEST_PATH = args['media-manifest'] ? path.resolve(args['media-manifest']) : path.join(OUT_DIR, 'media-map.json');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = {
  startedAt: new Date().toISOString(),
  mode: DO_IMPORT ? 'import' : (MEDIA_ONLY ? 'media-only-dry-run' : 'dry-run'),
  dryRun: DRY_RUN,
  sqlFile: path.relative(process.cwd(), SQL_PATH).replace(/\\/g, '/'),
  uploadRoot: UPLOAD_ROOT,
  mediaBaseUrl: MEDIA_BASE_URL,
  categories: {},
  media: { total: 0, available: 0, unresolved: 0, skippedInvalid: 0 },
  conflicts: { slugCollision: 0, duplicateCandidate: 0 },
  skipped: {},
  review: { count: 0, samples: [] },
};

function fail(message) { console.error(`ERROR: ${message}`); process.exit(2); }
if (!fs.existsSync(SQL_PATH)) fail(`Dump SQL tidak ditemukan: ${SQL_PATH}`);
const DATABASE_URL = process.env.DATABASE_URL;
if (!SKIP_DB && !DATABASE_URL) fail('DATABASE_URL tidak tersedia (baca backend/.env).');
if (DO_IMPORT && !args.yes) fail('Import memerlukan konfirmasi eksplisit: tambahkan --yes.');

let db = null;
if (!SKIP_DB) {
  db = await mysql.createConnection(DATABASE_URL);
  const [[dbName]] = await db.query('SELECT DATABASE() AS db');
  if (dbName.db !== 'smk_telkom_purwokerto') {
    await db.end();
    fail(`Database target tidak sesuai (${dbName.db}); migrasi dihentikan.`);
  }
  report.targetDatabase = dbName.db;
}

// ---- 1. Parsing ----
const { rows, stats } = readSqlFile(fs, SQL_PATH);
const posts = LIMIT ? rows.filter((r) => r.post_type === 'post').slice(0, LIMIT) : rows;
report.parser = stats;

// ---- 2. Media ----
let manifestIndex = new Map();
if (!MEDIA_ONLY && fs.existsSync(MANIFEST_PATH)) {
  manifestIndex = indexManifest(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')));
}
const media = collectMediaUrls(posts, extractContentImageUrls);
report.media.total = media.size;

if (MEDIA_ONLY || !SKIP_MEDIA) {
  const entries = [...media.values()].map((e) => ({ ...e, suggestedKey: e.suggestedKey }));
  const { manifest, summary } = await resolveMedia(entries, {
    dryRun: DRY_RUN && !MEDIA_DOWNLOAD, uploadRoot: UPLOAD_ROOT, mediaBaseUrl: MEDIA_BASE_URL,
    concurrency: CONCURRENCY, maxBytes: (DRY_RUN && !MEDIA_DOWNLOAD) ? 2048 : Infinity,
  });
  report.media.available = summary.downloaded;
  report.media.unresolved = summary.unresolved;
  report.media.skippedInvalid = summary.skipped;
  const finalManifest = manifest.map((m) => m);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, items: finalManifest }, null, 2));
  manifestIndex = indexManifest(finalManifest);
  report.media.manifest = path.relative(process.cwd(), MANIFEST_PATH).replace(/\\/g, '/');
}

if (MEDIA_ONLY) {
  finishReport();
  process.exit(0);
}

// ---- 3. Pemetaan + idempotensi ----
const usedSlugs = emptySlugRegistry();
const mapped = [];
const reviewRows = [];
for (const post of posts) {
  const result = mapPost(post, { usedSlugs, manifestIndex });
  report.skipped[`${result.category}:${post.post_type}`] = (report.skipped[`${result.category}:${post.post_type}`] || 0) + 1;
  if (result.category === 'needs_review') {
    reviewRows.push({ id: post.ID, type: post.post_type, title: result.source.slug || null, reasons: result.reasons });
    continue;
  }
  if (result.category === 'skip') continue;
  mapped.push(result);
}

// Muat kunci existing dari target (read-only) untuk deteksi konflik.
let existing = { ids: new Set(), slugs: new Set(), titles: new Set(), counts: {} };
if (db) {
  const tables = ['berita', 'pengumuman', 'prestasi', 'events'];
  for (const table of tables) {
    const [idRows] = await db.query(`SELECT id FROM \`${table}\``);
    for (const r of idRows) existing.ids.add(`${table}:${r.id}`);
    existing.counts[table] = idRows.length;
    if (table !== 'events') {
      const [slugRows] = await db.query(`SELECT slug FROM \`${table}\``);
      for (const r of slugRows) existing.slugs.add(`${table}:${r.slug}`);
    } else {
      const [titleRows] = await db.query('SELECT judul FROM `events`');
      for (const r of titleRows) existing.titles.add(r.judul.toLowerCase());
    }
  }
}
report.existingCounts = existing.counts;

const plan = { berita: [], pengumuman: [], prestasi: [], events: [] };
const dupCandidates = [];
for (const item of mapped) {
  const table = item.target;
  const record = item.record;
  if (existing.ids.has(`${table}:${record.id}`)) { plan[table].push({ op: 'update', record, source: item.source }); continue; }
  if (table !== 'events' && existing.slugs.has(`${table}:${record.slug}`)) {
    report.conflicts.slugCollision += 1;
    plan[table].push({ op: 'skip_slug_conflict', record, source: item.source });
    continue;
  }
  if (table === 'events' && existing.titles.has(record.judul.toLowerCase())) {
    report.conflicts.duplicateCandidate += 1;
    plan[table].push({ op: 'skip_duplicate', record, source: item.source });
    continue;
  }
  if (item.conflict?.type === 'slug_collision') {
    dupCandidates.push({ source: item.source, resolvedAs: item.conflict.resolvedAs });
  }
  plan[table].push({ op: 'insert', record, source: item.source });
}

for (const table of Object.keys(plan)) {
  const ops = plan[table];
  report.categories[table] = {
    source: mapped.filter((m) => m.target === table).length,
    insert: ops.filter((o) => o.op === 'insert').length,
    update: ops.filter((o) => o.op === 'update').length,
    skipSlugConflict: ops.filter((o) => o.op === 'skip_slug_conflict').length,
    skipDuplicate: ops.filter((o) => o.op === 'skip_duplicate').length,
  };
}
report.conflicts.slugResolvedWithinBatch = dupCandidates.length;
report.review.count = reviewRows.length;
report.review.samples = reviewRows.slice(0, 100);

// ---- 4. Import ----
if (DO_IMPORT) {
  await runImport(db, plan);
  // Jumlah target setelah import.
  report.targetCountsAfter = {};
  for (const table of Object.keys(plan)) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    report.targetCountsAfter[table] = row.n;
  }
}

async function runImport(connection, planByTable) {
  const specs = {
    berita: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambarUrl', 'penulis', 'status', 'createdAt', 'updatedAt'],
    pengumuman: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambarUrl', 'status', 'tanggal', 'createdAt', 'updatedAt'],
    prestasi: ['id', 'judul', 'slug', 'kategori', 'deskripsi', 'gambarUrl', 'instagramUrl', 'tingkat', 'tanggal', 'createdAt', 'updatedAt'],
    events: ['id', 'judul', 'ringkasan', 'deskripsi', 'kategori', 'tanggalMulai', 'waktuMulai', 'tanggalSelesai', 'waktuSelesai', 'lokasi', 'penyelenggara', 'gambarUrl', 'linkInformasi', 'status', 'createdAt', 'updatedAt'],
  };
  const dbColumns = {
    berita: { gambarUrl: 'gambar_url', createdAt: 'created_at', updatedAt: 'updated_at' },
    pengumuman: { gambarUrl: 'gambar_url', createdAt: 'created_at', updatedAt: 'updated_at' },
    prestasi: { gambarUrl: 'gambar_url', instagramUrl: 'instagram_url', createdAt: 'created_at', updatedAt: 'updated_at' },
    events: { tanggalMulai: 'tanggal_mulai', waktuMulai: 'waktu_mulai', tanggalSelesai: 'tanggal_selesai', waktuSelesai: 'waktu_selesai', gambarUrl: 'gambar_url', linkInformasi: 'link_informasi', createdAt: 'created_at', updatedAt: 'updated_at' },
  };
  const column = (table, field) => dbColumns[table]?.[field] || field;
  report.importResults = {};
  for (const [table, ops] of Object.entries(planByTable)) {
    const fields = specs[table];
    const cols = fields.map((f) => column(table, f));
    const insertable = ops.filter((o) => o.op === 'insert' || o.op === 'update');
    let done = 0; let errorCount = 0;
    for (let i = 0; i < insertable.length; i += BATCH) {
      const chunk = insertable.slice(i, i + BATCH);
      try {
        await connection.beginTransaction();
        for (const op of chunk) {
          const values = fields.map((f) => {
            const v = op.record[f];
            if (table === 'events' && f === 'tanggalMulai') return toDateOnly(v);
            return v === undefined ? null : v;
          });
          const placeholders = cols.map(() => '?').join(',');
          const updates = cols.filter((c) => c !== 'id').map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
          await connection.execute(
            `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
            values,
          );
          done += 1;
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        errorCount += chunk.length;
        report.importResults[`${table}:error`] = (report.importResults[`${table}:error`] || []).concat([{ error: err.message, batch: i / BATCH }]);
      }
    }
    report.importResults[table] = { attempted: insertable.length, written: done, failed: errorCount };
  }
}

function finishReport() {
  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, DO_IMPORT ? `import-report-${stamp}.json` : 'migration-plan.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`mode=${report.mode}`);
  console.log(`media: total=${report.media.total} available=${report.media.available} unresolved=${report.media.unresolved}`);
  console.log('categories:', JSON.stringify(report.categories));
  console.log('conflicts:', JSON.stringify(report.conflicts));
  console.log(`review=${report.review.count}`);
  if (report.importResults) console.log('import:', JSON.stringify(report.importResults));
  console.log(`report -> ${file}`);
}

finishReport();
if (db) await db.end();
