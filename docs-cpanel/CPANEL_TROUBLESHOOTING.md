# Troubleshooting Deployment cPanel — SMK Telkom Purwokerto

Referensi error yang sering muncul saat men-deploy aplikasi ke cPanel, spesifik
untuk source code repository ini. Setiap kasus berisi: **gejala**, **kemungkinan
penyebab**, **cara diagnosis**, **perintah pemeriksaan**, dan **solusi aman**.

Acuan: `docs/CPANEL_DEPLOYMENT_GUIDE.md`. Checklist: `docs/CPANEL_DEPLOYMENT_CHECKLIST.md`.

> Catatan umum: banyak kasus cPanel bergantung pada fitur provider.
> Langkah yang butuh konfirmasi provider ditandai **[KONFIRMASI PROVIDER]**.

---

## Daftar cepat

| # | Gejala utama |
|---|---|
| 1 | Node.js Application gagal startup |
| 2 | Passenger restart error |
| 3 | Cannot find module |
| 4 | Node version tidak didukung |
| 5 | Database connection refused |
| 6 | Access denied MySQL |
| 7 | Prisma generate gagal |
| 8 | Migration gagal |
| 9 | Frontend "Failed to fetch" |
| 10 | CORS error |
| 11 | CSRF error |
| 12 | Login admin gagal |
| 13 | Session cookie tidak tersimpan |
| 14 | 404 React Router |
| 15 | Asset tidak ditemukan |
| 16 | Upload permission denied |
| 17 | Error 413 |
| 18 | Backup gagal |
| 19 | Cron job tidak berjalan |
| 20 | SSL error |
| 21 | Outbound connection tidak tersedia |

---

## 1. Node.js Application gagal startup

**Gejala:** aplikasi tidak jalan; panel menampilkan error startup atau HTTP 5xx;
log menunjukkan proses keluar segera.

**Kemungkinan penyebab:**
- Environment variable wajib kosong/tidak valid (Zod `backend/src/config/env.js` menolak).
- `PORT` tidak diberikan panel atau bukan bilangan bulat.
- Startup file salah (`src/server.js` vs `app.js`).
- Dependency belum diinstal / `node_modules` tidak lengkap.
- Prisma client belum di-generate.

**Cara diagnosis:** baca log aplikasi di panel; cek variabel wajib; cek startup file.

**Perintah pemeriksaan:**
```bash
node -e "console.log(process.env.NODE_ENV, process.env.PORT, process.env.FRONTEND_URL)"
cd <app-root> && node src/server.js   # jalankan manual (bila ada SSH)
```

