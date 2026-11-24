import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBeritaWithSlug, generateBeritaSlug, recordBeritaSlugAlias } from '../src/services/beritaSlug.js';

// Nilai acak berurutan agar hasil deterministik tanpa mengubah kode produksi.
function sequenceRandomInt(values) {
  let index = 0;
  return (min, max) => {
    const value = values[index % values.length];
    index += 1;
    return Math.min(Math.max(value, min), max - 1);
  };
}

// DB palsu: meniru `berita` + `beritaSlugAlias` secukupnya untuk menguji retry.
function fakeDb({ taken = [] } = {}) {
  const rows = new Map(taken.map((slug) => [slug, true]));
  const created = [];
  const aliases = [];
  let createBehavior = () => null; // null = sukses; 'P2002' = konflik slug
  return {
    rows,
    created,
    aliases,
    setCreateBehavior(fn) { createBehavior = fn; },
    berita: {
      findUnique: async ({ where: { slug } }) => (rows.has(slug) ? { id: `existing:${slug}` } : null),
      create: async ({ data }) => {
        const behavior = createBehavior(data.slug);
        if (behavior === 'P2002') {
          const error = new Error('unique constraint');
          error.code = 'P2002';
          error.meta = { target: ['slug'] };
          throw error;
        }
        if (rows.has(data.slug)) {
          const error = new Error('unique constraint');
          error.code = 'P2002';
          error.meta = { target: ['slug'] };
          throw error;
        }
        rows.set(data.slug, true);
        created.push(data);
        return { id: `id-${created.length}`, ...data };
      },
    },
    beritaSlugAlias: {
      findUnique: async ({ where: { slug } }) => aliases.find((a) => a.slug === slug) ?? null,
      create: async ({ data }) => { aliases.push(data); return { id: `alias-${aliases.length}`, ...data }; },
      update: async ({ where: { slug }, data }) => {
        const found = aliases.find((a) => a.slug === slug);
        Object.assign(found, data);
        return found;
      },
    },
  };
}

test('generateBeritaSlug menghasilkan slug judul + kode 3-8 digit', async () => {
  const db = fakeDb();
  const slug = await generateBeritaSlug('Wapres Gibran Diganti Dasco', {
    db,
    randomInt: sequenceRandomInt([5, 4, 8, 2, 9, 1]),
  });
  assert.match(slug, /^wapres-gibran-diganti-dasco-[1-9][0-9]{4}$/);
});

test('generateBeritaSlug menghindari slug yang sudah terpakai', async () => {
  const first = await generateBeritaSlug('Sedang Dipakai', { db: fakeDb(), randomInt: sequenceRandomInt([3, 7, 3, 1]) });
  const db = fakeDb({ taken: [first] });
  const next = await generateBeritaSlug('Sedang Dipakai', { db, randomInt: sequenceRandomInt([3, 7, 3, 1, 3, 9, 9, 9]) });
  assert.notEqual(next, first);
  assert.match(next, /^sedang-dipakai-[1-9][0-9]{2}$/);
});

test('createBeritaWithSlug selalu menimpa slug kiriman klien', async () => {
  const db = fakeDb();
  const row = await createBeritaWithSlug(
    { judul: 'Berita Sekolah', slug: 'slug-palsu', konten: 'isi' },
    { db, randomInt: sequenceRandomInt([3, 7, 3, 1]) },
  );
  assert.match(row.slug, /^berita-sekolah-[1-9][0-9]{2}$/);
  assert.ok(!row.slug.includes('slug-palsu'));
});

test('createBeritaWithSlug retry saat bentrok unique constraint', async () => {
  const db = fakeDb();
  // Percobaan pertama bentrok (P2002 mengikuti data.slug), berikutnya sukses.
  let calls = 0;
  db.setCreateBehavior(() => { calls += 1; return calls === 1 ? 'P2002' : null; });
  const row = await createBeritaWithSlug({ judul: 'Bentrok Sekali', konten: 'isi' }, { db, randomInt: sequenceRandomInt([3, 4, 1, 1]) });
  assert.equal(calls, 2, 'harus mencoba ulang setelah P2002');
  assert.match(row.slug, /^bentrok-sekali-[1-9][0-9]{2}$/);
});

test('kegagalan non-slug tidak menghasilkan data parsial', async () => {
  const db = fakeDb();
  db.setCreateBehavior(() => { const error = new Error('DB down'); error.code = 'P1001'; throw error; });
  await assert.rejects(
    () => createBeritaWithSlug({ judul: 'Gagal Total', konten: 'isi' }, { db, randomInt: sequenceRandomInt([3, 4, 1, 1]) }),
    /DB down/,
  );
  assert.equal(db.created.length, 0, 'tidak ada baris parsial yang tersimpan');
});

test('recordBeritaSlugAlias idempoten dan memindahkan pemetaan bila berubah', async () => {
  const db = fakeDb();
  await recordBeritaSlugAlias('id-1', 'judul-lama', { db });
  await recordBeritaSlugAlias('id-1', 'judul-lama', { db });
  assert.equal(db.aliases.length, 1, 'tidak menduplikasi alias yang sama');
  await recordBeritaSlugAlias('id-2', 'judul-lama', { db });
  assert.equal(db.aliases[0].beritaId, 'id-2');
});

test('generateBeritaSlug melempar slug_generation_failed bila semua percobaan bentrok', async () => {
  // slugExists selalu true -> semua kandidat dianggap terpakai.
  const db = { berita: { findUnique: async () => ({ id: 'x' }) } };
  await assert.rejects(
    () => generateBeritaSlug('Selalu Bentrok', { db, maxAttempts: 3, randomInt: sequenceRandomInt([3, 4, 1, 1]) }),
    (error) => error.code === 'slug_generation_failed',
  );
});
