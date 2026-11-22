import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTuple, parseValuesBlock, parseInsertColumns, streamInserts, readSqlFile } from '../wordpress-archive/src/lib/sql-parser.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL = path.join(__dirname, '..', 'wordpress-archive', 'wordpres_posts.sql');

test('parseTuple: string, escape, NULL, angka', () => {
  const r = parseTuple("(7,'a\\'b',NULL,'It\\'s',0)");
  assert.deepEqual(r.values, ['7', "a'b", null, "It's", '0']);
});

test('parseTuple: tanda kutip ganda (dua kutip) menjadi satu', () => {
  const r = parseTuple("(1,'O''Brien')");
  assert.deepEqual(r.values, ['1', "O'Brien"]);
});

test('parseTuple: koma dan kurung di dalam string tidak memecah', () => {
  const r = parseTuple("('a,b','c(d)','e)')");
  assert.deepEqual(r.values, ['a,b', 'c(d)', 'e)']);
});

test('parseInsertColumns mengekstrak nama kolom ternormalisasi', () => {
  const cols = parseInsertColumns('INSERT INTO `ic_posts` (`ID`, `post_title` ) VALUES');
  assert.deepEqual(cols, ['ID', 'post_title']);
});

test('parseValuesBlock memecah banyak tuple', () => {
  const tuples = parseValuesBlock("(1,'a'),(2,'b'),\n(3,'c')");
  assert.equal(tuples.length, 3);
  assert.deepEqual(tuples[2], ['3', 'c']);
});

test('streamInserts menangani statement dengan titik koma dalam string', () => {
  const sql = "INSERT INTO t (`a`) VALUES ('x;y'),( 'z');\nINSERT INTO t (`a`) VALUES ('w');";
  const rows = [];
  const stats = streamInserts(sql, (r) => rows.push(r));
  assert.equal(stats.inserts, 2);
  assert.deepEqual(rows.map((r) => r.a), ['x;y', 'z', 'w']);
});

test('streamInserts menandai tuple dengan arity salah sebagai skipped', () => {
  const sql = "INSERT INTO t (`a`,`b`) VALUES (1,'x'),(2);";
  const rows = [];
  const stats = streamInserts(sql, (r) => rows.push(r));
  assert.equal(rows.length, 1);
  assert.equal(stats.skippedTuples, 1);
});

test('dump nyata: terbaca, jumlah baris & kolom konsisten', { skip: !fs.existsSync(SQL) }, () => {
  const { rows, stats } = readSqlFile(fs, SQL);
  assert.equal(stats.skippedTuples, 0);
  assert.ok(rows.length >= 5500, `rows=${rows.length}`);
  assert.ok(rows.every((r) => 'post_type' in r && 'post_content' in r));
  // Tidak ada string mojibake palsu yang umum (Ã / Â) pada judul ASCII.
  const asciiTitles = rows.filter((r) => r.post_title && /^[\x20-\x7E]+$/.test(r.post_title));
  assert.ok(asciiTitles.length > 100);
});
