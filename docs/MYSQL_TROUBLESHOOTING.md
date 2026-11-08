# Troubleshooting — SMK Telkom Purwokerto (MySQL Edition)

Kumpulan masalah umum beserta penyebab dan solusinya. Diurutkan berdasarkan
gejala yang paling sering muncul.

---

## 1. Koneksi Database

### `Can't reach database server at 127.0.0.1:3306`

**Penyebab:** MySQL tidak berjalan, atau port berbeda.

```powershell
# Windows / Laragon
Get-Process mysqld -ErrorAction SilentlyContinue
# atau start lewat UI Laragon
```

```bash
# Linux
sudo systemctl status mysql
sudo systemctl start mysql
```

Cek port:

```bash
# Windows
netstat -ano | findstr :3306
# Linux
sudo ss -tlnp | grep 3306
```

### `Access denied for user 'smk_app'@'127.0.0.1'`

**Penyebab:** password salah, atau user dibuat untuk host `localhost` bukan `127.0.0.1`.

Perhatikan: MySQL memperlakukan `localhost` dan `127.0.0.1` sebagai host berbeda.

```sql
CREATE USER 'smk_app'@'127.0.0.1' IDENTIFIED BY 'PASSWORD';
GRANT ALL PRIVILEGES ON smk_telkom_purwokerto.* TO 'smk_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### `Unknown database 'smk_telkom_purwokerto'`

Database belum dibuat. Lihat `MYSQL_SETUP_GUIDE.md §2.2`.

### `PrismaClientInitializationError` / adapter error

Backend memerlukan pool `mariadb` eksplisit. Pastikan `backend/src/db.js`
menginisialisasi `@prisma/adapter-mariadb` dengan pool, bukan koneksi tanpa pool.

Verifikasi cepat:

```bash
cd backend
node scripts/check-db.mjs        # harus: Prisma connection OK
```

---

## 2. Migrasi & Skema

### `Table 'smk_telkom_purwokerto.berita' doesn't exist`

Migrasi belum diterapkan:

```bash
npm run db:migrate      # prisma migrate deploy
npm run db:status
```

### `P3009` — failed migration

Ada migrasi gagal yang menghalangi.

```bash
npm run db:status
```

Solusi: perbaiki penyebab di SQL, tandai rollback hanya jika **yakin** (jangan di
produksi tanpa backup):

```bash
# HATI-HATI: gunakan hanya setelah backup & paham risikonya
npx prisma migrate resolve --rolled-back <nama_migrasi>
```

### `P1012` / schema validation error

```bash
npm run prisma:validate
npm run db:generate
```

### `TypeError: Do not know how to serialize a BigInt`

`site_settings.revision` harus `Int`, bukan `BigInt`. Migrasi
`20261104000000_site_settings_revision_int` menangani ini. Pastikan sudah diterapkan.

---

## 3. ETL (Migrasi dari Supabase)

### `getaddrinfo ENOTFOUND db.<project>.supabase.co`

Koneksi PostgreSQL langsung tidak tersedia. **Gunakan REST** (bawaan
`scripts/etl/migrate.mjs`) dengan anon key. Ini perilaku yang diharapkan, bukan bug.

### `401 / 42501 permission denied for table ai_daily_attempts`

RLS memblokir anon read. Ini **BLOCKED** dan didokumentasikan. Untuk mengekspor,
diperlukan `SUPABASE_SERVICE_ROLE_KEY` atau grant eksplisit pada role `anon`.

### ETL jalan dua kali, apakah data terduplikasi?

Tidak. ETL memakai **upsert berdasarkan ID asli** — idempoten. Jalankan ulang
aman.

### Sebagian record gagal

Lihat `backend/docs/etl-errors-<timestamp>.jsonl` dan ringkasan
`etl-summary-<timestamp>.json`. Field yang umum bermasalah:

- Enum: tambahkan nilai ke enum schema + migrasi (jangan rekode data asli).
- Kolom hilang di sumber: turunkan nilainya (seperti `site_visitors.day`).

---

## 4. Backup & Restore

### `BACKUP_ENCRYPTION_KEY harus base64 dari 32 byte (AES-256)`

Key tidak valid. Generate ulang:

```bash
npm run db:backup:keygen
```

> Jangan mengganti key di tengah jalan — backup lama menjadi tidak terbaca.

### `mysqldump gagal` / `mysqldump: command not found`

Set path binary eksplisit di `.env`:

```ini
MYSQLDUMP_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe
# Linux:
MYSQLDUMP_PATH=/usr/bin/mysqldump
```

### `tar gagal` / `tar: command not found`

Windows 10+ punya `tar` bawaan. Jika tidak, gunakan WSL atau set PATH. Linux
biasanya sudah ada.

### `Format backup tidak dikenal.`

File `.enc` rusak atau bukan keluaran `backup.mjs`. Verifikasi:

```bash
npm run db:backup:verify <manifest.json>
```

Cek header 8 byte pertama harus `SMKBACK1`.

### Restore gagal dengan `Menolak menimpa database production`

Ini pengaman. Gunakan database uji:

```bash
npm run db:restore -- file.sql.gz.enc --db=smk_telkom_purwokerto_restore_test --apply
```

Untuk benar-benar memulihkan produksi (disaster recovery), tambahkan
`--allow-production` **setelah** yakin.

