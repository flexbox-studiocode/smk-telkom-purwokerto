// Migrasi slug berita lama ke format `judul-berita-kode-3-8-digit`.
//
// Default: DRY-RUN. Tidak ada perubahan database sampai `--apply` diberikan.
// Aman untuk production: tidak mengubah isi, status, tanggal, gambar, penulis,
// atau metadata lain; hanya kolom `slug` dan tabel alias URL.
//
//   node scripts/migrate-berita-slugs.mjs              # pratinjau
//   node scripts/migrate-berita-slugs.mjs --apply      # tulis perubahan
//   node scripts/migrate-berita-slugs.mjs --limit 50   # batasi jumlah baris
import 'dotenv/config';
import { prisma, closeDatabase } from '../src/db.js';
import { generateBeritaSlug } from '../src/services/beritaSlug.js';

const FINAL_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]{2,7}$/;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : undefined;

async function main() {
  const rows = await prisma.berita.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, judul: true, slug: true, status: true },
    ...(limit ? { take: limit } : {}),
  });

  const pending = rows.filter((row) => !FINAL_SLUG_RE.test(row.slug));
  console.log(`[migrasi-slug-berita] mode=${apply ? 'APPLY' : 'DRY-RUN'} total=${rows.length} perlu_migrasi=${pending.length}`);

  const plan = [];
  const reserved = new Set(rows.map((row) => row.slug));
  for (const row of pending) {
    let slug = await generateBeritaSlug(row.judul);
    // Hindari bentrok dengan slug yang belum diproses dalam rencana ini.
    let guard = 0;
    while (reserved.has(slug) && guard < 12) { slug = await generateBeritaSlug(row.judul); guard += 1; }
    reserved.add(slug);
    plan.push({ id: row.id, status: row.status, from: row.slug, to: slug });
  }

  for (const entry of plan) {
    console.log(`  [${entry.status}] ${entry.from}  ->  ${entry.to}`);
  }

  if (!apply) {
    console.log('[migrasi-slug-berita] DRY-RUN selesai. Jalankan ulang dengan --apply untuk menyimpan.');
    return;
  }

  let updated = 0;
  for (const entry of plan) {
    await prisma.$transaction(async (tx) => {
      await tx.beritaSlugAlias.upsert({
        where: { slug: entry.from },
        create: { slug: entry.from, beritaId: entry.id },
        update: { beritaId: entry.id },
      });
      // Hanya kolom slug yang diubah; kolom lain tidak disentuh.
      await tx.berita.update({ where: { id: entry.id }, data: { slug: entry.to } });
    });
    updated += 1;
  }
  console.log(`[migrasi-slug-berita] APPLY selesai. ${updated} berita diperbarui, alias URL lama tercatat.`);
}

main()
  .catch((error) => {
    console.error('[migrasi-slug-berita] gagal:', error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
