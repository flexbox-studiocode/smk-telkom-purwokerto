# ETL Supabase → MySQL

Tool ini **hanya membaca** Supabase (REST API read-only) dan menulis ke MySQL.
Tidak ada `UPDATE`/`DELETE` ke sumber. Storage publik yang direferensikan oleh
data (gambar berita/pengumuman/prestasi, logo sekolah/BKK) diunduh ke direktori
`uploads/` backend. Dokumen privat (bucket `ppdb-documents`) diunduh melalui
service role key dan **tidak** dijadikan URL publik.

## Prasyarat

- `SUPABASE_URL` dan `SUPABASE_ANON_KEY` (atau `SUPABASE_SERVICE_ROLE_KEY`)
  tersedia via environment atau `frontend/.env` (`VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`). Nilai `VITE_SUPABASE_*` hanya dipakai untuk ETL
  read-only; aplikasi operasional tidak membacanya.
- `DATABASE_URL` untuk MySQL target (sudah diatur di `backend/.env`).
- `SUPABASE_SERVICE_ROLE_KEY` diperlukan untuk membaca tabel RLS-protected dan
  mengunduh dokumen dari bucket privat. Tanpa service role key, tabel tersebut
  dicatat sebagai `BLOCKED_RLS` dan dokumen privat dilewati.
- Backup MySQL sebelum menjalankan ETL pada database production.

## Menjalankan

```bash
cd backend
node scripts/etl/migrate.mjs --dry-run
node scripts/etl/migrate.mjs --batch=500
node scripts/etl/migrate.mjs --tables=berita,bkk,events
```

## Yang dimigrasikan

Tabel: `site_settings`, `berita`, `pengumuman`, `prestasi`, `bkk`, `events`,
`spmb_information`, `admins`, `ppdb`, `ppdb_drafts`, `ai_daily_attempts`
(optional, RLS-blocked tanpa service role key), `site_visitors`.

## Kolom URL Storage yang dipindahkan

| Tabel | Kolom | Visibilitas |
|---|---|---|
| site_settings | logo_url | public |
| berita | gambar_url | public |
| pengumuman | gambar_url | public |
| prestasi | gambar_url | public |
| bkk | logo_url | public |
| events | gambar_url | public |
| ppdb | dokumen_url | private |

## site_visitors

Sumber Supabase tidak memiliki kolom `day`. Nilai diturunkan dari `created_at`
pada zona **Asia/Jakarta** (bukan UTC) agar konsisten dengan runtime backend
yang juga memakai zona Jakarta untuk penentuan "hari ini".

## Idempotensi

Setiap record menggunakan upsert `ON DUPLICATE KEY UPDATE` pada primary key /
unique key. Menjalankan ulang tidak menggandakan data. Error per-record dicatat
di `docs/etl-errors-<timestamp>.jsonl`; ringkasan ditulis di
`docs/etl-summary-<timestamp>.json` beserta cek orphan FK (ppdb, ppdb_drafts,
admins).

## Catatan

- Password hash Supabase Auth tidak dapat diekspor via REST anonim. Akun admin
  harus dibuat ulang via `npm run db:seed` atau prosedur reset password.
- `ai_daily_attempts` dilindungi RLS; tanpa service role key, dicatat sebagai
  `BLOCKED_RLS`.
- File Supabase Storage **tidak dihapus**; sumber tetap utuh sebagai arsip.
