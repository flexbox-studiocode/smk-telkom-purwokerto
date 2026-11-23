// Validasi struktur dump WordPress sebelum diproses.
//
// Dump SQL diperlakukan sebagai DATA, bukan kode. Modul ini hanya memecah
// statement dan mengenali jenisnya; tidak pernah mengeksekusi SQL dan tidak
// memakai koneksi database untuk membaca isi file. Statement yang berpotensi
// mengubah database (ALTER/UPDATE/DELETE/TRUNCATE/GRANT/CALL/...) ditolak.
import { splitSqlStatements, parseInsertStatement, parseInsertColumns } from '../../wordpress-archive/src/lib/sql-parser.js';

export const CONTENT_TABLE = 'ic_posts';
export const REQUIRED_COLUMNS = [
  'ID',
  'post_author',
  'post_date',
  'post_content',
  'post_title',
  'post_excerpt',
  'post_status',
  'post_name',
  'post_modified',
  'post_type',
  'guid',
];

const IGNORED_KEYWORDS = new Set(['SET', 'LOCK', 'UNLOCK', 'START', 'COMMIT', 'BEGIN', 'USE', 'FLUSH']);
const REJECTED_KEYWORDS = new Set([
  'UPDATE', 'DELETE', 'TRUNCATE', 'REPLACE', 'GRANT', 'REVOKE', 'CALL', 'LOAD',
  'HANDLER', 'PREPARE', 'EXECUTE', 'DEALLOCATE', 'RENAME', 'ANALYZE', 'OPTIMIZE', 'REPAIR',
]);

export class DumpValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'DumpValidationError';
    this.code = 'invalid_sql_dump';
    this.details = details;
  }
}

