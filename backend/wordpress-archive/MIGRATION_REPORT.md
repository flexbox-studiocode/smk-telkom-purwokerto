# Laporan Migrasi WordPress

Status: **Phase 0–5 selesai; backup dan media selesai; staging/CSV review menunggu tindakan; import database utama belum dijalankan.**

## Bukti arsip

- File: `backend/wordpress-archive/wordpres_posts.sql`
- Ukuran: 41.018.870 byte
- `ic_posts`: 5.578 record
- INSERT statement: 764
- Tuple terpotong/arity salah: 0
- Tabel lain dalam dump: tidak ada
- `postmeta`, taxonomy, users: tidak tersedia

## Klasifikasi dry-run terakhir

| Target | Kandidat |
|---|---:|
| `berita` | 354 |
| `pengumuman` | 82 |
| `prestasi` | 124 |
| `events` | 56 |
| **total kandidat import** | **616** |
| `needs_review` | 244 |
| `skip` | 4.718 |

Kandidat tersebut belum masuk database utama. `needs_review` tidak ditulis.

## Media

Validasi URL read-only:

- URL media unik: 2.789
- tersedia sebagai `image/*`: 2.672
- unresolved: 104
- skip invalid/non-image: 13
- unresolved: 76 HTTP 404, 19 HTML, 9 network failure
- binary image dalam SQL: **tidak ada**

Download media: **selesai** (2026-11-22, `--media-only --media-download --media-concurrency=4`).

- entri manifest berstatus `ok`: 2.672
- file di disk: 2.663 (beberapa URL berbagi berkas setelah dedup nama)
- total byte di disk: ~993.697.080 byte (~948 MiB)
- lokasi: `backend/uploads/content-images/wordpress/` (diabaikan Git: `git check-ignore` cocok)
- manifest: `wordpress-archive/results/media-map.json`

Media unresolved (104) tetap tanpa berkas lokal; record yang hanya memuat gambar tersebut tidak mendapat `gambarUrl` (tidak ada path palsu).

## Database utama

Database target terverifikasi `smk_telkom_purwokerto`. Count sebelum pekerjaan:

| Tabel | Sebelum | Sesudah |
|---|---:|---:|
| `berita` | 13 | belum import |
| `pengumuman` | 11 | belum import |
| `prestasi` | 21 | belum import |
| `events` | 53 | belum import |
| `bkk` | 12 | belum import |
| `users` | 1 | belum import |
| `admins` | 1 | belum import |
| `site_settings` | 1 | belum import |
| `spmb_information` | 21 | belum import |
| `sessions` | 5 | belum import |

## Backup pre-import

Backup database + uploads sebelum pekerjaan ini dimulai:

```powershell
npm run db:backup -- --no-upload
npm run db:backup:verify -- --date=2026-11-22
```

| Objek | Status | Ukuran | SHA-256 |
|---|---|---:|----|
| Database (`mysql/2026/11/mysql-backup-2026-11-22.sql.gz.enc`) | PASS | 28.608 byte | `9adf7cd7...` |
| Uploads (`uploads/uploads-backup-2026-11-22.tar.gz.enc`) | PASS | 2.213.166 byte | `68d2b0e6...` |

Manifest: `backend/backups/manifests/backup-2026-11-22.json`

## File dibuat

- `backend/wordpress-archive/ANALYSIS.md`
- `backend/wordpress-archive/CONTENT_INVENTORY.md`
- `backend/wordpress-archive/MAPPING.md`
- `backend/wordpress-archive/MIGRATION_GUIDE.md`
- `backend/wordpress-archive/MIGRATION_REPORT.md` ← diperbarui saat ini
- `backend/wordpress-archive/src/analyze.mjs`
- `backend/wordpress-archive/src/migrate.mjs`
- `backend/wordpress-archive/src/export-review.mjs` ← skrip review CSV
- `backend/wordpress-archive/src/lib/base.js`
- `backend/wordpress-archive/src/lib/sql-parser.js`
- `backend/wordpress-archive/src/lib/classify.js`
- `backend/wordpress-archive/src/lib/sanitize.js`
- `backend/wordpress-archive/src/lib/transform.js`
- `backend/wordpress-archive/src/lib/media.js`
- `backend/wordpress-archive/src/lib/record.js`
- `backend/tests/wordpress-parser.test.js`
- `backend/tests/wordpress-sanitize.test.js`
- `backend/tests/wordpress-classify.test.js`
- `backend/tests/wordpress-record.test.js`
- `backend/wordpress-archive/results/review-queue.csv` ← 244 record perlu tinjauan
- `backend/wordpress-archive/results/import-candidates.csv` ← 616 kandidat siap import
- `backend/wordpress-archive/results/media-map.json` ← manifest media (diabaikan Git)
- `backend/package.json` scripts: `wp:analyze`, `wp:review`, `wp:dry-run`, `wp:import`
- `.gitignore`: `backend/wordpress-archive/results/`, `backend/uploads/content-images/wordpress/`

## Test

Targeted WordPress suite: **46 pass, 0 fail**.

Command:

```powershell
cd backend
node --import ./tests/setup.js --test --test-concurrency=1 tests/wordpress-parser.test.js tests/wordpress-sanitize.test.js tests/wordpress-classify.test.js tests/wordpress-record.test.js
```

Full `npm test` **terhenti di `tests/nexa-session.test.js`** (pre-existing, bukan perubahan WordPress). Semua test dalam file itu gagal dalam <1ms atau menggantung; penyebab terkait modul Stela/AI dan server `after` hook. File WordPress test tidak terimbas. Targeted suite dipakai sebagai gate selama migrasi WordPress; full suite perlu diperbaiki terpisah bila ingin dipakai sebagai gate.

## Git

- `b729c315abcbf33ed55fea5fe321b8e656fffe4f` — engine, parser, classifier, sanitizer, test
- `16c2870bc089114ea0bd2d65be767674460eba93` — dokumentasi dan runbook
- Keduanya sudah dipush ke `origin/main`.
- Perubahan media download, export review CSV, dan laporan terbaru perlu commit/push final.

## Pekerjaan tersisa

1. Terima kredensial admin MySQL di sesi ini, lalu periksa apakah `wordpress_archive` ada. Bila tidak ada, buat database staging dan import dump hanya ke sana.
2. Review `wordpress-archive/results/review-queue.csv` (244 record) dan `import-candidates.csv` (616 record). Tidak ada import utama sebelum keputusan review.
3. Perbaiki atau isolasi kegagalan pre-existing `tests/nexa-session.test.js` bila full suite harus menjadi gate.
4. Jalankan `--import --yes` hanya setelah review kandidat disetujui secara eksplisit.
5. Validasi count/API, idempotensi re-run, commit final, push tanpa force.
