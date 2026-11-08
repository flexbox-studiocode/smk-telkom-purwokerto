# Laporan Implementasi Migrasi MySQL — SMK Telkom Purwokerto

Diperbarui: 2026-11-05 (revisi 3). Status dinyatakan apa adanya; item tanpa
kredensial eksternal tetap **BLOCKED**, bukan diklaim PASS.

---

## 1. Ringkasan Status

| Area | Status | Bukti |
|---|---|---|
| MySQL 8.4 sebagai DB operasional | PASS | Backend hanya konek MySQL via Prisma; 4 migrasi applied |
| Prisma schema & migrate status | PASS | `prisma validate` OK; `migrate status` up to date |
| ETL data publik | PASS | 131 record (berita 13, pengumuman 11, prestasi 21, bkk 12, events 52, spmb 21, settings 1) |
| ETL `site_visitors.day` | PASS (unit test) | `day` kini masuk kolom INSERT, zona Asia/Jakarta |
| ETL `ai_daily_attempts` | BLOCKED_RLS | Anon 401/42501; butuh service role key |
| Migrasi `users`/`auth_tokens`/`sessions` | BLOCKED | Tidak terekspos via REST anon; prosedur recovery admin disediakan |
| Private PPDB documents | BLOCKED (sumber kosong) | Kode unduh privat siap; butuh service role key |
| Admin recovery (`seed.mjs`) | PASS | Diuji: User+Admin dibuat, idempoten, login shape benar |
| Kuota AI atomik | PASS | Test konkuren: tepat `limit` request lolos |
| Enum kategori events | PASS | Zod disamakan dengan 14 nilai DB |
| Path traversal storage | PASS | Test menolak `..` pada key |
| Backup lokal terenkripsi | PASS | Manifest v2 + checksum SHA-256 |
| Backup upload Supabase | BLOCKED | `SUPABASE_SERVICE_ROLE_KEY`/bucket tidak tersedia |
| Verifikasi remote backup | BLOCKED | Butuh kredensial Supabase |
| Retensi 30 hari lokal | PASS | Berbasis tanggal nama file, Asia/Jakarta |
| Retensi 30 hari remote | BLOCKED (kode siap) | Butuh kredensial Supabase |
| Restore dari backup lokal | PASS | DB test, semua count cocok manifest |
| Restore dari Supabase | BLOCKED | Butuh kredensial Supabase |
| Guard restore (key salah, produksi, traversal) | PASS | Key salah → GCM auth gagal; produksi butuh flag |
| Scheduler Windows/Linux | PASS Windows / NOT TESTED Linux | Task dibuat+eksekusi+log+lock; Linux hanya ditinjau |
| Backend tests | PASS | 45/45 (termasuk 25 test util backup) |
| Frontend lint/typecheck/build | PASS | eslint bersih, tsc bersih, 102 rute prerender |
| Dependency Supabase runtime | PASS | 0 referensi di `backend/src` dan `frontend/src` |
| Dokumentasi `backend/docs-mysql/` | PASS | 17 dokumen + README |
| Deployment VPS | BLOCKED | Tidak ada akses VPS/DNS/TLS/kredensial |

---

## 2. Temuan Audit dan Perbaikan (Revisi 2)

