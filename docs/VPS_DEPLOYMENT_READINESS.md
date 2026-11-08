# Kesiapan Deployment VPS Sekolah

Diperbarui: 2026-11-05. Dokumen ini adalah **rencana & checklist**. Tidak ada
deployment, SSH, atau perubahan pada VPS/domain/firewall produksi yang dilakukan.
Semua nilai rahasia ditulis sebagai placeholder.

Dokumen pendukung: `docs/VPS_DEPLOYMENT_GUIDE.md`, `backend/docs-mysql/16-MYSQL-VPS-PRODUCTION.md`, `docs/SCHEDULER_READINESS_REPORT.md`, `docs/RLS_MIGRATION_FINAL_REPORT.md`.

## 0. Arsitektur Target

```
Internet
   |
 HTTPS (Nginx + Let's Encrypt)
   |
 [Frontend React + Vite: static build]
   |
 /api -> [Backend Node.js 22 + Express]
   |
 MySQL 8.4 (127.0.0.1, tidak diekspos)
   |
 Backend -> Supabase Storage (bucket privat mysql-backups, backup terenkripsi)
```

Prinsip: MySQL satu-satunya database runtime; frontend tidak pernah mengakses DB;
Supabase Storage hanya untuk backup/file yang masih dibutuhkan.

## 1. Persyaratan VPS

- Linux x86_64 (Debian/Ubuntu LTS disarankan), akses sudo.
- RAM >= 2 GB (4 GB lebih nyaman untuk build frontend), disk >= 40 GB.
- Domain + akses DNS ke sekolah.
- Port 80/443 terbuka; port 3306 **tertutup** dari internet.

## 2. Software dan Versi

| Software | Versi |
|---|---|
| Node.js | 22 LTS |
| MySQL | 8.4 |
| Nginx / Caddy | terbaru stabil |
| Certbot | terbaru |
| PM2 (opsional) | terbaru, atau systemd |

## 3. Struktur Direktori Usulan

```
/opt/smk-telkom-purwokerto/
  backend/        # source + .env (0600) + uploads + backups
  frontend-dist/  # hasil build frontend (dilayani Nginx)
  releases/       # arsip rilis untuk rollback
```

## 4. Instalasi MySQL 8.4

Lihat `backend/docs-mysql/16-MYSQL-VPS-PRODUCTION.md`. Ringkas:

```bash
sudo apt update && sudo apt install -y mysql-server mysql-client
sudo mysql_secure_installation
sudo systemctl enable --now mysql
```

## 5. Database dan Application User (least privilege)

```sql
CREATE DATABASE smk_telkom_purwokerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smk_app'@'localhost' IDENTIFIED BY '<STRONG_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES,
      LOCK TABLES, TRIGGER ON smk_telkom_purwokerto.* TO 'smk_app'@'localhost';
-- User backup terpisah:
CREATE USER 'smk_backup'@'localhost' IDENTIFIED BY '<STRONG_BACKUP_PASSWORD>';
GRANT SELECT, LOCK TABLES, PROCESS, RELOAD, EVENT, TRIGGER, SHOW VIEW
  ON smk_telkom_purwokerto.* TO 'smk_backup'@'localhost';
FLUSH PRIVILEGES;
```

Jangan memakai `root` sebagai user aplikasi.

## 6. Konfigurasi Backend

```bash
cd /opt/smk-telkom-purwokerto/backend
npm ci
npx prisma generate
```

## 7. Konfigurasi Frontend

Set `VITE_API_BASE_URL=https://<domain>/api` (atau subdomain API) **sebelum** build,
lalu `npm ci && npm run build` (mode produksi, mengaktifkan prerender SEO).
Frontend tidak memuat secret apa pun.

## 8. Environment Variables (backend/.env, permission 0600)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://smk_app:<STRONG_PASSWORD>@127.0.0.1:3306/smk_telkom_purwokerto
FRONTEND_URL=https://<domain>
SESSION_SECRET=<64-char-random>
UPLOAD_ROOT=/var/smk/uploads
MEDIA_BASE_URL=https://<domain-api>
PUBLIC_URL=https://<domain>
# SMTP
SMTP_HOST=<...> ; SMTP_PORT=587 ; SMTP_USER=<...> ; SMTP_PASS=<...>
MAIL_FROM=no-reply@smktelkom-pwt.sch.id
# Turnstile
CF_TURNSTILE_SECRET=<...>
TURNSTILE_ALLOWED_ORIGINS=https://<domain>
# Backup terenkripsi
BACKUP_DIR=/var/smk/backups
BACKUP_ENCRYPTION_KEY=<base64 32 byte>
BACKUP_RETENTION_DAYS=30
MYSQLDUMP_PATH=/usr/bin/mysqldump
MYSQL_PATH=/usr/bin/mysql
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_BACKUP_BUCKET=mysql-backups
```

`SUPABASE_SERVICE_ROLE_KEY` hanya di server; **jangan** pernah ke frontend.

## 9. Prisma Migration

```bash
npx prisma migrate deploy   # bukan migrate dev di production
npx prisma migrate status
```

## 10. Build Frontend

```bash
cd /opt/smk-telkom-purwokerto/frontend
npm ci && npm run build
# salin dist/ -> /opt/smk-telkom-purwokerto/frontend-dist/
```

## 11. Reverse Proxy (Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name <domain>;
  ssl_certificate     /etc/letsencrypt/live/<domain>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
  client_max_body_size 12m;

  root /opt/smk-telkom-purwokerto/frontend-dist;
  index index.html;
  try_files $uri $uri/ /index.html;          # SPA fallback

  location /api/ { proxy_pass http://127.0.0.1:3000; include /etc/nginx/proxy_params; }
  location = /health { proxy_pass http://127.0.0.1:3000; }
  location /uploads/content-images/ { proxy_pass http://127.0.0.1:3000; }
  # Jangan melayani /uploads/ppdb-documents secara statis (privat, via API berautentikasi).
}
```

