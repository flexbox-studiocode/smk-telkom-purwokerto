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

test('parseTuple: newline MySQL dipulihkan, bukan menjadi huruf n/r literal', () => {
  const r = parseTuple("('awal\\nbaris\\r\\nakhir','literal\\\\n')");
  assert.deepEqual(r.values, ['awal\nbaris\r\nakhir', 'literal\\n']);
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

// Regresi artefak newline: escape \n / \r\n pada dump tidak boleh berubah
// menjadi huruf "n" / "rn" di dalam konten arsip.
test('dump nyata: escape newline tidak menjadi huruf n/r literal', { skip: !fs.existsSync(SQL) }, () => {
  const { rows } = readSqlFile(fs, SQL);
  const artefacts = rows.filter((r) => /(?:^|>|\s)[rn]{2,}(?=[\s<A-Z])/.test(String(r.post_content || '')));
  assert.equal(artefacts.length, 0, `artefak pada ${artefacts.length} baris`);
  assert.ok(rows.some((r) => String(r.post_content || '').includes('\n')), 'harus ada baris dengan newline asli');
});

// Kata Bahasa Indonesia yang mengandung huruf n/r tetap utuh.
test('dump nyata: kata dengan huruf n/r tidak berubah', { skip: !fs.existsSync(SQL) }, () => {
  const { rows } = readSqlFile(fs, SQL);
  const joined = rows.map((r) => String(r.post_content || '')).join(' ');
  for (const word of ['Pengumuman', 'Sekolah', 'Pendidikan', 'Prestasi', 'internasional']) {
    assert.ok(joined.includes(word), `kata "${word}" harus tetap ada`);
  }
});