**Solusi aman:**
- Isi `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `SESSION_SECRET` (≥32), `FRONTEND_URL`.
- Set startup file sesuai kebijakan panel **[KONFIRMASI PROVIDER]**.
- Jalankan `npm ci` lalu `npm run prisma:generate`.
- Restart dari panel.

---

## 2. Passenger restart error

**Gejala:** tombol Restart gagal; aplikasi berhenti lalu tidak naik; pesan Passenger
(`Application could not be started`, `Passenger: preloader`).

**Kemungkinan penyebab:**
- Startup file bukan ESM (`"type": "module"`)—shim `require` gagal.
- Aplikasi tidak memanggil `listen()` sesuai ekspektasi Passenger.
- Node version Passenger berbeda dari yang dipilih.
- Dependensi hilang sehingga proses crash sebelum listen.

**Cara diagnosis:** cek `stderr.log` aplikasi di panel; uji start manual.

**Perintah pemeriksaan:**
```bash
cd <app-root> && PORT=<port> node src/server.js
```

**Solusi aman:**
- Pastikan startup file memakai `import` (ESM), bukan `require`.
- Bila panel menghendaki shim root, buat `app.js` (dibuat saat deployment, bukan ubah kode aplikasi):
  ```js
  import './src/server.js';
  ```
- Samakan Node version aplikasi dengan version yang dipilih panel.
- Restart setelah dependency & prisma client siap. **[KONFIRMASI PROVIDER]** format startup.

---

## 3. Cannot find module

**Gejala:** `Error: Cannot find module '@prisma/client'` (atau `argon2`, `express`,
`dotenv/config`, dsb).

**Kemungkinan penyebab:**
- `npm install`/`npm ci` tidak dijalankan atau gagal sebagian.
- `npm ci --omit=dev` menghapus modul yang dibutuhkan, atau `prisma generate` belum jalan.
- Working directory proses bukan folder `backend/` (sehingga `.env`/`node_modules` tak ketemu).
- Native module (`argon2`, `bcrypt`) gagal dibangun.

**Cara diagnosis:** cek isi `node_modules/`; jalankan install ulang; cek log install.

**Perintah pemeriksaan:**
```bash
cd <app-root> && ls node_modules/@prisma/client node_modules/argon2
cd <app-root> && node -e "import('argon2').then(()=>console.log('argon2 ok')).catch(e=>console.error(e.message))"
```

**Solusi aman:**
- `npm ci` penuh, lalu `npm run prisma:generate`.
- Pastikan Working Directory = folder `backend/`.
- Bila modul native gagal: minta provider menyediakan toolchain build / prebuilt
  yang cocok, atau pilih Node version yang punya prebuilt **[KONFIRMASI PROVIDER]**.

---

## 4. Node version tidak didukung

**Gejala:** sintaks/API error, crash saat load, `SyntaxError` pada fitur modern, atau
panel tidak menyediakan Node 22.

**Kemungkinan penyebab:**
- Provider hanya menyediakan Node versi lama (mis. 18).
- Aplikasi butuh ≥ 22.12.0 (Vite 8, Prisma 7).

**Cara diagnosis:** cek versi Node yang benar-benar dipakai proses.

**Perintah pemeriksaan:**
```bash
node -v && npm -v
```

**Solusi aman:**
- Pilih Node **22.x** di panel **[KONFIRMASI PROVIDER]**.
- Bila provider tidak menyediakan Node 22: **jangan deploy backend di paket tersebut**.
  Pindah ke paket/VPS yang mendukung Node 22, atau jalankan backend terpisah
  (VPS) dan frontend tetap di cPanel.
- Jangan memaksa menurunkan dependency ke versi lama tanpa audit (berisiko keamanan).

---

## 5. Database connection refused

**Gejala:** `/health` → `{ ok: false, database: "down" }` (HTTP 503);
log menampilkan `ECONNREFUSED` atau `Can't reach database server`.

**Kemungkinan penyebab:**
- Host/port salah di `DATABASE_URL`.
- MySQL tidak berjalan (jarang di cPanel, tapi mungkin).
- Menghubungi host yang salah (mis. IP publik, bukan `127.0.0.1`).

**Cara diagnosis:** uji koneksi langsung; verifikasi host.

**Perintah pemeriksaan:**
```bash
cd <app-root> && node scripts/check-db.mjs   # -> "Prisma connection OK"
curl -s https://api.<domain>/health
```

**Solusi aman:**
- Pastikan `DATABASE_URL` memakai `127.0.0.1:3306` dan nama DB prefix cPanel.
- Pastikan user DB punya akses ke DB itu.
- **Jangan** membuka MySQL ke publik.

---

## 6. Access denied MySQL

**Gejala:** `Access denied for user '...'@'localhost' (using password: YES)`;
`ER_ACCESS_DENIED_ERROR`.

**Kemungkinan penyebab:**
- Password salah atau karakter spesial tidak URL-encoded.
- User dibuat untuk host berbeda (`localhost` vs `127.0.0.1` vs `%`).
- User belum dihubungkan ke database, atau privilege kurang.

**Cara diagnosis:** uji kredensial; cek host user.

**Perintah pemeriksaan:**
```bash
node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.username, u.hostname, u.pathname)"
```

**Solusi aman:**
- Perbaiki password (URL-encode `@ : / #`).
- Pastikan user DB dibuat untuk host `127.0.0.1` (dan/atau `localhost`) sesuai
  koneksi aplikasi.
- Hubungkan user ke DB dan beri privilege yang benar.
- **Jangan** memakai `root`.

---

## 7. Prisma generate gagal

**Gejala:** `prisma generate` error; `@prisma/client` tidak siap;
`@prisma/engines` gagal diunduh; CLI `prisma` tidak ditemukan.

