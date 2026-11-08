# Panduan Backup & Restore — SMK Telkom Purwokerto

Dokumen ini menjelaskan sistem backup terenkripsi harian, retensi 30 hari,
dan prosedur restore yang sudah **teruji**.

> **Prinsip:** MySQL adalah sumber kebenaran operasional. Supabase hanya
> menyimpan **salinan terenkripsi** untuk disaster recovery. Tidak ada data
> mentah (plaintext) yang pernah dikirim ke Supabase.

---

## 1. Ringkasan Sistem

```
02:00 WIB (harian)
   │
   ├─ mysqldump --single-transaction  ──► gzip ──► AES-256-GCM ──► backups/mysql/YYYY/MM/
   ├─ tar uploads/                    ──► gzip ──► AES-256-GCM ──► backups/uploads/
   ├─ manifest JSON (checksum SHA-256, jumlah baris) ─────────────► backups/manifests/
   └─ upload ke Supabase Storage (bucket privat `mysql-backups`)
          └─ verifikasi ukuran + SHA-256 setelah upload
   └─ hapus lokal & remote yang lebih tua dari 30 hari
```

Karakteristik:

| Aspek | Nilai |
|---|---|
| Cakupan | seluruh tabel MySQL + seluruh `uploads/` |
| Enkripsi | AES-256-GCM, IV acak 12 byte per file, auth tag |
| Format file | header `SMKBACK1` + IV + ciphertext + tag |
| Integritas | SHA-256 per objek di manifest |
| Retensi | 30 hari (dapat diubah via `BACKUP_RETENTION_DAYS`) |
| Jadwal | 02:00 WIB (19:00 UTC) |
| Tujuan remote | Supabase Storage, bucket privat |

Header file:

```
[0..8)   "SMKBACK1"       magic/versi
[8..20)  IV (12 byte)
[20..n)  ciphertext
[n..]    GCM auth tag (16 byte)
```

---

## 2. Konfigurasi

`backend/.env`:

```ini
BACKUP_DIR=./backups
BACKUP_ENCRYPTION_KEY=<base64 32 byte>
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *

# Windows (Laragon) — contoh path
MYSQLDUMP_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe
MYSQL_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe

# Upload tujuan (opsional; wajib di production)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_BACKUP_BUCKET=mysql-backups
```

### 2.1 Membuat encryption key

```bash
cd backend
npm run db:backup:keygen
# contoh output: 3qZ... (44 karakter base64)
```

Salin hasilnya ke `BACKUP_ENCRYPTION_KEY`.

> **KRITIS:** Simpan key ini di tempat aman (password manager / secret manager).
> **Kehilangan key = backup tidak dapat dipulihkan.** Jangan commit key ke git.
> Jangan mengubah key setelah backup pertama; backup lama akan jadi tidak terbaca.

### 2.2 Membuat bucket Supabase

1. Supabase Dashboard → Storage → New bucket → nama `mysql-backups`.
2. Set bucket sebagai **Private** (bukan public).
3. Buat bucket policy yang hanya mengizinkan `service_role` (default: service_role
   bypass RLS, jadi tidak perlu policy tambahan).
4. Simpan `service_role` key **hanya** di `backend/.env`, bukan di frontend/git.

---

## 3. Menjalankan Backup

### 3.1 Manual (lokal saja)

```bash
npm run db:backup -- --no-upload
```

Output sukses:

```json
{"event":"backup_upload_skipped","reason":"--no-upload"}
{"event":"backup_complete","date":"2026-11-04","objects":["database","uploads"],"remoteDeleted":0,"retentionDays":30}
```

### 3.2 Manual (lokal + upload Supabase)

```bash
npm run db:backup
```

Jika `SUPABASE_*` kosong di `NODE_ENV=production`, script **gagal** (exit 1)
— ini disengaja agar backup tanpa tujuan remote tidak lolos diam-diam. Di
development, upload dilewati dengan peringatan.

### 3.3 Idempotent

Menjalankan backup dua kali pada hari yang sama akan menimpa file tanggal yang
sama (aman). Manifest juga ditimpa.

---

## 4. Bukti Verifikasi (2026-11-04)

Perintah:

```bash
npm run db:backup -- --no-upload
```

Hasil nyata (dari `backups/manifests/backup-2026-11-04.json`):

