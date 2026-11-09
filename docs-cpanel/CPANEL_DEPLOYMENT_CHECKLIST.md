# Checklist Deployment cPanel — SMK Telkom Purwokerto

Checklist yang dapat dicentang oleh developer maupun administrator hosting.
Acuan detail: `docs/CPANEL_DEPLOYMENT_GUIDE.md`. Error: `docs/CPANEL_TROUBLESHOOTING.md`.

> Tandai `[x]` hanya setelah **benar-benar diverifikasi**. Langkah berlabel
> **[KONFIRMASI PROVIDER]** bergantung pada fitur hosting.

---

## A. Sebelum Deployment

- [ ] Sudah membaca `docs/CPANEL_DEPLOYMENT_GUIDE.md`.
- [ ] Source code di branch `main` commit yang disepakati sudah dikunci (tag/commit hash).
- [ ] Struktur dipahami: `frontend/` (static) dan `backend/` (Node app) **terpisah**.
- [ ] Backup database development/lokal dibuat.
- [ ] Nama domain frontend dan subdomain API ditetapkan (mis. `www.smkcontoh.sch.id`, `api.smkcontoh.sch.id`).
- [ ] Kredensial yang dibutuhkan sudah disiapkan (bukan secret di repo):
  - [ ] password user MySQL baru
  - [ ] `SESSION_SECRET` acak ≥ 32 karakter
  - [ ] `BACKUP_ENCRYPTION_KEY` (hasil `npm run db:backup:keygen`)
  - [ ] (opsional) SMTP, provider AI, Turnstile, Supabase service role
- [ ] Konfirmasi: `.env` **tidak** ikut di-commit (cek `.gitignore` root & `frontend/.gitignore`).

---

## B. Persiapan Akun cPanel