**Kemungkinan penyebab:**
- CLI `prisma` (devDependency) dihapus oleh `npm ci --omit=dev`.
- Outbound HTTPS diblokir saat Prisma mengunduh artefak.
- Versi Node tidak cocok.
- `DATABASE_URL` tidak terbaca saat generate (bila `prisma.config.ts` butuh env).
- Kuota disk penuh.

**Cara diagnosis:** jalankan ulang dengan verbose; cek `node_modules/.prisma` dan `node_modules/@prisma/client`.

**Perintah pemeriksaan:**
```bash
cd <app-root> && npx prisma -v
cd <app-root> && npm run prisma:generate
```

**Solusi aman:**
- Jalankan `npm ci` (lengkap, jangan `--omit=dev` sebelum generate).
- Set `DATABASE_URL` sebelum generate.
- Izinkan outbound HTTPS ke registry/Prisma **[KONFIRMASI PROVIDER]**.
- Prisma 7 dengan `@prisma/adapter-mariadb` tidak memerlukan engine Rust untuk
  runtime query; fokuskan masalah pada CLI + artefak generate.

---

## 8. Migration gagal

**Gejala:** `prisma migrate deploy` error; `db:status` menunjukkan pending/failed;
error DDL (`CREATE`/`ALTER` ditolak), timeout, atau `P3009`.

**Kemungkinan penyebab:**
- Privilege DB kurang (butuh `CREATE/ALTER/INDEX/DROP/REFERENCES`).
- Shared hosting membatasi DDL atau locking **[KONFIRMASI PROVIDER]**.
- `DATABASE_URL` salah/mengarah ke DB lain.
- Constraint FK/enum bentrok dengan skema lama.

**Cara diagnosis:** cek status; baca pesan error migrasi spesifik; pastikan DB kosong/benar.

**Perintah pemeriksaan:**
```bash
cd <app-root> && npm run db:status
cd <app-root> && npm run db:migrate
```

**Solusi aman:**
- Backup sebelum migrasi (§13 guide).
- Berikan privilege yang diperlukan.
- **Jangan** `prisma migrate dev` di production; **jangan** reset/`--force`.
- **Jangan** hapus file migration. Bila migrasi gagal di tengah, perbaiki akar
  masalah lalu deploy ulang migrasi yang sama (idempoten untuk yang belum terpasang).
- Migrasi yang berlaku: 4 direktori di `backend/prisma/migrations/` (lihat guide §11.4).

---

## 9. Frontend "Failed to fetch"

**Gejala:** halaman publik kosong / data tidak muncul; Console:
`TypeError: Failed to fetch` atau `ApiError: Tidak dapat terhubung ke server`.

**Kemungkinan penyebab:**
- `VITE_API_BASE_URL` salah atau tertanam saat build sebagai localhost.
- Backend tidak jalan / health down.
- HTTPS frontend tetapi `VITE_API_BASE_URL` http (mixed content).
- CORS menolak origin.

**Cara diagnosis:** cek Network tab (URL yang dipanggil); cek `/health`; cek string
API di bundel.

**Perintah pemeriksaan:**
```bash
curl -s https://api.<domain>/health
grep -o "https://[^\"]*" <docroot>/assets/*.js | head
```

**Solusi aman:**
- **Build ulang** frontend dengan `VITE_API_BASE_URL` benar (Vite menanam saat build).
- Pastikan backend hidup dan HTTPS.
- Samakan skema (https) frontend & API.

---

## 10. CORS error

**Gejala:** Console: `has been blocked by CORS policy`; Network preflight `OPTIONS`
gagal; respons `403 origin_rejected`.

**Kemungkinan penyebab:**
- `FRONTEND_URL` backend tidak sama dengan origin browser (skema/host/port/trailing slash).
- Origin berbeda (mis. `www` vs tanpa `www`).
- Cookie/credentials dicoba ke origin yang salah.

**Cara diagnosis:** bandingkan origin browser dengan `FRONTEND_URL`; lihat header respons.

**Perintah pemeriksaan:**
```bash
curl -s -D - -o /dev/null -H "Origin: https://<origin-frontend>" https://api.<domain>/health
```

