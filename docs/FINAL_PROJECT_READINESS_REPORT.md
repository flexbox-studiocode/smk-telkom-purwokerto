# Laporan Final Project Readiness

Diperbarui: 2026-11-05. Tidak ada deployment, SSH, perubahan DNS, firewall, atau
akses infrastruktur produksi yang dilakukan.

## Ringkasan Status

| Area | Status |
|---|---|
| MySQL 8.4 sebagai database operasional | PASS |
| Backup lokal terenkripsi | PASS |
| Verifikasi backup lokal | PASS |
| Upload/verifikasi remote Supabase | BLOCKED — credential service role tidak tersedia |
| Restore lokal end-to-end | PASS |
| Restore remote | BLOCKED — credential Supabase tidak tersedia |
| Restore negative/security tests | PASS |
| Migrasi data publik | PASS — 131 record |
| Data terlindungi RLS/private PPDB | BLOCKED — perlu service role/admin source access |
| Scheduler Windows | PASS — task lokal dibuat, dijalankan, log dan exit code diverifikasi |
| Scheduler Linux | NOT TESTED — tidak ada Linux VM/container pada sesi ini |
| Backend tests | PASS — 45/45 |
| Frontend lint/typecheck/build | PASS |
| Dependency audit | PASS backend production; BLOCKED follow-up frontend dev-only `vite` high |
| VPS deployment | NOT TESTED / BLOCKED — sengaja tidak dilakukan |
| Kesiapan dipindahkan ke VPS | READY FOR DEPLOYMENT (pre-deployment package), dengan blocker operasional di bawah |

`READY FOR DEPLOYMENT` berarti artefak dan prosedur siap diserahkan kepada
administrator. Status ini bukan izin deployment dan tidak berarti integrasi
remote sudah terverifikasi.

## 1. Yang Sudah Selesai

- MySQL 8.4 tetap menjadi database runtime tunggal; frontend tidak memiliki
  koneksi database atau Supabase runtime.
- Backup memakai AES-256-GCM, IV acak, authentication tag, checksum SHA-256,
  fingerprint key, manifest, status terpisah `LOCAL_CREATED`,
  `REMOTE_UPLOADED`, `REMOTE_VERIFIED`, dan `FAILED`.
- Upload remote menolak overwrite object data dengan isi berbeda; path bucket
  divalidasi; pagination/retention aman dan object tanpa tanggal tidak dihapus.
- Lock eksklusif mencegah dua proses backup bersamaan.
- Restore memakai checksum, fingerprint manifest, GCM authentication, validasi
  SQL, count tabel, guard database production, guard database berisi data, dan
  guard tar path traversal.
- Scheduler Windows memiliki installer path-dynamic, wrapper logging, exit code,
  dan lock. Template Linux systemd tersedia.
- Dokumentasi operasi, RLS, scheduler, security, VPS readiness, backup/restore
  sudah diperbarui.

## 2. Bukti Pengujian

### Backup dan restore lokal

- `npm run db:backup -- --no-upload` → `LOCAL_CREATED`, database + uploads.
- `npm run db:backup:verify` → semua object `PASS`.
- Restore database ke `smk_restore_test_final` berhasil.
- Count source dan restored cocok untuk semua tabel:
  `admins 0`, `ai_daily_attempts 3`, `auth_tokens 0`, `berita 13`, `bkk 12`,
  `events 52`, `pengumuman 11`, `ppdb 0`, `ppdb_drafts 0`, `prestasi 21`,
  `sessions 0`, `site_settings 1`, `site_visitors 1`, `spmb_information 21`,
  `users 0`.
- Restore uploads: 26 file sumber = 26 file restored; hash konten cocok.

### Negative testing

- Key salah → fingerprint manifest mismatch / GCM ditolak.
- File backup dirusak → checksum mismatch.
- Database tujuan berisi 16 tabel tanpa `--allow-existing` → ditolak.
- Target production tanpa `--allow-production` → ditolak.
- Archive path traversal → ditolak oleh `isUnsafeArchiveEntry`.
- Endpoint PPDB privat tanpa auth → 401.

### Regression / build

- Backend: `npm test` → **45/45 PASS**.
- Frontend: `npm run lint` → PASS.
- Frontend: `npm run typecheck` → PASS.
- Frontend: `CI=true npm run build:ci` → PASS; 100 public routes prerendered.
- Prisma: `prisma validate` dan `prisma migrate status` → PASS/up to date.
- Backend production dependency audit → 0 vulnerability.

## 3. Yang Belum Berhasil / Blocked

