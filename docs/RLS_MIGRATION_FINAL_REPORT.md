# Laporan Final Migrasi Data Terlindungi RLS

Diperbarui: 2026-11-05. Status dinyatakan apa adanya; data yang tidak dapat
diverifikasi tidak diklaim selesai.

Sumber: Supabase PostgreSQL lama (`jxrcbkseudollokdtfxy`). Target: MySQL 8.4 lokal
(`smk_telkom_purwokerto`). Supabase tetap utuh sebagai arsip.

## 1. Metode Audit

Ada tiga jalur akses yang dibedakan tegas agar tidak salah menyimpulkan "kosong":

| Jalur | Hasil | Keterangan |
|---|---|---|
| Direct PostgreSQL (`db.<ref>.supabase.co`) | BLOCKED | DNS tidak resolve dari environment ini (kemungkinan IPv6-only / hanya via pooler). Tidak ada koneksi langsung. |
| Supabase REST + anon key | Sebagian | Hanya untuk tabel `public` yang lolos RLS. |
| Supabase REST + service role key | BLOCKED | `SUPABASE_SERVICE_ROLE_KEY` tidak tersedia di environment. |

Karena itu, tabel yang mengembalikan 0 atau 401 **tidak** otomatis dianggap
kosong.

## 2. Hasil Audit per Tabel

Probe REST read-only (anon) pada 2026-11-05:

| Tabel | REST status | Dibaca anon | Arti | Status migrasi |
|---|---|---|---|---|
| `users` | 404 | — | Tabel dikelola **Supabase Auth** (skema `auth`), tidak diekspos via PostgREST | BLOCKED (bukan REST) |
| `auth_tokens` | 404 | — | Skema `auth`; tidak diekspos | BLOCKED (bukan REST) |
| `sessions` | 404 | — | Skema `auth`; tidak diekspos | BLOCKED (bukan REST) |
| `admins` | 200 | 0 | Tabel `public`, anon dapat membaca; kosong | Sumber kosong (0/0) |
| `ppdb` | 200 | 0 | Tabel `public`; 0 baris terbaca | Sumber kosong **atau** RLS membatasi; tidak dapat dipastikan tanpa service role |
| `ppdb_drafts` | 200 | 0 | Sama seperti `ppdb` | Tidak dapat dipastikan |
| `ai_daily_attempts` | 401 | — | RLS menolak anon (kode 42501) | BLOCKED_RLS |
| `berita` (kontrol) | 206 | 13 | Membuktikan REST+anon memang berfungsi | — |

Catatan: `ppdb` dan `ppdb_drafts` mengembalikan `200` dengan `content-range: */0`.
Karena `admins` juga `200` (bukan 401), kemungkinan besar policy `SELECT`
mengizinkan anon tetapi memang tidak ada baris. Namun **tanpa service role key
tidak dapat dibedakan** dari "ada baris tetapi terfilter RLS". Ini dicatat
sebagai ketidakpastian, bukan PASS.

## 3. Jumlah Sumber vs Target

| Tabel | Sumber terbaca | Target MySQL | Delta | Catatan |
|---|---|---|---|---|
| `admins` | 0 | 0 | 0 | Sumber kosong |
| `ppdb` | 0 (tidak pasti) | 0 | 0 | Perlu verifikasi service role |
| `ppdb_drafts` | 0 (tidak pasti) | 0 | 0 | Perlu verifikasi service role |
| `ai_daily_attempts` | BLOCKED | 3 | n/a | 3 baris target berasal dari runtime lokal (`nexttel` 2026-11-04, 2026-11-05, 2099-02-02), **bukan** hasil migrasi |
| `users` | 404 | 0 | n/a | Dibuat ulang via prosedur recovery |
| `auth_tokens` | 404 | 0 | n/a | Token tidak dimigrasikan (lihat §5) |
| `sessions` | 404 | 0 | n/a | Sesi tidak dimigrasikan (lihat §5) |

Data publik (13+11+21+12+52+21+1 = 131 record) sudah dimigrasikan dan terverifikasi
di `docs/MYSQL_MIGRATION_REPORT.md`.

