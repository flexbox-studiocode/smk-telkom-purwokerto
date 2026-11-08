import test from 'node:test';
import assert from 'node:assert/strict';
import { jakartaDate, parseStorageObjectUrl, TABLES } from '../scripts/etl/transform.mjs';
import { storage } from '../src/utils/storage.js';

test('site_visitors memakai tanggal bisnis Asia/Jakarta', () => {
  assert.equal(jakartaDate('2026-11-04T16:59:59.000Z'), '2026-11-04');
  assert.equal(jakartaDate('2026-11-04T17:00:00.000Z'), '2026-11-05');
  const spec = TABLES.find((entry) => entry.table === 'site_visitors');
  assert.deepEqual(spec.insert, ['visitor_hash', 'day', 'created_at']);
});

test('ETL mengenali storage publik dan privat', () => {
  assert.deepEqual(parseStorageObjectUrl('https://example.supabase.co/storage/v1/object/public/content-images/a%20b.png'), {
    visibility: 'public', bucket: 'content-images', objectPath: 'a b.png',
  });
  assert.deepEqual(parseStorageObjectUrl('https://example.supabase.co/storage/v1/object/authenticated/ppdb-documents/submissions/u/document.pdf'), {
    visibility: 'private', bucket: 'ppdb-documents', objectPath: 'submissions/u/document.pdf',
  });
});

test('storage menolak path traversal', () => {
  assert.throws(() => storage.localPath('content-images', '../secret.txt'));
  assert.throws(() => storage.localPath('content-images', 'a/../../secret.txt'));
  assert.throws(() => storage.localPath('content-images', 'a\\..\\secret.txt'));
});
