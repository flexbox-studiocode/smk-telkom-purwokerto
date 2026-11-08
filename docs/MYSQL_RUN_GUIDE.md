# Panduan Menjalankan Aplikasi — MySQL Edition

Dokumen ini menjelaskan cara menjalankan backend dan frontend SMK Telkom Purwokerto
sehari-hari, di Windows (Laragon) dan Linux VPS.

> Arsitektur saat ini: **MySQL = database operasional**, Supabase = backup storage saja.
> Tidak ada request runtime ke Supabase dari frontend maupun backend.

---

## 1. Ringkasan Arsitektur

```
Browser (React/Vite)
        │  HTTP + cookie session (CSRF-protected)
        ▼
Backend Express (Node.js)
        │  Prisma 7 + @prisma/adapter-mariadb
        ▼
MySQL 8.4  ──────────►  uploads/ (file lokal di disk)
                            │
                            ▼  (harian 02:00 WIB)
                    Backup terenkripsi AES-256-GCM
                            │
                            ▼
                    Supabase Storage (private bucket)
```

Komponen:

| Bagian | Folder | Perintah |
|---|---|---|
| Backend API | `backend/` | `npm run dev` / `npm start` |
| Frontend | `frontend/` | `npm run dev` / `npm run build` |
| ETL | `backend/scripts/etl/` | `node scripts/etl/migrate.mjs` |
| Backup | `backend/scripts/backup.mjs` | `npm run db:backup` |

---

## 2. Menjalankan di Windows (Development)

### 2.1 Prasyarat

1. MySQL Laragon aktif (port 3306).
2. `backend/.env` sudah diisi (lihat `MYSQL_SETUP_GUIDE.md`).
3. `npm install` selesai di `backend/` dan `frontend/`.

### 2.2 Backend

```powershell
cd backend
npm run prisma:generate     # sekali saja setelah ubah schema
npm run dev                 # nodemon, auto-reload
```

Backend berjalan di `http://127.0.0.1:3000`.

Cek kesehatan:

```powershell
curl http://127.0.0.1:3000/health
```

### 2.3 Frontend

Buka terminal kedua:

```powershell
cd frontend
npm run dev
```

Frontend berjalan di `http://localhost:5173` dan memanggil backend di
`http://127.0.0.1:3000` (lihat konfigurasi `VITE_*` di `frontend/.env`).

> Frontend **tidak** menyimpan kredensial database. Hanya URL backend publik.

### 2.4 Menjalankan keduanya sekaligus

Skrip opsional di root (jika tersedia) atau buka dua terminal. Untuk produksi,
gunakan process manager (systemd di Linux, NSSM/PM2 di Windows).

---

## 3. Menjalankan di Linux VPS

### 3.1 Backend via systemd

Sudah dikonfigurasi pada `MYSQL_SETUP_GUIDE.md` Bagian 3.4.

```bash
sudo systemctl start smk-backend
sudo systemctl status smk-backend
sudo journalctl -u smk-backend -f      # ikuti log
```

### 3.2 Frontend

Frontend adalah SPA statis. Build lalu sajikan lewat Nginx:

```bash
cd /opt/smk-telkom-purwokerto/frontend
npm ci
CI=true npm run build:ci
# hasil ada di frontend/dist
```

> `build:ci` **wajib** dipakai dengan env `CI=true`. Tanpa itu, langkah prerender
> akan menahan build.

Nginx (`/etc/nginx/sites-available/smk`):

```nginx
server {
    listen 80;
    server_name smktelkom-pwt.sch.id;

    root /opt/smk-telkom-purwokerto/frontend/dist;
    index index.html;

    location / {
        # app.html adalah SPA shell hasil prerender (fallback untuk rute dinamis).
        try_files $uri $uri/ /app.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

TLS dengan Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d smktelkom-pwt.sch.id
```

### 3.3 File upload

`UPLOAD_ROOT` harus menunjuk ke direktori persisten:

```ini
UPLOAD_ROOT=/var/lib/smk-telkom-purwokerto/uploads
MEDIA_BASE_URL=https://smktelkom-pwt.sch.id
```

Pastikan user `smk` punya akses tulis:

```bash
sudo mkdir -p /var/lib/smk-telkom-purwokerto/uploads
sudo chown -R smk:smk /var/lib/smk-telkom-purwokerto/uploads
```

> Dokumen PPDB (`ppdb-documents`) bersifat **privat** dan **tidak** disajikan
> sebagai file statis. Akses hanya lewat endpoint terautentikasi
> `GET /api/uploads/ppdb-documents/:userId`.