| # | Tingkat | Temuan | Perbaikan |
|---|---|---|---|
| 1 | CRITICAL | `seed.mjs` memakai field `email/name/passwordHash` yang tidak ada di model `Admin`; admin recovery gagal | Buat/reuse `User` lalu `Admin { userId, nama }` dalam transaksi |
| 2 | CRITICAL | ETL `site_visitors` menyetel `row.day` tetapi `day` tidak ada di kolom INSERT (PK NOT NULL) | Kolom `insert` terpisah dari `select`; `day` diturunkan dari `created_at` zona Asia/Jakarta |
| 3 | HIGH | ETL hanya me-rewrite `gambar_url`,`logo_url`; `dokumen_url` privat terlewat | Inventaris kolom URL per tabel; publik diunduh, privat via service role dan tidak dijadikan URL publik |
| 4 | HIGH | Zod enum `events.kategori` hanya 5 nilai; DB 14 nilai | Enum Zod disamakan; event kalender dapat CRUD |
| 5 | HIGH | Kuota AI tidak atomik (upsert+cek+decrement) | `INSERT IGNORE` + `SELECT ... FOR UPDATE` dalam transaksi |
| 6 | HIGH | Manifest remote tidak pernah berstatus `uploaded`; upload manifest terjadi sebelum status diubah | Alur `LOCAL_CREATED → REMOTE_UPLOADED → REMOTE_VERIFIED`; manifest final diunggah dan dibaca ulang |
| 7 | HIGH | Cleanup remote tidak menelusuri folder bertingkat dan tanpa paginasi | Listing rekursif + paginasi 100; error listing/delete melempar error |
| 8 | HIGH | Restore hanya lokal; tanpa validasi manifest/checksum/count; `tar` tanpa guard traversal | Restore lokal+remote, validasi manifest/checksum/count, guard archive |
| 9 | HIGH | `storage.js` `safeSegment` membiarkan `..` | Tolak `.`/`..`/null byte dan verifikasi path di dalam `UPLOAD_ROOT` |
| 10 | MEDIUM | Timezone `site_visitors`/stats tidak konsisten (UTC vs lokal) | Util `src/utils/date.js` zona Asia/Jakarta dipakai ETL dan `stats.js` |
| 11 | MEDIUM | Scheduler XML namespace salah dan `Command=node` tanpa path absolut | Namespace diperbaiki; path absolut + `EnvironmentFile` systemd |
| 12 | MEDIUM | `backup-verify` tidak memvalidasi field manifest/fingerprint key | Validasi field wajib, fingerprint, dan opsi `--remote` |
| 13 | MEDIUM | `backend/.env.example` tidak lengkap | Tambah `SUPABASE_*`, path `MYSQLDUMP_PATH`/`MYSQL_PATH` |

---

## 3. Hasil ETL

Sumber: Supabase REST (read-only). Metode: `backend/scripts/etl/migrate.mjs`.
Ringkasan terakhir yang tersimpan: `backend/docs/etl-summary-2026-11-04T14-58-05-376Z.json`.

| Tabel | Sumber | Diimpor | Target | Status |
|---|---|---|---|---|
| site_settings | 1 | 1 | 1 | PASS |
| berita | 13 | 13 | 13 | PASS |
| pengumuman | 11 | 11 | 11 | PASS |
| prestasi | 21 | 21 | 21 | PASS |
| bkk | 12 | 12 | 12 | PASS |
| events | 52 | 52 | 52 | PASS |
| spmb_information | 21 | 21 | 21 | PASS |
| admins | 0 | 0 | 0 | PASS |
| ppdb | 0 | 0 | 0 | PASS |
| ppdb_drafts | 0 | 0 | 0 | PASS |
| site_visitors | 0 | 0 | 1 (derived) | PASS |
| ai_daily_attempts | — | 0 | n/a | BLOCKED_RLS |

Catatan: `site_visitors` sumber 0 baris, sehingga bug kolom `day` tidak pernah
memicu error saat ETL lama. Bug diperbaiki dan kini diuji unit.

---

## 4. Backup & Restore (teruji lokal)

- `npm run db:backup -- --no-upload` → `status: LOCAL_CREATED`.
- Objek: `mysql-backup-2026-11-04.sql.gz.enc` (27.714 byte) dan
  `uploads-backup-2026-11-04.tar.gz.enc` (2.213.059 byte).
- Manifest v2 memuat `schemaVersion`, `tableCounts`, checksum SHA-256,
  fingerprint key, dan status.
- `npm run db:backup:verify` → semua objek PASS.
- Restore ke `smk_restore_test_v2` → semua jumlah baris cocok manifest.
- Restore uploads → **26 file** = 26 file sumber.
- Key salah → `Unsupported state or unable to authenticate data` (GCM).
- Restore ke DB production tanpa flag → ditolak.
- Database test di-drop setelah pengujian.

Restore memerlukan database tujuan yang sudah ada dan user pada `DATABASE_URL`
memiliki privilege ke database tersebut. Ini didokumentasikan di
`backend/docs-mysql/14-RESTORE-DATABASE.md`.

---