function snippet(sql) {
  return String(sql ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Membuang komentar di awal statement (termasuk komentar kondisional
// /*!40101 ... */ yang lazim pada dump phpMyAdmin).
export function stripLeadingComments(sql) {
  let text = String(sql ?? '');
  for (;;) {
    const trimmed = text.replace(/^\s+/, '');
    if (trimmed.startsWith('--') || trimmed.startsWith('#')) {
      const newline = trimmed.indexOf('\n');
      text = newline === -1 ? '' : trimmed.slice(newline + 1);
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const close = trimmed.indexOf('*/');
      text = close === -1 ? '' : trimmed.slice(close + 2);
      continue;
    }
    return trimmed;
  }
}

const tableName = (raw) => String(raw ?? '').replace(/`/g, '').trim();

export function classifyStatement(sql, index = 0) {
  const cleaned = stripLeadingComments(sql);
  if (!cleaned) return { kind: 'ignore', table: null, reason: 'komentar/kosong' };
  const keywordMatch = /^([A-Za-z]+)/.exec(cleaned);
  if (!keywordMatch) {
    throw new DumpValidationError('Statement SQL tidak dikenal.', { statement: index + 1, preview: snippet(cleaned) });
  }
  const keyword = keywordMatch[1].toUpperCase();

  if (keyword === 'INSERT') {
    const match = /^INSERT\s+(?:LOW_PRIORITY\s+|DELAYED\s+|HIGH_PRIORITY\s+)?(?:IGNORE\s+)?INTO\s+`?([^`\s(]+)`?/i.exec(cleaned);
    if (!match) {
      throw new DumpValidationError('Statement INSERT tidak valid.', { statement: index + 1, preview: snippet(cleaned) });
    }
    const table = tableName(match[1]);
    if (table !== CONTENT_TABLE) return { kind: 'ignore', table, reason: 'tabel lain diabaikan' };
    return { kind: 'insert', table };
  }

  if (keyword === 'CREATE') {
    const match = /^CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([^`\s(]+)`?/i.exec(cleaned);
    if (!match) {
      throw new DumpValidationError('Statement CREATE tidak didukung (hanya CREATE TABLE).', { statement: index + 1, preview: snippet(cleaned) });
    }
    const table = tableName(match[1]);
    if (table !== CONTENT_TABLE) return { kind: 'ignore', table, reason: 'tabel lain diabaikan' };
    return { kind: 'create-table', table, sql: cleaned };
  }

  if (keyword === 'DROP') {
    if (/^DROP\s+(?:TEMPORARY\s+)?TABLE\s+/i.test(cleaned)) return { kind: 'ignore', table: null, reason: 'DROP TABLE diabaikan (tidak dieksekusi)' };
    throw new DumpValidationError('Statement DROP tidak diizinkan.', { statement: index + 1, preview: snippet(cleaned) });
  }

  if (IGNORED_KEYWORDS.has(keyword)) return { kind: 'ignore', table: null, reason: `statement ${keyword} diabaikan` };
  // ALTER TABLE pada dump hanya berisi definisi index/constraint. Statement ini
  // TIDAK pernah dieksekusi; hanya diabaikan agar dump phpMyAdmin lazim diterima.
  if (keyword === 'ALTER') return { kind: 'ignore', table: null, reason: 'ALTER TABLE diabaikan (tidak dieksekusi)' };
  if (REJECTED_KEYWORDS.has(keyword)) {
    throw new DumpValidationError(`Statement ${keyword} tidak diizinkan di dalam dump.`, { statement: index + 1, preview: snippet(cleaned) });
  }
  throw new DumpValidationError(`Statement ${keyword} tidak dikenal dan ditolak.`, { statement: index + 1, preview: snippet(cleaned) });
}

function columnsFromCreateTable(sql) {
  const columns = [];
  const openParen = sql.indexOf('(');
  if (openParen === -1) return columns;
  const body = sql.slice(openParen + 1);
  for (const line of body.split('\n')) {
    const match = /^\s*`([^`]+)`\s/.exec(line);
    if (match) columns.push(match[1]);
  }
  return columns;
}

// Menelusuri seluruh dump. Mengembalikan ringkasan validasi; baris ic_posts
// dikirim ke `onRow` satu per satu agar tidak menahan seluruh isi di memori
// sebagai objek tambahan.
export function scanDump(text, { onRow, onProgress } = {}) {
  const summary = {
    statements: 0,
    inserts: 0,
    rows: 0,
    skippedTuples: 0,
    ignoredStatements: 0,
    contentTableFound: false,
    columns: new Set(),
  };
  const total = text.length || 1;
  let index = 0;
  for (const { sql, end } of splitSqlStatements(text)) {
    const classified = classifyStatement(sql, index);
    summary.statements += 1;
    index += 1;
    if (classified.kind === 'ignore') {
      summary.ignoredStatements += 1;
    } else if (classified.kind === 'create-table') {
      summary.contentTableFound = true;
      for (const column of columnsFromCreateTable(classified.sql)) summary.columns.add(column);
    } else if (classified.kind === 'insert') {
      summary.contentTableFound = true;
      summary.inserts += 1;
      const parsed = parseInsertStatement(sql);
      if (!parsed.columns) {
        throw new DumpValidationError('Statement INSERT ic_posts tidak memiliki daftar kolom/VALUES yang valid.', {
          statement: index,
          preview: snippet(sql),
        });
      }
      for (const column of parsed.columns) summary.columns.add(column);
      summary.skippedTuples += parsed.skippedTuples;
      for (const row of parsed.rows) {
        summary.rows += 1;
        if (onRow) onRow(row);
      }
    }
    if (onProgress) onProgress(Math.min(1, end / total));
  }

  assertDumpComplete(summary);
  return summary;
}

function assertDumpComplete(summary) {
  if (!summary.contentTableFound) {
    throw new DumpValidationError(`Tabel ${CONTENT_TABLE} tidak ditemukan di dalam dump.`, { table: CONTENT_TABLE });
  }
  const missing = REQUIRED_COLUMNS.filter((column) => !summary.columns.has(column));
  if (missing.length > 0) {
    throw new DumpValidationError(`Kolom wajib ${CONTENT_TABLE} tidak lengkap.`, { missingColumns: missing });
  }
}

// Tahap 1: validasi struktur tanpa mengurai VALUES (murah, menolak dump yang
// tidak didukung sebelum ada baris arsip yang disimpan).
export function validateDumpStructure(text) {
  const summary = {
    statements: 0,
    inserts: 0,
    ignoredStatements: 0,
    contentTableFound: false,
    columns: new Set(),
  };
  let index = 0;
  for (const { sql } of splitSqlStatements(text)) {
    const classified = classifyStatement(sql, index);
    summary.statements += 1;
    index += 1;
    if (classified.kind === 'ignore') { summary.ignoredStatements += 1; continue; }
    if (classified.kind === 'create-table') {
      summary.contentTableFound = true;
      for (const column of columnsFromCreateTable(classified.sql)) summary.columns.add(column);
      continue;
    }
    if (classified.kind === 'insert') {
      summary.contentTableFound = true;
      summary.inserts += 1;
      const valuesIndex = sql.search(/\bVALUES\b/i);
      const valuesPart = valuesIndex === -1 ? '' : sql.slice(valuesIndex + 6).trim();
      if (!valuesPart.startsWith('(') || !valuesPart.endsWith(')')) {
        throw new DumpValidationError('Statement INSERT ic_posts terpotong atau malformed.', { statement: index, preview: snippet(sql) });
      }
      const columns = parseInsertColumns(sql.slice(0, valuesIndex));
      if (!columns) {
        throw new DumpValidationError('Statement INSERT ic_posts tidak memiliki daftar kolom.', { statement: index, preview: snippet(sql) });
      }
      for (const column of columns) summary.columns.add(column);
    }
  }
  assertDumpComplete(summary);
  return summary;
}

// Tahap 2: menghasilkan baris ic_posts satu per satu. Dapat di-await sehingga
// pemanggil dapat flush batch ke database tanpa menahan seluruh dump di memori.
export async function* iterateDumpRows(text, stats = { rows: 0, skippedTuples: 0 }, { onProgress } = {}) {
  const total = text.length || 1;
  let index = 0;
  for (const { sql, end } of splitSqlStatements(text)) {
    const classified = classifyStatement(sql, index);
    index += 1;
    if (classified.kind !== 'insert') {
      if (onProgress) onProgress(Math.min(1, end / total));
      continue;
    }
    const parsed = parseInsertStatement(sql);
    if (!parsed.columns) {
      throw new DumpValidationError('Statement INSERT ic_posts tidak memiliki daftar kolom/VALUES yang valid.', {
        statement: index,
        preview: snippet(sql),
      });
    }
    stats.skippedTuples += parsed.skippedTuples;
    for (const row of parsed.rows) {
      stats.rows += 1;
      yield row;
    }
    if (onProgress) onProgress(Math.min(1, end / total));
  }
}

// Pemeriksaan cepat (tanpa parsing penuh) untuk menolak file yang jelas bukan
// dump SQL sebelum disimpan. Bukan pengganti scanDump.
export function looksLikeSqlDump(headText) {
  const head = String(headText ?? '');
  if (!head.trim()) return false;
  return /(?:^|\n)\s*(?:--|#|\/\*)/.test(head) || /\b(?:INSERT\s+INTO|CREATE\s+TABLE|DROP\s+TABLE)\b/i.test(head);
}