**Solusi aman:**
- Set `FRONTEND_URL` persis sama dengan origin frontend (https, tanpa `/` di akhir).
- `backend/src/app.js` memakai origin **tunggal** (bukan wildcard) dan
  `credentials: true`; jangan mendaftar beberapa origin.
- Bila frontend & API beda subdomain, itu memang Opsi A (didukung).

---

## 11. CSRF error

**Gejala:** respons `400 { code: "csrf_failed" }` pada POST/PUT/PATCH/DELETE.

**Kemungkinan penyebab:**
- Cookie `csrf_token` tidak ada/belum diambil.
- Header `x-csrf-token` tidak dikirim atau tidak sama dengan cookie.
- Cookie tidak tersimpan karena bukan HTTPS (karena `secure: true`).
- Ada proxy yang menghilangkan cookie.

**Cara diagnosis:** cek cookie `csrf_token` di browser; cek header pada request mutasi.

**Perintah pemeriksaan:**
```bash
curl -s -c cookies.txt https://api.<domain>/api/auth/csrf
cat cookies.txt
```

**Solusi aman:**
- Pastikan HTTPS aktif (cookie `secure`).
- Frontend `apiClient.js` otomatis memanggil `/api/auth/csrf` dan mengirim header;
  pastikan `credentials: 'include'`.
- Jangan mengubah `sameSite`/`secure` manual.

---

## 12. Login admin gagal

**Gejala:** login ditolak; pesan "Email atau password salah" atau "Anda tidak memiliki
akses sebagai admin"; `/api/auth/me` mengembalikan role non-admin.

