# Laporan Migrasi WordPress

Status: **PHASE 0-5 selesai; import database utama belum dijalankan.**

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
- download aktual: **belum dilakukan**
- binary image dalam SQL: **tidak ada**

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

Tidak ada perubahan database utama. Backup baru tidak dibuat karena kredensial/privilege untuk operasi backup administrator belum tersedia; backup lama terenkripsi ada di `backend/backups/`, tetapi tidak dipakai sebagai pre-import backup baru.

## File dibuat

- `backend/wordpress-archive/ANALYSIS.md`
- `backend/wordpress-archive/CONTENT_INVENTORY.md`
- `backend/wordpress-archive/MAPPING.md`
- `backend/wordpress-archive/MIGRATION_GUIDE.md`
- `backend/wordpress-archive/src/analyze.mjs`
- `backend/wordpress-archive/src/migrate.mjs`
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
- `backend/package.json` scripts: `wp:analyze`, `wp:dry-run`, `wp:import`
- `.gitignore`: hasil `wordpress-archive/results/` diabaikan

## Test

Targeted WordPress suite: **44 pass, 0 fail**.

Command:

```powershell
cd backend
node --import ./tests/setup.js --test --test-concurrency=1 tests/wordpress-parser.test.js tests/wordpress-sanitize.test.js tests/wordpress-classify.test.js tests/wordpress-record.test.js
```

Full `npm test` dijalankan; hasil final command masih menunggu penyelesaian di harness saat laporan ini ditulis. Jangan klaim full suite lulus sebelum output final dibaca.

## Git

- Commit: `b729c315abcbf33ed55fea5fe321b8e656fffe4f`
- Push sebelum dokumentasi tambahan: berhasil ke `origin/main`
- Dokumentasi/bugfix setelah commit tersebut perlu commit baru dan push baru.

## Pekerjaan tersisa

1. Buat backup pre-import baru dengan akun administrator dan verifikasi non-empty.
2. Buat/periksa database staging `wordpress_archive`; jangan destruktif bila sudah berisi data.
3. Review 244 record `needs_review` dan kandidat 616 record.
4. Putuskan izin download 2.672 media.
5. Jalankan media download bila disetujui.
6. Jalankan `--import --yes` hanya setelah backup dan review disetujui.
7. Validasi count/API dan buat commit final.
