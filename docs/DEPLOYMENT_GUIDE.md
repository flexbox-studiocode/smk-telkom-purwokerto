# Panduan Deployment — SMK Telkom Purwokerto (MySQL Edition)

Panduan ini mencakup deployment backend + frontend ke VPS Linux dengan MySQL 8.4,
serta opsinya di Windows (Laragon) untuk lokal.

> **Status:** konfigurasi deployment **BELUM dijalankan**. Tidak ada VPS, DNS,
> TLS, atau kredensial yang tersedia pada sesi ini. Langkah di bawah siap dijalankan
> tetapi **belum diverifikasi di lingkungan produksi** — jangan mengklaim sukses
> deployment tanpa menjalankannya.

Lihat juga:
- `MYSQL_SETUP_GUIDE.md` — instalasi MySQL.
- `MYSQL_RUN_GUIDE.md` — menjalankan aplikasi.
- `MYSQL_BACKUP_GUIDE.md` — backup & restore.
- `docs/VPS_DEPLOYMENT_GUIDE.md` — catatan deployment sebelumnya (repo ini).

---

## 1. Prasyarat

| Item | Nilai |
|---|---|
| VPS | Ubuntu 22.04/24.04, 2 vCPU, 2 GB RAM minimum |
| Node.js | 20 LTS |
| MySQL | 8.4 |
| Nginx | reverse proxy + TLS |
| Domain | mis. `smktelkom-pwt.sch.id` |
| SMTP | kredensial pengiriman email |
| Storage | disk persisten untuk `uploads/` |

---

## 2. Ringkasan Alur Deployment

```
1. Hardening server     →  SSH key, firewall, unattended-upgrades
2. Install MySQL 8.4    →  MYSQL_SETUP_GUIDE.md §3
3. Deploy backend       →  clone, npm ci, .env, migrate, seed
4. systemd service      →  backend auto-restart
5. Build frontend       →  CI=true npm run build:ci
6. Nginx + TLS          →  sajikan dist, proxy /api, /uploads
7. Backup timer         →  systemd timer 02:00 WIB
8. Health check         →  /health, monitoring eksternal
```

---

## 3. Hardening Server

```bash
# Update & auto-security-updates
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Firewall: hanya SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# MySQL tidak diekspos ke internet (default: bind 127.0.0.1)
sudo ss -tlnp | grep 3306   # harus 127.0.0.1:3306, bukan 0.0.0.0

# Nonaktifkan login root SSH password (gunakan SSH key)
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

---

## 4. Deploy Backend

```bash
sudo useradd -r -s /usr/sbin/nologin smk
sudo mkdir -p /opt/smk-telkom-purwokerto
sudo chown -R smk:smk /opt/smk-telkom-purwokerto
sudo -u smk git clone <URL_REPO> /opt/smk-telkom-purwokerto

cd /opt/smk-telkom-purwokerto/backend
sudo -u smk npm ci --omit=dev
sudo -u smk cp .env.example .env
sudo chmod 600 .env
sudo -u smk nano .env      # isi nilai produksi
```

Isi `.env` produksi minimal:

```ini
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://smk_app:PASSWORD@127.0.0.1:3306/smk_telkom_purwokerto
FRONTEND_URL=https://smktelkom-pwt.sch.id
SESSION_SECRET=<random-64-char>
UPLOAD_ROOT=/var/lib/smk-telkom-purwokerto/uploads
MEDIA_BASE_URL=https://smktelkom-pwt.sch.id
PUBLIC_URL=https://smktelkom-pwt.sch.id
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
BACKUP_ENCRYPTION_KEY=<keygen>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role>
SUPABASE_BACKUP_BUCKET=mysql-backups
```

Terapkan skema:

```bash
sudo -u smk npm run prisma:generate
sudo -u smk npm run db:migrate
sudo -u smk npm run db:seed
```

---

## 5. systemd Service

`/etc/systemd/system/smk-backend.service`:

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
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/smk-telkom-purwokerto /opt/smk-telkom-purwokerto/backend/backups

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now smk-backend
sudo systemctl status smk-backend
sudo journalctl -u smk-backend -n 50
```

---

## 6. Frontend Build & Sajikan

```bash
cd /opt/smk-telkom-purwokerto/frontend
sudo -u smk npm ci
sudo -u smk env CI=true npm run build:ci
# output: /opt/smk-telkom-purwokerto/frontend/dist
```