## 12. HTTPS

```bash
sudo certbot --nginx -d <domain>
sudo systemctl enable --now certbot.timer   # renew otomatis
```

Arahkan HTTP ke HTTPS (redirect 301). Aktifkan HSTS di Nginx setelah TLS stabil.

## 13. Process Manager

systemd unit contoh (`/etc/systemd/system/smk-backend.service`):

```ini
[Unit]
Description=SMK Telkom Purwokerto Backend
After=network-online.target mysql.service
Wants=network-online.target

[Service]
Type=simple
User=smk
Group=smk
WorkingDirectory=/opt/smk-telkom-purwokerto/backend
EnvironmentFile=/opt/smk-telkom-purwokerto/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Atau PM2 (`pm2 start src/server.js --name smk-backend; pm2 save; pm2 startup`).

## 14. Upload Storage

- `UPLOAD_ROOT` harus direktori persistent (bukan di dalam `dist`/rilis) agar
  selamat saat redeploy.
- Dokumen PPDB tetap privat; hanya lewat `/api/uploads/ppdb-documents/*`.
- Pertimbangkan `PUBLIC_STORAGE_URL` bila media dipindah ke object storage.

## 15. Backup Remote

- Bucket Supabase `mysql-backups` wajib **private**.
- Backup terenkripsi AES-256-GCM + manifest + checksum SHA-256.
- Status: `LOCAL_CREATED -> REMOTE_UPLOADED -> REMOTE_VERIFIED`.
- Lihat `docs/MYSQL_BACKUP_GUIDE.md` dan `backend/docs-mysql/12-13`.

## 16. Restore

```bash
cd /opt/smk-telkom-purwokerto/backend
node scripts/restore.mjs --remote-date=<YYYY-MM-DD> --target=mysql \
  --db=smk_restore_test --apply
```

Selalu restore ke database test lebih dulu. Restore ke production butuh
`--allow-production --confirm` dan persetujuan eksplisit. Uji restore berkala
(minimal bulanan).

## 17. Scheduler

Windows: `schedulers/install-windows-task.ps1`. Linux: `schedulers/linux-backup-daily.{service,timer}`.
Detail dan hasil uji: `docs/SCHEDULER_READINESS_REPORT.md`.

## 18. Monitoring

- Health: `GET /health` -> `{ ok: true, database: "up" }`.
- `journalctl -u smk-backend -f`; log rotation via `logrotate`/journald.
- `mysqladmin -h 127.0.0.1 -u smk_app -p status`.
- Alert disk (`UPLOAD_ROOT`, `BACKUP_DIR`) dan kegagalan backup
  (`journalctl -u linux-backup-daily.service`).

## 19. Security Checklist

- [ ] `root` MySQL tidak dipakai aplikasi; user least privilege.
- [ ] Port 3306 hanya localhost; firewall `ufw deny 3306`.
- [ ] `.env` permission `0600`, tidak masuk Git.
- [ ] Service Role Key hanya di server.
- [ ] HTTPS aktif + HSTS.
- [ ] CORS `FRONTEND_URL` tepat (tanpa wildcard).
- [ ] `SESSION_SECRET` acak >= 32 karakter.
- [ ] Backup bucket private; encryption key disimpan terpisah dari backup.
- [ ] Rate limit aktif; Turnstile aktif untuk form publik.
- [ ] Dokumen PPDB tidak dapat diakses publik.

## 20. Rollback

1. Simpan `releases/<timestamp>/` sebelum tiap deploy.
2. Rollback kode: arahkan symlink/WorkingDirectory ke rilis sebelumnya, restart service.
3. Rollback DB: restore dari backup `REMOTE_VERIFIED` terakhir ke DB test, verifikasi,
   baru ke production dengan persetujuan. Lihat `docs/ROLLBACK_GUIDE.md`.

## 21. Troubleshooting

| Gejala | Penyebab umum | Aksi |
|---|---|---|
| `/health` `database: down` | MySQL mati / kredensial salah | cek `systemctl status mysql`, `DATABASE_URL` |
| Backup `FAILED` tanpa upload | `SUPABASE_*` kosong di production | isi env, jalankan manual |
| `Backup lain sedang berjalan` | lock `.backup.lock` tersisa | pastikan tak ada proses; hapus lock jika proses mati |
| 401/403 API | CORS/`FRONTEND_URL`, cookie Secure, CSRF | cek origin, cookie, header `x-csrf-token` |
| Upload 413 | `client_max_body_size` Nginx | naikkan ke 12m |
| Prerender SEO kosong | build tanpa feed/offline | jalankan build produksi penuh |