1. **Remote backup, remote verification, remote restore**: `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, dan bucket privat `mysql-backups` belum tersedia
   di backend environment. Tidak diklaim PASS.
2. **RLS**: anon REST mendapat 401 untuk `ai_daily_attempts`; direct PostgreSQL
   host tidak resolve; service role belum tersedia.
3. **`ppdb` / `ppdb_drafts`**: REST anon mengembalikan 0, tetapi belum dapat
   dipastikan kosong tanpa akses administratif.
4. **Supabase Auth**: `users`, `auth_tokens`, `sessions` tidak diekspos REST;
   password hash tidak dimigrasikan. Prosedur reset/recovery disiapkan.
5. **File privat PPDB**: belum diverifikasi/dipindahkan dari bucket privat tanpa
   service role; tidak dijadikan public URL.
6. **Linux scheduler**: konfigurasi direview, belum dieksekusi karena tidak ada
   Linux host lokal.
7. **Frontend `vite`**: `npm audit --omit=dev` menemukan 1 high dev-tool issue;
   jadwalkan upgrade Vite pada PR terpisah, jangan gunakan `npm audit fix --force`.

## 4. Credential yang Dibutuhkan

Administrator harus mengisi secara aman, bukan mengirim lewat Git/chat:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SUPABASE_BACKUP_BUCKET=mysql-backups`
- `BACKUP_ENCRYPTION_KEY` (base64 32 byte, disimpan terpisah dari backup)
- Production `DATABASE_URL`, `SESSION_SECRET`, SMTP, Turnstile, dan provider AI
  sesuai fitur yang diaktifkan.

Bucket harus dibuat **private**. Setelah konfigurasi, jalankan backup remote,
`node scripts/backup-verify.mjs --remote`, lalu remote restore ke database test.

## 5. Akses Administrator yang Masih Dibutuhkan

- Akses Supabase Storage service role untuk membuat/mengecek bucket dan menguji
  upload/download private.
- Akses administratif Supabase/PostgreSQL atau ETL role read-only untuk audit
  `ai_daily_attempts`, `ppdb`, `ppdb_drafts`, dan dokumen privat.
- Keputusan pemilik data untuk migrasi/reset akun pengguna.
- Akses VPS sekolah, DNS, TLS, firewall, dan secret manager untuk deployment
  nanti. Semua itu sengaja tidak digunakan dalam pekerjaan ini.

## 6. Apakah Aplikasi Siap Dipindahkan ke VPS?

**READY FOR DEPLOYMENT (pre-deployment)** untuk paket kode, migrasi MySQL,
dokumentasi, scheduler, backup/restore, dan checklist keamanan.

Deployment aktual tetap **BLOCKED** sampai administrator menyelesaikan:

- remote Supabase credential + bucket private;
- verifikasi remote backup dan restore;
- review/migrasi data RLS/private;
- provisioning VPS, DNS, TLS, firewall, dan secret manager;
- review frontend `vite` advisory.

## 7. Risiko Tersisa

- Backup remote belum memiliki bukti integrasi nyata.
- Data protected/private bisa belum lengkap.
- Akun lama membutuhkan reset password/aktivasi ulang.
- Linux scheduler belum diuji pada Linux.
- Dependency dev-only `vite` high belum di-upgrade.
- Tidak ada monitoring/alert production sampai administrator memasangnya.

## 8. Langkah Administrator Berikutnya

1. Buat bucket Supabase `mysql-backups` sebagai private.
2. Simpan service role key dan encryption key di secret manager server-only.
3. Jalankan remote backup dan remote verify dengan DB test/lokal yang aman.
4. Jalankan remote restore ke `smk_restore_test_final` atau DB test baru; simpan
   laporan count, tabel, checksum, dan file uploads.
5. Dengan izin pemilik data, audit RLS memakai akses administratif; jalankan ETL
   tabel yang disetujui dan verifikasi source/target.
6. Provision VPS sesuai `docs/VPS_DEPLOYMENT_READINESS.md`; jangan memakai root
   sebagai application user.
7. Uji health check, login, upload privat, backup, restore, scheduler, dan
   rollback sebelum DNS production diarahkan.
8. Hapus credential recovery satu kali setelah admin bootstrap selesai.

## Kesimpulan

Implementasi lokal, kontrol keamanan, backup/restore lokal, scheduler Windows,
dokumentasi, dan regression test selesai. Integrasi remote Supabase, data RLS,
restore remote, dan deployment VPS tetap berstatus **BLOCKED** sampai credential
dan akses administrator tersedia. Tidak ada deployment ke VPS sekolah dilakukan.