```json
{
  "date": "2026-11-04",
  "database": "smk_telkom_purwokerto",
  "encryption": "AES-256-GCM",
  "keyFingerprint": "d55db7d3219a4a75",
  "retentionDays": 30,
  "tableCounts": {
    "berita": 13, "pengumuman": 11, "prestasi": 21, "bkk": 12,
    "events": 52, "spmb_information": 21, "site_settings": 1,
    "ai_daily_attempts": 1, "site_visitors": 1
  },
  "objects": {
    "database": { "key": "mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc", "size": 27712, "sha256": "51efb5..." },
    "uploads":  { "key": "uploads/uploads-backup-2026-11-04.tar.gz.enc",  "size": 2213059, "sha256": "2ce800..." }
  },
  "status": "LOCAL_CREATED"
}
```

Status backup: `LOCAL_CREATED` (file lokal selesai) → `REMOTE_UPLOADED`
(objek + manifest terunggah) → `REMOTE_VERIFIED` (manifest remote dibaca ulang
dan checksum objek cocok). Jika gagal: `FAILED`.

Verifikasi checksum:

```bash
npm run db:backup:verify
# {"event":"backup_verify_complete","manifest":"manifests\\backup-2026-11-04.json","objects":["database","uploads"]}
```

### 4.1 Uji restore ke database disposable (sungguhan)

```bash
# 1. Buat database uji terpisah (JANGAN pakai database produksi)
mysql -u root -e "DROP DATABASE IF EXISTS smk_telkom_purwokerto_restore_test; \
  CREATE DATABASE smk_telkom_purwokerto_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Restore
npm run db:restore -- backups/mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc \
  --target-url="mysql://root@127.0.0.1:3306/smk_telkom_purwokerto_restore_test" --apply

# 3. Bandingkan jumlah baris
mysql -u root -N smk_telkom_purwokerto_restore_test -e "
  SELECT 'berita',COUNT(*) FROM berita UNION ALL
  SELECT 'pengumuman',COUNT(*) FROM pengumuman UNION ALL
  SELECT 'prestasi',COUNT(*) FROM prestasi UNION ALL
  SELECT 'events',COUNT(*) FROM events;"
```

Hasil uji restore nyata:

| Tabel | Sumber (produksi) | Hasil restore | Cocok |
|---|---|---|---|
| berita | 13 | 13 | ✅ |
| pengumuman | 11 | 11 | ✅ |
| prestasi | 21 | 21 | ✅ |
| bkk | 12 | 12 | ✅ |
| events | 52 | 52 | ✅ |
| spmb_information | 21 | 21 | ✅ |
| site_settings | 1 | 1 | ✅ |
| ai_daily_attempts | 1 | 1 | ✅ |
| site_visitors | 1 | 1 | ✅ |
| users/admins/ppdb/ppdb_drafts | 0 | 0 | ✅ |
| `_prisma_migrations` | 4 | 4 | ✅ |

```
{"event":"restore_mysql_complete","database":"smk_telkom_purwokerto_restore_test"}
```

### 4.2 Uji restore uploads

```bash
node scripts/restore.mjs backups/uploads/uploads-backup-2026-11-04.tar.gz.enc \
  --uploads-root="$env:TEMP/smk_uploads_restore_test" --apply
```

Hasil: **26 file dipulihkan** = 26 file sumber. Cocok.

Setelah uji: **drop** database disposable agar tidak menumpuk.

---

## 5. Jadwal Otomatis

### 5.1 Windows Task Scheduler

Template tersedia di `backend/schedulers/windows-backup-daily.xml`.

Import (jalankan PowerShell **as Administrator**):

```powershell
schtasks /Create /XML "D:\laragon\www\smk_project\backend\schedulers\windows-backup-daily.xml" /TN "SMK Backup Harian"
```

Sesuaikan `WorkingDirectory` dan `Command` (path `node`) di XML sebelum import.
Verifikasi:

```powershell
schtasks /Query /TN "SMK Backup Harian" /V /FO LIST
```

### 5.2 Linux systemd timer

Template: `backend/schedulers/linux-backup-daily.service` dan `.timer`.

```bash
sudo cp /opt/smk-telkom-purwokerto/backend/schedulers/linux-backup-daily.service /etc/systemd/system/
sudo cp /opt/smk-telkom-purwokerto/backend/schedulers/linux-backup-daily.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now linux-backup-daily.timer
systemctl list-timers linux-backup-daily.timer
```