- [ ] Login cPanel berhasil.
- [ ] **[KONFIRMASI PROVIDER]** Node.js Application Manager tersedia.
- [ ] **[KONFIRMASI PROVIDER]** Versi **Node.js 22.x** dapat dipilih.
- [ ] **[KONFIRMASI PROVIDER]** Terminal/SSH tersedia (atau siapkan alur tanpa SSH).
- [ ] **[KONFIRMASI PROVIDER]** Cron Jobs tersedia.
- [ ] **[KONFIRMASI PROVIDER]** SSL/TLS (AutoSSL/Let's Encrypt) tersedia.
- [ ] **[KONFIRMASI PROVIDER]** `.htaccess` + `mod_rewrite` diizinkan.
- [ ] **[KONFIRMASI PROVIDER]** Outbound HTTPS diizinkan.
- [ ] **[KONFIRMASI PROVIDER]** `mysqldump`, `mysql`, `tar` tersedia di `PATH`.
- [ ] **[KONFIRMASI PROVIDER]** Kuota disk & memory Node app mencukupi.
- [ ] Struktur folder dibuat: backend di luar `public_html`, plus `uploads/` dan `backups/`.
- [ ] **[KONFIRMASI PROVIDER]** Bila Opsi B (satu domain): `mod_proxy` tersedia.

---

## C. Database (MySQL)

- [ ] Database dibuat (nama cPanel berprefix, mis. `smktelkom_smk`).
- [ ] User DB dibuat (mis. `smktelkom_app`).
- [ ] User dihubungkan ke database.
- [ ] Privilege diberikan (minimum per guide §4.2; atau `ALL PRIVILEGES`).
- [ ] Host koneksi `127.0.0.1` (localhost).
- [ ] `DATABASE_URL` dibentuk: `mysql://<user>:<pass>@127.0.0.1:3306/<db>`.
- [ ] Charset `utf8mb4`, collation `utf8mb4_unicode_ci` terkonfirmasi.
- [ ] Password user DB kuat dan URL-encoded bila perlu.
- [ ] **[KONFIRMASI PROVIDER]** shared hosting mengizinkan DDL (CREATE/ALTER/DROP) untuk migrasi.
- [ ] Backup sebelum migrasi dibuat.

---

## D. Frontend

- [ ] `VITE_API_BASE_URL` diset ke URL backend (https, non-localhost).
- [ ] `VITE_SITE_URL` diset (opsional).
- [ ] `npm ci` sukses di `frontend/`.
- [ ] Build dijalankan dengan **`npm run build`** (bukan `build:ci`).
- [ ] Build dijalankan di lingkungan yang **dapat menjangkau backend** (mode strict), atau
      `PRERENDER_MODE=resilient` diset secara sadar.
- [ ] `frontend/dist/` berisi `index.html`, `<route>/index.html`, `app.html`, `assets/`, `sitemap.xml`, `robots.txt`.
- [ ] `dist/` diunggah/di-ekstrak ke document root frontend.
- [ ] `.htaccess` SPA fallback dipasang (fallback ke `app.html`, tidak menangkap `/api`, `/uploads`, `/health`).
- [ ] `Options -Indexes` diaktifkan.
- [ ] Cache-Control aset ber-hash diset.
- [ ] Homepage memuat.
- [ ] Refresh pada `/berita` dan `/berita/<slug>` tidak 404.
- [ ] Mobile responsif.
- [ ] Tidak ada error "Failed to fetch" di Console browser.

---

## E. Backend

- [ ] Source backend diunggah (tanpa `node_modules/`, `.env`, `uploads/`, `backups/`).
- [ ] `UPLOAD_ROOT` dan `BACKUP_DIR` menunjuk lokasi persisten di luar source & `public_html`.
- [ ] Node.js App dibuat di panel (root, URL, startup file).
- [ ] Startup file = `src/server.js` (atau `app.js` shim bila panel mewajibkan). **[KONFIRMASI PROVIDER]**
- [ ] `npm ci` sukses (atau strategi devDeps terkelola untuk CLI prisma).
- [ ] Seluruh environment variable backend diisi (minimal 5 wajib).
- [ ] `npm run prisma:generate` sukses.
- [ ] `npm run db:migrate` sukses.
- [ ] `npm run db:status` → semua migrasi `applied`.
- [ ] `npm run db:seed` sukses (`site_settings` ada).
- [ ] Aplikasi di-restart dari panel tanpa error.
- [ ] `GET /health` → `{ ok: true, database: "up" }`.
- [ ] Log aplikasi bersih dari error.
- [ ] `argon2`/`bcrypt` termuat tanpa error "Cannot find module"/gyp.

---

## F. Domain dan SSL

- [ ] Subdomain API dibuat (`api.<domain>`).
- [ ] DNS `A`/`CNAME` benar (diverifikasi, bukan diasumsikan).
- [ ] Domain utama mengarah ke hosting (diverifikasi).
- [ ] SSL aktif untuk frontend.
- [ ] SSL aktif untuk API.
- [ ] Force HTTPS (301) untuk frontend dan API.
- [ ] `curl -s https://api.<domain>/health` berhasil.
- [ ] Tidak ada mixed content di Console browser.

---

## G. Environment Variables

- [ ] `NODE_ENV=production`.
- [ ] `PORT` sesuai panel.
- [ ] `DATABASE_URL` benar (host 127.0.0.1, prefix cPanel).
- [ ] `SESSION_SECRET` ≥ 32 karakter (bukan default contoh).
- [ ] `FRONTEND_URL` = origin frontend (https, tanpa trailing slash).
- [ ] `MEDIA_BASE_URL` = URL publik backend.
- [ ] `UPLOAD_ROOT` absolut & persisten.
- [ ] `SPMB_INTERNAL_ENABLED=false`.
- [ ] (opsional) SMTP, AI, Turnstile, Supabase backup env.
- [ ] Tidak ada AI/Turnstile/DB secret pada variabel `VITE_*`.
- [ ] `.env` backend permission `0600`.
- [ ] `ADMIN_RECOVERY_*` dihapus setelah bootstrap admin.

---

## H. Testing

- [ ] Frontend: homepage, profil, jurusan, prestasi, BKK, berita, pengumuman, kalender, ekstrakurikuler, galeri.
- [ ] Frontend: refresh route detail tidak 404.
- [ ] Backend: `/health`, `/api/auth/csrf`, `/api/auth/me`.
- [ ] Login admin berhasil.
- [ ] Non-admin ditolak (`/api/admin/*` → 403).
- [ ] CRUD Berita, Pengumuman, Prestasi, BKK, Events.
- [ ] Upload gambar konten berhasil.
- [ ] Dokumen PPDB privat: owner bisa akses, user lain ditolak.
- [ ] CORS berfungsi (origin diizinkan saja).
- [ ] CSRF: mutasi tanpa header → 400 `csrf_failed`.
- [ ] Session cookie tersimpan (HTTPS).
- [ ] SPMB internal nonaktif: mutasi ditolak `503 SPMB_DISABLED`; CTA ke portal resmi.
- [ ] Koneksi MySQL stabil.
- [ ] `npm run db:status` bersih.
- [ ] Upload persisten setelah restart app.
- [ ] Backup manual berhasil.
- [ ] Restore test database berhasil (bukan production).
- [ ] Cron job backup berjalan & log terbentuk.
- [ ] HTTPS aktif di seluruh halaman.
- [ ] Log error kosong.

---

## I. Security

- [ ] User DB least-privilege (bukan `root`).
- [ ] Port 3306 tidak diekspos publik.
- [ ] `.env`, `backups/`, `uploads/ppdb-documents/` **tidak** dapat diakses via URL publik.
- [ ] Direktori backend di luar `public_html` (bila memungkinkan).
- [ ] Directory listing dimatikan (`Options -Indexes`).
- [ ] Cookie: `session_token` httpOnly + secure + SameSite=Lax.
- [ ] CORS satu origin (tanpa wildcard).
- [ ] CSRF aktif untuk semua mutasi.
- [ ] Rate limit aktif.
- [ ] Upload: whitelist MIME + magic bytes + batas 10 MB.
- [ ] Dokumen PPDB privat via API berautentikasi saja.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` hanya di backend.
- [ ] `BACKUP_ENCRYPTION_KEY` disimpan terpisah dari backup.
- [ ] `NODE_ENV=production` (tidak membocorkan stack trace).
- [ ] Admin recovery sudah dibersihkan; password admin diganti dari UI.

---

## J. Backup dan Recovery

- [ ] `BACKUP_ENCRYPTION_KEY` dibuat & disimpan aman (password/secret manager).
- [ ] Bucket Supabase `mysql-backups` bersifat **private**.
- [ ] `npm run db:backup` berhasil (status `REMOTE_VERIFIED`).
- [ ] `npm run db:backup:verify` PASS.
- [ ] Manifest baru muncul di `backups/manifests/`.
- [ ] Retensi 30 hari berfungsi (file lama terhapus).
- [ ] Restore diuji ke database testing (jumlah baris cocok).
- [ ] Restore uploads diuji ke direktori testing.
- [ ] Cron backup terdaftar & terverifikasi.
- [ ] (Bila tanpa mysqldump/tar/cron) prosedur alternatif Backup Wizard/phpMyAdmin didokumentasikan.
- [ ] Prosedur rollback (kode + database) dipahami.

---

## K. Serah Terima

- [ ] Semua kredensial diserahkan via kanal aman (bukan email/chat biasa).
- [ ] Akses admin dibuat dan diuji.
- [ ] Dokumen ini dan `CPANEL_DEPLOYMENT_GUIDE.md` disimpan bersama tim.
- [ ] Monitoring `/health` disiapkan.
- [ ] Kontak provider hosting (jika ada masalah fitur) dicatat.