## 5. Perubahan Kode Utama (Revisi 2)

### Backend
- `scripts/seed.mjs` — perbaikan bootstrap admin (User + Admin).
- `scripts/etl/transform.mjs` — helper murni ETL (tanggal Jakarta, parser storage, spesifikasi tabel).
- `scripts/etl/migrate.mjs` — kolom insert terpisah, `site_visitors.day`, inventaris URL storage, dokumen privat, orphan admin.
- `scripts/backup.mjs` — status manifest akurat, verifikasi manifest remote, cleanup rekursif/paginasi, cutoff Asia/Jakarta.
- `scripts/backup-verify.mjs` — validasi manifest + fingerprint + opsi remote.
- `scripts/restore.mjs` — restore lokal/remote, manifest/checksum/count, guard production & traversal, deteksi target uploads.
- `scripts/archive-safe.mjs` — validasi path traversal pada tar.
- `src/utils/storage.js` — proteksi path traversal.
- `src/utils/date.js` — tanggal bisnis Asia/Jakarta.
- `src/routes/ai.js` — kuota atomik (`SELECT ... FOR UPDATE`); `reserveQuota` diekspor untuk test.
- `src/routes/events.js` — enum kategori lengkap.
- `src/routes/stats.js` — konsistensi zona Jakarta.
- `tests/etl.test.js`, `tests/quota-events.test.js` — regression test.

### Dokumentasi
- `backend/docs-mysql/` — 17 dokumen + README.
- `docs/MYSQL_BACKUP_GUIDE.md`, `docs/MYSQL_RUN_GUIDE.md` — disesuaikan dengan implementasi.
- `backend/scripts/etl/README.md`, `backend/.env.example`, `backend/schedulers/*`.

---

## 6. BLOCKED — tidak diklaim selesai

1. **Upload/verifikasi/retensi remote Supabase** — `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, dan bucket `mysql-backups` tidak tersedia.
2. **ETL `ai_daily_attempts`** — RLS menolak anon read. Butuh service role key
   atau grant read-only terkontrol.
3. **Migrasi `users`/`auth_tokens`/`sessions` dan dokumen PPDB privat** —
   Supabase Auth tidak terekspos via REST anon. Prosedur recovery admin
   (`ADMIN_RECOVERY_*`) dan reset password disediakan.
4. **NEXA/STELA live** — tidak ada provider key; endpoint mengembalikan 503 jujur.
5. **Deployment VPS** — tidak ada akses VPS/DNS/TLS/kredensial.
6. **Pengujian scheduler nyata** — template disiapkan dan diperbaiki, tetapi
   pembuatan task/timer pada OS host belum dijalankan dalam sesi ini.

---

## 7. Revisi 3 (2026-11-05) — Hardening Backup/Restore & Scheduler

- Modul bersama `src/utils/backup.js` (enkripsi, fingerprint, retensi, guard
  restore, validasi path, `withRetry`) + 25 unit test.
- Bug lock `backup.mjs`: handler `exit` memakai `require()` di ESM sehingga lock
  tidak pernah dibersihkan saat `process.exit()`; diperbaiki memakai `unlinkSync`.
- Upload remote anti-overwrite: object data identik dilewati, isi berbeda ditolak;
  manifest tetap boleh di-overwrite.
- Retry + backoff untuk upload/unduh/list/delete; 4xx tidak diulang.
- Restore memvalidasi fingerprint key manifest sebelum dekripsi.
- Scheduler Windows: installer path-dynamic, wrapper logging, template XML
  diperbaiki (namespace, elemen, urutan settings); diuji nyata pada host lokal.
- Retensi: object tanpa tanggal tidak dihapus; backup hari ini selalu aman.

## 8. Kesimpulan

Aplikasi berjalan di atas **MySQL 8.4** sebagai database operasional. Tidak ada
akses database Supabase saat runtime; Supabase hanya tujuan backup terenkripsi
(kode siap, eksekusi remote BLOCKED tanpa kredensial). Backup/restore lokal
teruji end-to-end. Seluruh bug audit CRITICAL/HIGH yang dapat diperbaiki tanpa
kredensial eksternal telah diperbaiki dan dilindungi test.