Timer memakai `OnCalendar=*-*-* 19:00:00 UTC` = **02:00 WIB** (UTC+7).

### 5.3 Alternatif cron

```cron
# 02:00 WIB = 19:00 UTC
0 19 * * * cd /opt/smk-telkom-purwokerto/backend && /usr/bin/node scripts/backup.mjs >> /var/log/smk-backup.log 2>&1
```

---

## 6. Retensi

Script menghapus file backup yang:

- Lebih tua dari `BACKUP_RETENTION_DAYS` (default 30), DAN
- Berada di `backups/mysql/`, `backups/uploads/`, atau `backups/manifests/`.

Untuk remote, script menelusuri objek secara **rekursif** (folder bertingkat
`mysql/YYYY/MM/`) dengan paginasi, lalu menghapus prefix `mysql/`, `uploads/`,
`manifests/` yang tanggalnya lebih tua dari cutoff.

> Retensi memakai **tanggal pada nama file** dan zona `Asia/Jakarta`, baik untuk
> backup lokal maupun remote. Error listing/delete dilaporkan dan membuat proses
> keluar dengan kode non-zero.

---

## 7. Prosedur Restore Darurat (Disaster Recovery)

**Skenario:** server produksi hilang total, hanya tersisa backup di Supabase.

### 7.1 Siapkan lingkungan

1. Siapkan MySQL baru (lihat `MYSQL_SETUP_GUIDE.md`).
2. Set `BACKUP_ENCRYPTION_KEY` **yang sama** seperti saat backup dibuat.
3. Set `DATABASE_URL` ke database baru.

### 7.2 Unduh backup dari Supabase

```bash
# Ganti <project> dan <tanggal>.
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://<project>.supabase.co/storage/v1/object/authenticated/mysql-backups/mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc" \
  -o mysql-backup.sql.gz.enc
```

### 7.3 Verifikasi lalu restore

```bash
npm run db:backup:verify -- backups/manifests/backup-2026-11-04.json

# Restore ke database tujuan yang sudah disiapkan. Tanpa --allow-production,
# script menolak database dengan nama sama seperti DATABASE_URL produksi.
node scripts/restore.mjs mysql-backup.sql.gz.enc --db=smk_telkom_purwokerto \
  --manifest=backup-2026-11-04.json --apply --allow-production --confirm
```

Atau langsung dari Supabase Storage (tanpa unduh manual):

```bash
node scripts/restore.mjs --remote-date=2026-11-04 --db=smk_telkom_purwokerto \
  --apply --allow-production --confirm
```

### 7.4 Pulihkan file upload

```bash
node scripts/restore.mjs uploads-backup-2026-11-04.tar.gz.enc uploads --uploads-root=/var/lib/smk-telkom-purwokerto/uploads --apply --allow-production --confirm
```

### 7.5 Validasi pasca-restore

```bash
node scripts/check-db.mjs
curl http://127.0.0.1:3000/health
# bandingkan jumlah baris dengan manifest
```

---

## 8. Keamanan

- Backup **selalu** terenkripsi sebelum meninggalkan server.
- `SUPABASE_SERVICE_ROLE_KEY` hanya di backend `.env` (tidak pernah di frontend/git).
- Bucket `mysql-backups` bersifat privat; URL publik tidak valid.
- Key fingerprint (`sha256(key)[:16]`) dicatat di manifest — memudahkan verifikasi
  bahwa backup dibuat dengan key yang benar **tanpa** membocorkan key.
- Restore menolak menimpa database produksi kecuali `--allow-production` diberikan.
- `restore.mjs` menolak berjalan tanpa `--apply` (mencegah kecelakaan).

---

## 9. Checklist Backup Sehat

- [ ] `npm run db:backup` selesai tanpa error
- [ ] `npm run db:backup:verify` PASS
- [ ] Manifest baru muncul di `backups/manifests/`
- [ ] Objek terunggah & terverifikasi (log `backup_object_uploaded_verified`)
- [ ] Backup >30 hari terhapus
- [ ] (Bulanan) restore uji ke database disposable dan cocokkan jumlah baris
- [ ] Key backup tersimpan aman di secret manager
