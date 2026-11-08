import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';
import { reserveQuota } from '../src/routes/ai.js';
import { EVENT_CATEGORIES } from '../src/routes/events.js';

let server;
let baseUrl;
const testDay = new Date('2099-01-01T00:00:00.000Z');

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await prisma.aiDailyAttempt.deleteMany({ where: { day: testDay } });
});

after(async () => {
  await prisma.aiDailyAttempt.deleteMany({ where: { day: testDay } });
  await new Promise((r) => server.close(r));
  await closeDatabase();
});

test('kuota AI tetap atomik pada request bersamaan', async () => {
  const limit = 3;
  const results = await Promise.all(Array.from({ length: 12 }, () => reserveQuota('nexttel', limit, testDay)));
  assert.equal(results.filter(Boolean).length, limit, 'jumlah yang lolos harus tepat sama dengan limit');
  const row = await prisma.aiDailyAttempt.findUnique({ where: { feature_day: { feature: 'nexttel', day: testDay } } });
  assert.equal(row.attempts, limit);
});

test('enum kategori events mencakup seluruh nilai database', () => {
  const required = ['kegiatan', 'akademik', 'lomba', 'karier', 'lainnya', 'awal-pkl', 'penilaian-siswa', 'libur-akhir-semester', 'cuti-bersama', 'libur-tahun-pelajaran', 'hari-pertama-sekolah', 'upacara-nasional', 'hut-smk', 'libur-ramadhan', 'perkiraan-kelulusan'];
  for (const value of required) assert.ok(EVENT_CATEGORIES.includes(value), `kategori ${value} hilang`);
  assert.equal(EVENT_CATEGORIES.length, required.length);
});