**Kemungkinan penyebab:**
- Akun bukan admin (tidak ada relasi di `admins`).
- Password salah / akun belum dibuat (`db:seed` + `ADMIN_RECOVERY_*` belum dijalankan).
- Email belum terverifikasi tidak memblokir login, tetapi `emailVerified` false.
- Session/cookie gagal tersimpan (lihat #13).

**Cara diagnosis:** cek `/api/auth/me` setelah login; cek tabel `admins`/`users`.

**Perintah pemeriksaan:**
```bash
cd <app-root> && npm run db:diagnose-auth
```

**Solusi aman:**
- Bootstrap admin dengan `ADMIN_RECOVERY_*` + `npm run db:seed`, lalu **hapus**
  variabel tersebut dan ganti password dari UI. Lihat `docs/ADMIN_ACCOUNT_RECOVERY.md`.
- Bila email sudah ada tanpa profil admin, seed **menolak** mengubahnya kecuali
  `ADMIN_RECOVERY_ALLOW_EXISTING=true` (set hanya bila akun memang milik operator).

---

## 13. Session cookie tidak tersimpan

**Gejala:** login "berhasil" tetapi `/api/auth/me` langsung 401; tetap logout setelah refresh.

**Kemungkinan penyebab:**
- Cookie `secure: true` tetapi situs diakses via HTTP.
- Domain/subdomain cookie + CORS `credentials` tidak konsisten.
- Browser memblokir cookie pihak ketiga (cross-site tanpa `SameSite=None`).
- `FRONTEND_URL` salah sehingga cookie untuk origin lain.

**Cara diagnosis:** cek Application tab → Cookies; cek `Set-Cookie` di respons login.

**Perintah pemeriksaan:**
```bash
curl -s -i -c c.txt -X POST https://api.<domain>/api/auth/login \
  -H "content-type: application/json" -H "x-csrf-token: <token>" \
  -d '{"email":"x@y.z","password":"..."}'
```

**Solusi aman:**
- Wajib HTTPS.
- Pastikan frontend memanggil API dengan `credentials: 'include'` (sudah di `apiClient.js`).
- Pertahankan `sameSite: 'lax'` + `secure` (default production).

---

## 14. 404 React Router

**Gejala:** membuka `/berita/<slug>` lalu refresh → 404; deep link admin 404.
Halaman yang sudah diprerender juga bisa 404 bila `.htaccess` salah.

**Kemungkinan penyebab:**
- `.htaccess` SPA fallback tidak ada/salah.
- Fallback diarahkan ke `index.html` padahal shell SPA adalah `app.html`.
- `mod_rewrite` tidak aktif **[KONFIRMASI PROVIDER]**.

**Cara diagnosis:** cek permintaan HTTP route langsung; cek `.htaccess`.

**Perintah pemeriksaan:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/berita
curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/dashboard
```

**Solusi aman:** pasang `.htaccess` sesuai guide §7.8 (fallback ke `app.html`,
sajikan file/direktori yang ada lebih dulu, kecualikan `/api`, `/uploads`, `/health`).

---

## 15. Asset tidak ditemukan

**Gejala:** gambar/font/CSS 404; layout rusak; Console 404 pada `/assets/...`.

**Kemungkinan penyebab:**
- `dist/assets/` tidak terunggah lengkap, atau base path salah.
- Unggah hanya sebagian file (extract gagal).
- Aset disajikan dari subfolder tetapi path absolut `/assets/...`.

**Cara diagnosis:** cek keberadaan file di document root; cek URL aset di Network.

**Perintah pemeriksaan:**
```bash
ls <docroot>/assets | head
curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/assets/<file>.js
```

**Solusi aman:** unggah ulang seluruh isi `dist/` ke document root yang benar; jangan
memindahkan subfolder sembarangan.

---

## 16. Upload permission denied

**Gejala:** upload gagal; log `EACCES`/`EPERM`; media URL 500.

**Kemungkinan penyebab:**
- `UPLOAD_ROOT` tidak ada atau tidak dapat ditulis proses Node.
- Owner/permission folder salah.
- `UPLOAD_ROOT` menunjuk ke lokasi yang dilindungi (mis. folder root).

**Cara diagnosis:** cek keberadaan & permission folder upload.

**Perintah pemeriksaan:**
```bash
ls -ld <UPLOAD_ROOT> <UPLOAD_ROOT>/content-images
touch <UPLOAD_ROOT>/.write-test && rm <UPLOAD_ROOT>/.write-test
```

**Solusi aman:**
- Set `UPLOAD_ROOT` ke lokasi persisten di luar `public_html`; direktori `755`,
  owner = user akun cPanel.
- Recreate folder `content-images/` dan `ppdb-documents/submissions/` bila perlu.
- Jangan menaruh `ppdb-documents` di area yang dilayani Apache statis.

---

## 17. Error 413

**Gejala:** upload gagal dengan `413 Payload Too Large` (biasanya dari Apache/Passenger).

**Kemungkinan penyebab:**
- Batas body request web server lebih kecil dari file (backend `express.json` limit
  `1mb` untuk JSON, dan multer `10mb` untuk file → file >10 MB wajar ditolak);
- Apache/Passenger `LimitRequestBody` menghalangi sebelum sampai backend.

**Cara diagnosis:** cek ukuran file; cek error log Apache/Passenger.

**Perintah pemeriksaan:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -F "file=@<file>" \
  -H "x-csrf-token: <token>" https://api.<domain>/api/uploads/content
```

**Solusi aman:**
- Backend membatasi file 10 MB (`routes/uploads.js`). Minta user mengecilkan file
  bila melebihi.
- Naikkan `LimitRequestBody` Apache bila provider mengizinkan **[KONFIRMASI PROVIDER]**
  (jangan melebihi batas aplikasi 10 MB tanpa menyesuaikan multer).

---

## 18. Backup gagal

**Gejala:** `backup_failed`; exit non-zero; `mysqldump gagal`; `tar gagal`;
`Upload ... gagal`; `Backup lain sedang berjalan`.

**Kemungkinan penyebab:**
- `mysqldump`/`mysql`/`tar` tidak ada atau `MYSQLDUMP_PATH`/`MYSQL_PATH` salah.
- `spawn` child process diblokir **[KONFIRMASI PROVIDER]**.
- `BACKUP_ENCRYPTION_KEY` tidak valid (bukan base64 32 byte).
- `SUPABASE_*` kosong di production → exit 1 (disengaja).
- Outbound HTTPS ke Supabase diblokir.
- Lock `.backup.lock` tertinggal dari proses yang mati.
- Kuota disk penuh.

**Cara diagnosis:** baca log JSON backup; cek binary & lock; jalankan manual.

**Perintah pemeriksaan:**
```bash
cd <app-root> && npm run db:backup -- --no-upload
ls <BACKUP_DIR>/.backup.lock   # hapus HANYA bila dipastikan tak ada proses backup
```

**Solusi aman:**
- Set path binary absolut; izinkan outbound HTTPS.
- Perbaiki `BACKUP_ENCRYPTION_KEY` (hasil `npm run db:backup:keygen`).
- Isi `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_BACKUP_BUCKET` atau jalankan
  `--no-upload` (sadari konsekuensinya).
- Bila `mysqldump`/`tar`/outbound tidak tersedia: gunakan cPanel Backup Wizard /
  phpMyAdmin (tanpa enkripsi otomatis) — lihat guide §13.4.

---

## 19. Cron job tidak berjalan

**Gejala:** backup terjadwal tidak terbentuk; log kosong; tidak ada file baru.

**Kemungkinan penyebab:**
- Path `node`/script salah (cron tidak memakai environment panel).
- Environment variable tidak tersedia di cron.
- Timezone server berbeda (UTC vs WIB).
- `mysqldump`/lock/outbound bermasalah (lihat #18).
- Cron belum disimpan/aktif.

**Cara diagnosis:** cek daftar cron; cek log; jalankan perintah yang sama manual.

**Perintah pemeriksaan:**
```bash
# contoh menjalankan persis seperti cron (path placeholder)
cd <app-root> && CD=<app-root> /home/<akun>/nodevenv/.../bin/node scripts/backup.mjs
```

**Solusi aman:**
- Gunakan path absolut Node versi aplikasi & script **[KONFIRMASI PROVIDER]**.
- Ekspor/`source` env yang dibutuhkan (permission env `0600`).
- Sesuaikan jadwal dengan timezone server (`0 19 * * *` UTC = 02:00 WIB).
- Pastikan hanya satu cron backup.

---

## 20. SSL error

**Gejala:** peringatan sertifikat; cookie tidak tersimpan; mixed content; `curl` gagal
verifikasi.

**Kemungkinan penyebab:**
- Sertifikat belum diterbitkan untuk subdomain API.
- HTTP masih dipakai padahal cookie `secure`.
- Resource http di halaman https.

**Cara diagnosis:** periksa status sertifikat per host; cek Console mixed content.

**Perintah pemeriksaan:**
```bash
curl -sI https://<domain>/ | head
curl -sI https://api.<domain>/health | head
```

**Solusi aman:**
- Terbitkan SSL untuk **kedua** host (frontend + API).
- Paksa redirect 301 HTTP→HTTPS.
- Ganti semua URL http menjadi https (termasuk `VITE_API_BASE_URL`, `MEDIA_BASE_URL`,
  `FRONTEND_URL`).

---

## 21. Outbound connection tidak tersedia

**Gejala:** backup ke Supabase gagal; login Turnstile gagal; STELA/NextTel error
`provider_failed`; email tidak terkirim.

**Kemungkinan penyebab:**
- Firewall provider memblokir outbound HTTPS.
- Proxy wajib belum dikonfigurasi.

**Cara diagnosis:** uji konektivitas keluar dari host/app.

**Perintah pemeriksaan:**
```bash
cd <app-root> && node -e "fetch('https://challenges.cloudflare.com').then(r=>console.log('turnstile',r.status)).catch(e=>console.error('BLOCKED',e.message))"
```

**Solusi aman:**
- Minta provider membuka outbound HTTPS ke host tujuan (Supabase, SMTP, provider AI,
  Cloudflare) **[KONFIRMASI PROVIDER]**.
- Bila tidak diizinkan: nonaktifkan fitur yang bergantung outbound (mis. jalankan
  `db:backup --no-upload` dengan prosedur backup alternatif) dan dokumentasikan
  keterbatasannya. Jangan mengklaim fitur berfungsi bila outbound tidak tersedia.

---

## Lampiran — Perintah diagnosis cepat (placeholder)

```bash
# Kesehatan backend
curl -s https://api.<domain>/health

# Koneksi DB
cd <app-root> && node scripts/check-db.mjs

# Status migrasi
cd <app-root> && npm run db:status

# Diagnosa auth
cd <app-root> && npm run db:diagnose-auth

# Backup lokal (tanpa upload)
cd <app-root> && npm run db:backup -- --no-upload
cd <app-root> && npm run db:backup:verify

# Cek versi runtime
node -v && npm -v
```