## 4. Kendala RLS

`ai_daily_attempts` dilindungi RLS dan menolak kunci anon. ETL menandainya
`BLOCKED_RLS` dan **tidak** menghapus atau mengubah policy. Tidak ada perubahan
kebijakan keamanan yang dilakukan demi meloloskan ETL.

Langkah manual untuk administrator jika data ini harus dipindahkan:

1. Sediakan `SUPABASE_SERVICE_ROLE_KEY` pada environment server (bukan frontend).
2. Jalankan `cd backend && node scripts/etl/migrate.mjs --tables=ai_daily_attempts`.
3. Verifikasi count sumber = target.

Alternatif yang lebih ketat: buat view/role read-only khusus migrasi di Supabase
alih-alih memakai service role penuh.

## 5. Strategi Akun dan Kredensial

Supabase Auth menyimpan password hash pada skema `auth` yang tidak dapat
diekspor lewat REST anonim. Karena itu:

- **Password tidak pernah disalin** dan tidak ada hash yang dimigrasikan.
- Akun dibuat ulang melalui prosedur recovery admin:
  `ADMIN_RECOVERY_EMAIL` / `ADMIN_RECOVERY_PASSWORD` + `npm run db:seed`
  (`scripts/seed.mjs`, membuat `User` + `Admin` dalam satu transaksi, idempoten).
  Setelah seed, variabel recovery **harus dihapus** dari `.env`.
- Pengguna PPDB login ulang dengan alur *password reset* berbasis token
  (`auth_tokens`), bukan impor hash.
- `auth_tokens` dan `sessions` sengaja **tidak** dimigrasikan: token lama tidak
  berguna di domain/sesi baru dan menyalinnya menambah risiko keamanan tanpa
  manfaat. Sesi baru dibuat saat pengguna login ulang.

## 6. File Privat PPDB

- Dokumen PPDB berada di bucket privat `ppdb-documents`.
- ETL privat hanya berjalan jika `SUPABASE_SERVICE_ROLE_KEY` tersedia
  (`downloadPrivateObject`). Tanpa key, objek privat **dilewati** dan dicatat
  (`storage.blocked`), bukan dijadikan URL publik.
- Di MySQL, dokumen privat disimpan sebagai key internal (`bucket/path`) dan
  hanya dapat diunduh lewat endpoint backend terautentikasi:
  `GET /api/uploads/ppdb-documents/me` dan
  `GET /api/uploads/ppdb-documents/:userId` (pemilik atau admin saja).
- Tidak ada public URL; `storage.js` menolak path traversal dan menulis di dalam
  `UPLOAD_ROOT`.
- Test `security.test.js` membuktikan endpoint dokumen privat tidak dapat diakses
  tanpa autentikasi (401).

## 7. Data yang Sengaja Tidak Dimigrasikan

| Data | Alasan |
|---|---|
| Password/hash Supabase Auth | Tidak dapat diekspor; diganti reset/aktivasi ulang |
| `auth_tokens` (token verifikasi/reset aktif) | Kedaluwarsa & sensitif; dibuat baru saat dibutuhkan |
| `sessions` | Sesi lama tidak valid di sistem baru |
| Objek `ppdb-documents` privat | Butuh service role; belum dikonfirmasi & tidak boleh jadi URL publik |
| Seluruh tabel/Storage/Edge Function Supabase | Tetap sebagai arsip rollback; tidak dihapus |

## 8. Risiko yang Masih Tersisa

1. `ppdb` / `ppdb_drafts` belum dapat dipastikan kosong tanpa service role key.
2. `ai_daily_attempts` belum dimigrasikan.
3. Dokumen PPDB privat belum diverifikasi/dipindahkan.
4. Password pengguna asli tidak dimigrasikan (memerlukan reset).
5. Koneksi PostgreSQL langsung tidak tersedia (hanya REST).

## 9. Status

**BLOCKED** untuk tabel terlindungi RLS dan dokumen privat; **PASS** untuk data
publik dan strategi akun. Tidak ada klaim migrasi selesai untuk data yang belum
diverifikasi.
