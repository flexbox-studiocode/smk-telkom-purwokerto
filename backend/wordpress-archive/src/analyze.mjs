#!/usr/bin/env node
// Analisis arsip WordPress (read-only) -> menghasilkan laporan & statistik.
// Usage: node src/analyze.mjs [--sql=<path>] [--out=<dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSqlFile } from './lib/sql-parser.js';
import { classifyPost } from './lib/classify.js';
import { resolveTitle, contentStats, extractContentImageUrls, isImageGuid } from './lib/transform.js';
import { parseMysqlDate } from './lib/base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const SQL = path.resolve(args.sql || path.join(__dirname, '..', 'wordpres_posts.sql'));
const OUT_DIR = path.resolve(args.out || path.join(__dirname, '..', 'results'));

const startedAt = new Date().toISOString();
const { rows, stats } = readSqlFile(fs, SQL);

const byType = {};
const byStatus = {};
const byTypeStatus = {};
const byYear = {};
const byCategory = {};
const reviewSamples = [];
const categorySamples = {};
const mediaUrls = new Set();
const attachmentGuids = new Set();
let noTitle = 0;
let imagePosts = 0;

for (const row of rows) {
  const type = row.post_type || '(none)';
  const status = row.post_status || '(none)';
  byType[type] = (byType[type] || 0) + 1;
  byStatus[status] = (byStatus[status] || 0) + 1;
  byTypeStatus[`${type}/${status}`] = (byTypeStatus[`${type}/${status}`] || 0) + 1;
  const date = parseMysqlDate(row.post_date);
  const year = date ? String(date.getUTCFullYear()) : '(invalid)';
  byYear[year] = (byYear[year] || 0) + 1;

  const title = resolveTitle(row);
  if (/^\(tanpa judul/.test(title)) noTitle += 1;

  const cs = contentStats(row.post_content);
  if (cs.imageCount > 0) imagePosts += 1;
  for (const url of extractContentImageUrls(row.post_content)) mediaUrls.add(url);

  if (type === 'attachment' && isImageGuid(row.guid)) attachmentGuids.add(row.guid);

  const { category, reasons } = classifyPost(row);
  byCategory[category] = (byCategory[category] || 0) + 1;
  if (!categorySamples[category]) categorySamples[category] = [];
  if (categorySamples[category].length < 8) {
    categorySamples[category].push({ id: row.ID, type, status, title: title.slice(0, 90), reason: reasons.join('; ') });
  }
  if (category === 'needs_review' && reviewSamples.length < 60) {
    reviewSamples.push({ id: row.ID, type, status, title: title.slice(0, 100), reason: reasons.join('; '), plain: cs.plainLength, raw: cs.rawLength });
  }
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  sqlFile: path.relative(process.cwd(), SQL).replace(/\\/g, '/'),
  parser: stats,
  recordCount: rows.length,
  byType,
  byStatus,
  byTypeStatus,
  byYear,
  byCategory,
  counts: {
    total: rows.length,
    noTitle,
    postsWithInlineImage: imagePosts,
    distinctInlineImageUrls: mediaUrls.size,
    imageAttachmentGuids: attachmentGuids.size,
  },
  categorySamples,
  reviewSamples,
  mediaUrlSample: [...mediaUrls].slice(0, 40),
  attachmentGuidSample: [...attachmentGuids].slice(0, 40),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, 'dry-run.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`sql=${report.sqlFile}`);
console.log(`parsed rows=${rows.length} inserts=${stats.inserts} skippedTuples=${stats.skippedTuples}`);
console.log('byType:', JSON.stringify(byType));
console.log('byStatus:', JSON.stringify(byStatus));
console.log('byCategory:', JSON.stringify(byCategory));
console.log(`imagePosts=${imagePosts} inlineImgUrls=${mediaUrls.size} attachmentGuids=${attachmentGuids.size} noTitle=${noTitle}`);
console.log(`report -> ${outPath}`);