---

## 4. Perintah Operasional Umum

### 4.1 Database

```bash
cd backend

npm run db:status           # cek status migrasi
npm run db:migrate          # terapkan migrasi baru (deploy)
npm run db:seed             # seed site_settings (+ admin recovery)
node scripts/check-db.mjs   # tes koneksi
node scripts/smoke-db.mjs   # tes CRUD/transaksi/FK
```

### 4.2 ETL (dari Supabase)

```bash
npm run db:etl:dry-run            # simulasi, tidak menulis
node scripts/etl/migrate.mjs      # eksekusi nyata (idempotent)
```

ETL memakai **REST Supabase** dengan anon key (read-only) karena koneksi langsung
Postgres tidak tersedia. Jalankan ulang aman — menggunakan upsert berdasarkan ID
asli.

Output: `backend/docs/etl-summary-<timestamp>.json`.

### 4.3 Backup & restore

```bash
npm run db:backup              # backup + upload ke Supabase (status REMOTE_VERIFIED)
npm run db:backup -- --no-upload   # backup lokal saja (status LOCAL_CREATED)
npm run db:backup:verify       # verifikasi checksum manifest terakhir
npm run db:backup:verify -- backups/manifests/backup-2026-11-04.json --remote  # verifikasi remote
npm run db:restore -- <file.enc> --db=<db_tujuan> --apply
npm run db:restore -- --remote-date=2026-11-04 --db=<db_tujuan> --apply  # dari Supabase Storage
```

Contoh restore ke database uji (bukan produksi). Database harus **sudah dibuat** dan user
pada `DATABASE_URL` harus punya privilege ke database tersebut:

```bash
& 'D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe' -u root `
  -e "CREATE DATABASE smk_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; `
      GRANT ALL PRIVILEGES ON smk_restore_test.* TO 'smk_app'@'localhost';"
npm run db:restore -- backups/mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc `
  --db=smk_restore_test --manifest=backups/manifests/backup-2026-11-04.json --apply
```

Restore production memerlukan `--allow-production --confirm`.

---

## 5. Variabel Lingkungan Penting

| Variabel | Fungsi | Wajib |
|---|---|---|
| `DATABASE_URL` | Koneksi MySQL aplikasi | ✅ |
| `SESSION_SECRET` | Tanda tangan cookie sesi (≥32 char) | ✅ |
| `FRONTEND_URL` | Origin yang diizinkan CORS + redirect email | ✅ |
| `UPLOAD_ROOT` | Folder penyimpanan file | ✅ (produksi) |
| `MEDIA_BASE_URL` | Prefix URL publik media | ✅ (produksi) |
| `SMTP_*` | Kirim email verifikasi/reset | opsional |
| `BACKUP_ENCRYPTION_KEY` | Key AES-256 backup | ✅ (jika backup) |
| `SUPABASE_*` | Tujuan upload backup | opsional |
| `STELA_*` / `GEMINI_API_KEY` | Provider AI NEXA | opsional |

> Jika `STELA_*` kosong, endpoint `/api/ai/stela` mengembalikan **503** dengan
> pesan jujur "NEXA belum dikonfigurasi". Tidak ada jawaban palsu. Endpoint
> NextTel (skoring offline) tetap berfungsi tanpa konfigurasi provider.

---

## 6. Health Check & Monitoring

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Respons sehat:

```json
{ "ok": true, "service": "smk-backend", "uptime": 12345, "database": "up" }
```

Jika database down, `/health` mengembalikan **503** dengan `database: "down"`.

Untuk VPS, pasang health check eksternal (UptimeRobot, dsb.) ke endpoint ini.

---

## 7. Log

- Backend menulis log JSON baris-per-baris (`{ level, method, path, status, ms }`).
- systemd: `sudo journalctl -u smk-backend`.
- Backup: log ke stdout; redirect ke `/var/log/smk-backup.log` bila memakai cron.

---

## 8. Checklist "Aplikasi Berjalan Normal"

- [ ] `curl /health` → 200 `database: up`
- [ ] Frontend dapat login admin
- [ ] Berita/pengumuman/prestasi tampil dari MySQL
- [ ] Upload gambar konten sukses
- [ ] PPDB menyimpan draft & dokumen privat
- [ ] NextTel mengembalikan hasil skoring
- [ ] `npm run db:backup` sukses + `db:backup:verify` PASS
