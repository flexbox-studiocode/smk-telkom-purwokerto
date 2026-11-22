#!/usr/bin/env node
// Ekspor antrean review + kandidat import ke CSV (read-only, tanpa DB).
// Usage: node src/export-review.mjs [--sql=<path>] [--out=<dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSqlFile } from './lib/sql-parser.js';
import { mapPost, emptySlugRegistry, indexManifest } from './lib/record.js';
import { contentStats } from './lib/transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const ROOT = path.resolve(__dirname, '..');
const SQL = path.resolve(args.sql || path.join(ROOT, 'wordpres_posts.sql'));
const OUT_DIR = path.resolve(args.out || path.join(ROOT, 'results'));
const MANIFEST = path.join(OUT_DIR, 'media-map.json');

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}
function toCsv(header, rows) {
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return `${lines.join('\n')}\n`;
}

const { rows } = readSqlFile(fs, SQL);
let manifestIndex = new Map();
if (fs.existsSync(MANIFEST)) {
  const saved = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  manifestIndex = indexManifest(Array.isArray(saved) ? saved : (saved.items || []));
}
const usedSlugs = emptySlugRegistry();

const review = [];
const candidates = [];
for (const post of rows) {
  const mapped = mapPost(post, { usedSlugs, manifestIndex });
  const cs = contentStats(post.post_content);
  if (mapped.category === 'needs_review') {
    review.push([
      post.ID, post.post_type, post.post_status, post.post_date,
      mapped.source.slug || '', mapped.source.url || '',
      cs.plainLength, (mapped.reasons || []).join('; '),
    ]);
  } else if (mapped.record) {
    candidates.push([
      mapped.target, post.ID, mapped.record.slug, post.post_status, post.post_date,
      mapped.record.judul, mapped.record.gambarUrl ? 'img' : '', mapped.source.url || '',
      (mapped.reasons || []).join('; '),
    ]);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'review-queue.csv'), toCsv(
  ['wp_id', 'post_type', 'post_status', 'post_date', 'source_slug', 'source_url', 'plain_length', 'reason'], review,
));
fs.writeFileSync(path.join(OUT_DIR, 'import-candidates.csv'), toCsv(
  ['target', 'wp_id', 'slug', 'post_status', 'post_date', 'judul', 'media', 'source_url', 'reason'], candidates,
));

console.log(`review-queue.csv: ${review.length} baris`);
console.log(`import-candidates.csv: ${candidates.length} baris`);
console.log(`output -> ${OUT_DIR}`);