### `ERROR 1045 (28000)` saat restore

Pastikan user target punya akses ke database tujuan. Buat database uji sebagai
root atau grant user aplikasi.

---

## 5. Upload & File

### `Jenis file tidak diizinkan.` / `Isi file tidak cocok dengan jenis gambar.`

Validasi MIME + magic byte. Pastikan file benar-benar PNG/JPEG/WEBP/GIF/PDF,
bukan sekadar ganti ekstensi.

### Dokumen PPDB tidak muncul / 404

- Pastikan user sudah mengunggah (`POST /api/uploads/ppdb-documents`).
- Endpoint `GET /api/uploads/ppdb-documents/me` butuh login.
- Key bersarang: `submissions/<userId>/document.pdf`.
- `UPLOAD_ROOT` harus benar dan dapat ditulis.

### Gambar publik 404 setelah deploy

Set `MEDIA_BASE_URL` ke URL publik yang benar dan pastikan `/uploads/` diproxy
Nginx ke backend (lihat `DEPLOYMENT_GUIDE.md §6`).

### `ETIMEDOUT` unggah file besar

Batas default 10 MB (`uploads.js`). Sesuaikan `client_max_body_size` Nginx
(disarankan 12 MB) bila batas dinaikkan.

---

## 6. Auth & Sesi

### 400 pada POST dari frontend (`invalid csrf token`)

Frontend harus mengambil `GET /api/auth/csrf` dulu dan mengirim header
`x-csrf-token` pada request non-GET. Cookie harus terkirim (`credentials: include`).

### Login gagal terus

- Cek `SESSION_SECRET` ter-set dan stabil (jangan berubah saat restart).
- Pastikan `FRONTEND_URL` cocok dengan origin yang mengakses (CORS + cookie).
- Cek log backend untuk `status: 401`.

### Admin tidak bisa login setelah migrasi

Hash password tidak dapat diekspor dari Supabase lewat anon REST. Gunakan
prosedur recovery:

1. Set di `backend/.env`:
   ```ini
   ADMIN_RECOVERY_EMAIL=admin@smktelkom-pwt.sch.id
   ADMIN_RECOVERY_PASSWORD=<password-kuat>
   ```
2. `npm run db:seed`
3. Login, lalu **ganti password** dan **hapus** `ADMIN_RECOVERY_*` dari `.env`.

### Reset password: link mengarah ke halaman salah

Pastikan `FRONTEND_URL` benar. Token reset dikirim sebagai parameter URL dan
diproses di `AturSandiPage.jsx`.

---

## 7. AI (NEXA / NextTel)

### `/api/ai/stela` mengembalikan 503 `config`

Ini **disengaja**: tidak ada provider key. Set salah satu:

```ini
STELA_API_KEY=<key>
# atau
GEMINI_API_KEY=<key>
# atau provider OpenAI-compatible:
STELA_PROVIDER_URL=https://.../v1/chat/completions
```

Tidak ada jawaban AI palsu — endpoint hanya mengembalikan 503 jujur bila belum
dikonfigurasi.

### `/api/ai/stela` mengembalikan 502 `provider_failed`

Provider menolak/mengembalikan error. Cek log
(`event: stela_provider_failed`), validasi key, URL, dan nama model
(`STELA_MODEL`).

### `429 quota_exhausted`

Kuota harian per-feature habis (`STELA_MAKS_PER_HARI` / `NEXTTEL_MAKS_PER_HARI`)
atau rate-limit per-IP (`*_MAKS_PER_IP`). Naikkan atau tunggu reset harian (UTC).

### NextTel tidak berfungsi tanpa provider

NextTel adalah **skoring offline** — tidak butuh provider. Jika gagal, cek
panjang `answers` harus tepat 8 dan `optionId` valid.

---

## 8. Frontend Build

### `npm run build` "hang" di prerender

Jalankan dengan `CI=true`:

```bash
CI=true npm run build:ci
```

### `SEO: Public feeds are empty. Do not deploy dist.`

Build dijalankan tanpa backend aktif sehingga feed publik kosong. Build tetap
sukses; data diisi saat runtime. Untuk prerender dengan data nyata, jalankan
backend saat build.

### Lint/typecheck gagal

```bash
npm run lint
npm run typecheck
```

Perbaiki error yang dilaporkan sebelum build.

---

## 9. Umum

### Melihat log backend

- Dev: terminal `npm run dev`.
- systemd: `sudo journalctl -u smk-backend -f`.
- Format: JSON baris-per-baris `{ level, method, path, status, ms }`.

### Mengulang dari nol (lokal)

```bash
# HATI-HATI: ini menghapus seluruh data lokal
mysql -u root -e "DROP DATABASE smk_telkom_purwokerto; CREATE DATABASE smk_telkom_purwokerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run db:migrate
npm run db:seed
```

Jangan pernah menjalankan ini di produksi tanpa backup terverifikasi.

---

## 10. Bantuan Tambahan

- Setup: `MYSQL_SETUP_GUIDE.md`
- Menjalankan: `MYSQL_RUN_GUIDE.md`
- Backup: `MYSQL_BACKUP_GUIDE.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Arsitektur: `MIGRATION_ARCHITECTURE.md`
- Rollback: `docs/ROLLBACK_GUIDE.md`