> `build:ci` **harus** dijalankan dengan `CI=true`. Tanpa itu, langkah prerender
> menahan build. Build memprerender rute publik (mode strict).

Nginx (`/etc/nginx/sites-available/smk`):

```nginx
server {
    listen 80;
    server_name smktelkom-pwt.sch.id;

    root /opt/smk-telkom-purwokerto/frontend/dist;
    index index.html;

    client_max_body_size 12M;   # selaras batas upload 10 MB

    location / {
        try_files $uri $uri/ /index.html;
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

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

Aktifkan & TLS:

```bash
sudo ln -s /etc/nginx/sites-available/smk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d smktelkom-pwt.sch.id
```

> Setelah TLS aktif, perbarui `FRONTEND_URL`, `PUBLIC_URL`, dan `MEDIA_BASE_URL`
> ke `https://...`, lalu restart backend.

---

## 7. Upload Persisten

```bash
sudo mkdir -p /var/lib/smk-telkom-purwokerto/uploads
sudo chown -R smk:smk /var/lib/smk-telkom-purwokerto/uploads
```

Pastikan `UPLOAD_ROOT` menunjuk ke direktori ini. **Dokumen PPDB privat tidak
disajikan statis** — hanya via `GET /api/uploads/ppdb-documents/:userId`.

---

## 8. Backup Terjadwal

Salin template scheduler:

```bash
sudo cp backend/schedulers/linux-backup-daily.service /etc/systemd/system/
sudo cp backend/schedulers/linux-backup-daily.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smk-backup.timer
systemctl list-timers smk-backup.timer
```

Timer berjalan pada `19:00 UTC` = **02:00 WIB**. Buktikan dengan run manual:

```bash
sudo -u smk node /opt/smk-telkom-purwokerto/backend/scripts/backup.mjs
sudo -u smk node /opt/smk-telkom-purwokerto/backend/scripts/backup-verify.mjs
```

---

## 9. Verifikasi Pasca-Deploy

```bash
curl -s https://smktelkom-pwt.sch.id/health | jq
curl -sI https://smktelkom-pwt.sch.id/            # 200, header keamanan
sudo systemctl status smk-backend
sudo systemctl status smk-backup.timer
```

Checklist:

- [ ] `/health` → `{ ok: true, database: "up" }`
- [ ] Halaman publik memuat data dari MySQL
- [ ] Login admin berhasil, CRUD berfungsi
- [ ] Upload gambar konten sukses
- [ ] PPDB dapat menyimpan draft + dokumen privat
- [ ] Nginx memaksa HTTPS (redirect 301)
- [ ] `npm run db:backup` + `verify` sukses
- [ ] Monitoring eksternal memantau `/health`

---

## 10. Catatan Keamanan Produksi

- Aktifkan rate-limit yang sadar multi-instance bila di belakang load balancer
  (default in-memory tidak cocok untuk banyak node).
- Ganti `SESSION_SECRET` dan `BACKUP_ENCRYPTION_KEY` dengan nilai acak kuat;
  simpan di secret manager bila tersedia.
- Hapus `ADMIN_RECOVERY_*` dari `.env` setelah bootstrap admin.
- Rotasi password `smk_app` secara berkala.
- Pertimbangkan `fail2ban` untuk SSH/Nginx.
- Tinjau hasil `npm audit` (2 moderate backend, 10 frontend) sebelum go-live.

---

## 11. Rollback

- Database: restore dari backup terenkripsi (`MYSQL_BACKUP_GUIDE.md §7`).
- Kode: `git checkout <tag_sebelumnya>` lalu rebuild.
- Sumber Supabase tetap utuh sebagai referensi.
- Detail umum: `docs/ROLLBACK_GUIDE.md`.

---

## 12. Yang BELUM Diverifikasi (jujur)

| Item | Alasan |
|---|---|
| Deployment VPS nyata | Tidak ada akses VPS/DNS/TLS/kredensial |
| Upload backup ke Supabase | Tidak ada service role key |
| SMTP produksi | Tidak ada kredensial |
| NEXA/STELA live | Tidak ada provider key |

Langkah di dokumen ini adalah prosedur siap-pakai, bukan klaim sudah berjalan
di produksi.
