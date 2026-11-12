# Panduan Deployment cPanel — SMK Telkom Purwokerto

Dokumen utama untuk memindahkan aplikasi **SMK Telkom Purwokerto** dari lingkungan
development lokal ke **hosting cPanel**.

> **Status dokumen:** dibuat berdasarkan audit source code repository pada branch
> `main` (commit saat dokumen ini dibuat). **Belum ada deployment, SSH, perubahan
> DNS, unggahan file, atau perubahan database production yang dilakukan.**
> Semua nilai rahasia ditulis sebagai placeholder.

> **WAJIB DIKONFIRMASI KE PROVIDER HOSTING:** paket cPanel memiliki fitur yang
> berbeda-beda. Setiap langkah yang bergantung pada fitur provider diberi label ini.

Dokumen terkait (semuanya di folder `docs-cpanel/`):

- [`./README.md`](./README.md) — halaman awal & urutan membaca (mulai dari sini).
- [`./CPANEL_DEPLOYMENT_CHECKLIST.md`](./CPANEL_DEPLOYMENT_CHECKLIST.md) — checklist yang dapat dicentang.
- [`./CPANEL_TROUBLESHOOTING.md`](./CPANEL_TROUBLESHOOTING.md) — referensi error dan solusi.
- [`./sql/README.md`](./sql/README.md) — cara impor SQL & melanjutkan Prisma migration.

> **File SQL tidak ada di GitHub.** Atas permintaan guru pembimbing, file SQL
> schema-only **dikirim terpisah oleh developer** (mis. lewat WhatsApp), bukan lewat
> tautan repository. File `*.sql` di `docs-cpanel/sql/` **diabaikan Git**; yang tersisa
> di repo hanya panduan impornya ([`./sql/README.md`](./sql/README.md)).

---

## 1. Pendahuluan

### 1.1 Tujuan

Menjadi acuan tunggal dan akurat untuk men-deploy aplikasi ke hosting cPanel,
boleh diikuti developer maupun administrator hosting, tanpa mengandalkan asumsi
fitur cPanel generik.

### 1.2 Sumber audit (source of truth)

Dokumen ini disusun dari pembacaan langsung source code, bukan dari README lama.

| Area | Berkas yang diaudit |
|---|---|
| Root | `package.json`, `README.md`, `.gitignore`, skrip deploy `*.sh` |
| Frontend | `frontend/package.json`, `frontend/.env.example`, `frontend/vite.config.js`, `frontend/vercel.json`, `frontend/src/services/apiClient.js`, `frontend/src/services/apiAuthService.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/App.jsx`, `frontend/scripts/prerender-seo.mjs`, `frontend/scripts/validate-deployment-env.mjs`, `frontend/index.html` |
| Backend | `backend/package.json`, `backend/.env.example`, `backend/prisma.config.ts`, `backend/prisma/schema.prisma`, seluruh `backend/prisma/migrations/*`, `backend/src/server.js`, `backend/src/app.js`, `backend/src/config/env.js`, `backend/src/db.js`, `backend/src/routes/*`, `backend/src/middleware/*`, `backend/src/utils/*`, `backend/scripts/*`, `backend/schedulers/*` |
| Dokumentasi lama | `docs/DEPLOYMENT_GUIDE.md`, `docs/VPS_DEPLOYMENT_GUIDE.md`, `docs/VPS_DEPLOYMENT_READINESS.md`, `docs/MYSQL_SETUP_GUIDE.md`, `docs/MYSQL_BACKUP_GUIDE.md`, `backend/docs-mysql/*` |

### 1.3 Ketidaksesuaian yang ditemukan (source code vs dokumentasi lama)

Source code aktual dipakai sebagai acuan. Ketidaksesuaian yang perlu dicatat:

1. **README utama masih mendeskripsikan Supabase** sebagai database/Auth/Storage
   runtime (`README.md` bagian "Arsitektur", "Supabase", "STELA AI"). Kondisi aktual:
   frontend **tidak lagi** mengakses Supabase; `frontend/src/services/apiClient.js`
   berkomentar "Tidak ada lagi request langsung ke Supabase dari frontend", dan
   `frontend/.env.example` menyatakan variabel Supabase tidak dipakai. Database
   operasional adalah **MySQL/MariaDB via backend Express**. Supabase hanya dipakai
   backend untuk **backup terenkripsi** (`SUPABASE_BACKUP_BUCKET`).
2. **`README.md` masih menulis Vercel** sebagai target deploy, dan `frontend/vercel.json`
   membuktikannya. Dokumen ini memperlakukan **cPanel** sebagai target, terpisah dari
   jalur Vercel.
3. **`docs/DEPLOYMENT_GUIDE.md` dan `docs/VPS_DEPLOYMENT_GUIDE.md` berisi instruksi VPS**:
   `systemd`, Nginx reverse proxy, `certbot`, `pm2`, `useradd`, `ufw`. **Semua ini tidak
   berlaku di cPanel.** Jangan menempel perintah VPS ke cPanel.
4. **Versi Node pada dokumen lama**: `docs/MYSQL_SETUP_GUIDE.md` menulis Node.js 20 LTS,
   `docs/DEPLOYMENT_GUIDE.md` menulis 20 LTS, `docs/VPS_DEPLOYMENT_READINESS.md` menulis
   22 LTS, `README.md` menulis `>=22.12.0`. Source tidak memiliki field `engines`.
   Acuan yang dipakai dokumen ini: **Node.js 22** (selaras `.github/workflows/frontend-ci.yml`
   yang memakai `node-version: '22'` dan `README.md`).
5. **`docs/MYSQL_SETUP_GUIDE.md` menyebut "16 tabel"**. Angka 16 benar sebagai *jumlah
   tabel total*, tetapi rinciannya: `backend/prisma/schema.prisma` mendefinisikan
   **15 model aplikasi** (15 tabel) **+ 1 tabel internal `_prisma_migrations`** = **16 tabel**
   (lihat §6.3).
6. **`README.md` menyebut migration Supabase `001`–`006`** (`supabase/migrations/*`).
   Itu **tidak** dipakai pada arsitektur MySQL. Migrasi yang berlaku adalah
   `backend/prisma/migrations/*` (4 direktori, lihat §11).
7. **Versi Prisma CLI vs Prisma Client.** `backend/package.json` (versi ter-commit)
   memakai `@prisma/client: ^7.10.1`, `@prisma/adapter-mariadb: ^7.10.1`, dan
   `prisma: 7.10.1` (devDependency). Semua skrip `npm run db:*`/`prisma:*` mengasumsikan
   CLI **Prisma 7**. Jika CLI yang terpasang adalah Prisma 8 RC (`prisma 8.0.0-rc.*`),
   perintah `prisma migrate …`/`prisma generate` **berubah/tidak kompatibel** (mis.
   `prisma migrate status` → `prisma migration status`). Untuk proyek yang masih memakai
   migrasi format Prisma 7 ini, **pin CLI ke `prisma@7.10.1`** sebelum deployment, dan
   pastikan `npx prisma -v` menampilkan `7.10.1`. Lihat §11.1 dan Troubleshooting §7.
   > **Status repo saat ini:** `backend/package.json` dan `backend/package-lock.json`
   > sudah kembali memakai `prisma: 7.10.1` (selaras dengan `@prisma/client` dan
   > `@prisma/adapter-mariadb` `^7.10.1`). Bila suatu saat working tree menaikkan
   > `prisma` ke `^8.0.0-rc.*`, **jangan commit** perubahan itu; pulihkan ke `7.10.1`
   > lalu `npm ci`.

> Catatan: folder `supabase/` dan referensi README lama tetap ada di repository sebagai
> artefak ETL/legacy. Dokumen cPanel ini mengabaikannya kecuali untuk backup Storage.

---

## 2. Arsitektur

```
Browser
   |
   v
Domain Sekolah / HTTPS
   |
   +-----------------------------+
   |                             |
   v                             v
Frontend React + Vite       Backend Node.js
Static Build (dist/)        Express API (src/server.js)
   |                             |
   |                             v
   |                         MySQL (127.0.0.1)
   |
   +---------- API Request ------+

Backend
   |
   v
Supabase Storage (bucket privat `mysql-backups`) -> backup terenkripsi AES-256-GCM
```

Prinsip:

- **Frontend** = hasil build **statis** (`frontend/dist/`), disajikan apa adanya oleh
  web server. Frontend **tidak pernah** menyentuh database.
- **Backend** = proses Node.js long-running (Express) yang **harus** dijalankan oleh
  Node.js Application Manager cPanel. Backend memegang kredensial DB dan secret.
- **MySQL** = satu-satunya database operasional, diakses backend via `@prisma/adapter-mariadb`.
- **Supabase Storage** hanya tujuan **backup terenkripsi** (opsional, lihat §13).

Konsekuensi penting: **frontend dan backend punya proses deployment yang berbeda.**
Frontend = unggah file statis. Backend = aplikasi Node.js dengan runtime persisten.

---

## 3. Persyaratan Hosting

### 3.1 Kebutuhan minimum aplikasi (dari source code)

| Komponen | Kebutuhan actual | Sumber |
|---|---|---|
| Node.js | **22.x** (minimum 22.12.0) | `README.md`, CI Node 22, Vite 8, Prisma 7 |
| npm | 10+ (ikut Node.js 22) | — |
| MySQL/MariaDB | MySQL 8.0+ (diuji lokal pada MySQL 8.4.3) / MariaDB 10.x+, charset `utf8mb4`, collation `utf8mb4_unicode_ci` | `schema.prisma`, `migrations/*.sql` |
| Web server | Apache (cPanel) untuk frontend statis + `.htaccess` | `deploy-remote.sh` (docroot `public_html`) |
| Node app runner | Node.js Application Manager (Passenger) | §4.1 |
| Terminal/SSH | disarankan (untuk Prisma CLI, native build) | §4.1 |
| Cron Jobs | untuk backup harian | §14 |
| Outbound HTTPS | ke `*.supabase.co` (backup), SMTP, provider AI, `challenges.cloudflare.com` | `backend/scripts/backup.mjs`, `routes/ai.js`, `routes/turnstile.js` |
| Binary CLI | `mysqldump`, `mysql`, `tar` (untuk backup/restore) | `backend/scripts/backup.mjs`, `restore.mjs` |
| Storage persisten | `UPLOAD_ROOT` di luar `public_html` | §4.3, §12 |

### 3.2 Ceklis fitur cPanel yang WAJIB DIKONFIRMASI KE PROVIDER HOSTING

Jangan menganggap semua paket cPanel setara. Konfirmasi ke provider:

- [ ] **Node.js Application tersedia** (menu "Setup Node.js App" / Application Manager).
- [ ] **Versi Node.js 22.x** (atau minimal 22.12.0) dapat dipilih.
- [ ] **SSH Terminal** tersedia (sangat membantu untuk `npm ci`, `prisma`,
      `mysqldump`; tanpa SSH sebagian langkah harus dialihkan, lihat catatan).
- [ ] **MySQL tersedia**; database + user dapat dibuat sendiri via cPanel.
- [ ] **Kuota disk** cukup (frontend `dist/` + `node_modules` backend + `uploads/` + `backups/`).
- [ ] **Memory limit** Node app cukup (minimal 512 MB; lebih aman 1 GB).
- [ ] **Passenger / Application Manager** tersedia dan dapat di-restart.
- [ ] **Cron Jobs** tersedia.
- [ ] **SSL/TLS** (AutoSSL atau Let's Encrypt) tersedia untuk domain dan subdomain.
- [ ] **`.htaccess` + `mod_rewrite`** diizinkan di document root.
- [ ] **Environment variables** aplikasi Node dapat diatur dari panel (atau via `.env`).
- [ ] **Outbound HTTPS** diizinkan (untuk Supabase Storage, SMTP, provider AI, Turnstile).
- [ ] **`mysqldump`/`mysql`/`tar`** tersedia di `PATH` (untuk backup/restore); jika tidak, lihat §13.4.

### 3.3 WAJIB DIKONFIRMASI KE PROVIDER HOSTING

Seluruh daftar §3.2 bergantung pada paket hosting dan **belum diuji** (tidak ada akses
cPanel/provider pada penyusunan dokumen). Mintakan jawaban tertulis dari provider atas
poin-poin ini sebelum akhir pekan deployment:

| # | Pertanyaan ke provider | Mengapa penting |
|---|---|---|
| 1 | Apakah menu **Setup Node.js App** (Passenger/CloudLinux Node.js Selector) tersedia? | Tanpa ini backend Express tidak dapat dijalankan di cPanel. |
| 2 | Versi Node.js apa saja yang tersedia? Apakah **22.x** ada? | Aplikasi memakai Node 22 (Vite 8, Prisma 7). |
| 3 | Apakah ada **Terminal/SSH** atau fitur **Run NPM Install / Run JS script** di panel Node.js? | Diperlukan untuk `npm ci`, `prisma generate`, `prisma migrate`. Tanpa itu, SQL import + provider membantu. |
| 4 | Apakah **cron jobs** tersedia? | Untuk backup harian. |
| 5 | Apakah **`mysqldump`, `mysql`, `tar`** tersedia untuk user akun? | Backup/restore aplikasi memakai binary ini. |
| 6 | Apakah **outbound HTTPS** diizinkan (Supabase, SMTP, provider AI, Cloudflare)? | Backup & fitur AI/Turnstile/email. |
| 7 | Apakah **DDL (CREATE/ALTER/DROP/INDEX/FK)** diizinkan pada database akun? | Prisma migration butuh DDL. |
| 8 | Apakah `mod_proxy` / reverse proxy tersedia? | Hanya bila memilih Opsi B (satu domain). |
| 9 | Berapa **kuota disk** dan **memory limit** proses Node? | `node_modules` + `dist` + `uploads` + `backups`. |
| 10 | Apakah **AutoSSL/Let's Encrypt** mencakup subdomain API? | Cookie `secure` butuh HTTPS. |

Tulis jawaban provider di [`./CPANEL_DEPLOYMENT_CHECKLIST.md`](./CPANEL_DEPLOYMENT_CHECKLIST.md) bagian B.

---

## 4. Audit Kompatibilitas cPanel

### 4.1 Persyaratan Node.js

| Item | Nilai dari repository |
|---|---|
| Versi minimum | 22.12.0 (`README.md`); CI memakai Node 22 |
| `engines` di `package.json` | **tidak ada** (tidak ada penjaga versi) |
| `packageManager` (npm/pnpm) | **tidak ada** (pakai npm + `package-lock.json`) |
| Entry point backend | `backend/src/server.js` (`package.json` → `"main": "src/server.js"`, `"type": "module"`) |
| Startup command lokal | `npm start` → `node src/server.js` |
| Dev command | `npm run dev` → `nodemon src/server.js` |
| ESM/CJS | **ESM** (`"type": "module"`) — startup file harus mendukung `import` |

**cPanel Application Manager (Passenger):**

- WAJIB DIKONFIRMASI KE PROVIDER HOSTING: apakah panel memakai Phusion Passenger,
  dan apakah "Application startup file" boleh diisi path relatif seperti `src/server.js`
  (bukan hanya `app.js` di root).
- `backend/src/server.js` memanggil `app.listen(env.PORT)`. `env.PORT` dibaca Zod dari
  `process.env.PORT` (default `3000`). Untuk Passenger, aplikasi harus mendengarkan
  port yang disediakan panel melalui `PORT`. Karena Zod mensyaratkan `PORT` berupa
  bilangan bulat 1–65535, **verifikasi** bahwa panel menyediakan `PORT` numerik.
  Jika panel tidak menyediakan `PORT` numerik, set `PORT` eksplisit di environment
  aplikasi.
- Jika panel **mewajibkan** startup file bernama `app.js` di root aplikasi, buat file
  shim saat deployment (jangan ubah kode aplikasi), contoh isi:

  ```js
  // backend/app.js  — shim startup untuk Passenger/cPanel (dibuat saat deployment)
  import './src/server.js';
  ```

  Lalu set Application startup file = `app.js`. **Verifikasi** perilaku Passenger.

- Startup command alternatif (bila panel memakai bentuk command): `node src/server.js`.

**Dependensi native (risiko tinggi di shared hosting):**

Backend memakai `argon2` dan `bcrypt`, keduanya modul native (prebuilt binary /
kompilasi). `npm ci` di server **mungkin gagal** jika:

- versi Node panel tidak punya prebuilt binary yang cocok, atau
- tidak ada toolchain build (`gcc`, `make`, `python`), atau
- tidak ada outbound ke host prebuilt binary.

WAJIB DIKONFIRMASI KE PROVIDER HOSTING: toolchain build tersedia dan outbound HTTPS
aman. Lihat juga [`./CPANEL_TROUBLESHOOTING.md`](./CPANEL_TROUBLESHOOTING.md) (kasus "Cannot find module"/"gyp").

### 4.2 Persyaratan MySQL

| Aspek | Nilai dari repository |
|---|---|
| Provider Prisma | `mysql` (`schema.prisma` → `datasource db { provider = "mysql" }`) |
| URL sumber | `prisma.config.ts` → `datasource.url = env("DATABASE_URL")` |
| Driver | `@prisma/adapter-mariadb` + paket `mariadb` (bukan engine Rust) |
| Charset | `utf8mb4` |
| Collation | `utf8mb4_unicode_ci` (semua tabel) |
| Nama database lokal proyek | `smk_telkom_purwokerto` (contoh, `backend/.env.example`) |

**Prefix nama database di cPanel.** cPanel menamai database dan user dengan prefix
akun, contoh:

```
akun              = smktelkom
database cPanel   = smktelkom_smk
user DB cPanel    = smktelkom_app
host              = 127.0.0.1 (localhost)
```

`DATABASE_URL` **harus** memakai nama yang diberikan cPanel, bukan nama lokal:

```env
DATABASE_URL=mysql://smktelkom_app:PASSWORD_KUAT@127.0.0.1:3306/smktelkom_smk
```

Catatan:

- User cPanel biasanya otomatis diberi prefix yang sama.
- Privilege yang dibutuhkan aplikasi: `SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER,
  INDEX, DROP, REFERENCES, LOCK TABLES, TRIGGER` pada database aplikasi
  (dibutuhkan Prisma migrate + operasi normal). Jangan pakai `root`/akun penuh.
- Untuk backup, idealnya user terpisah dengan `SELECT, LOCK TABLES, PROCESS, RELOAD,
  EVENT, TRIGGER, SHOW VIEW` (lihat `docs/VPS_DEPLOYMENT_READINESS.md` §5).
- Remote MySQL access **tidak diperlukan** jika backend berjalan di host yang sama.
- WAJIB DIKONFIRMASI KE PROVIDER HOSTING: engine MySQL/MariaDB memenuhi `utf8mb4`
  dan mendukung FK + JSON (untuk `nilai_rapor` `JSON`, `biodata`/`nilai` `JSON`).

### 4.3 Persyaratan Storage

Dari `backend/src/utils/storage.js`, `backend/src/app.js`, `backend/src/routes/uploads.js`:

| Bucket | Lokasi fisik | Cara disajikan | Publik? |
|---|---|---|---|
| `content-images` | `<UPLOAD_ROOT>/content-images/...` | Apache **tidak**; disajikan Express `express.static` di `GET /uploads/content-images/*` (`app.js:84`) | Ya (gambar konten) |
| `ppdb-documents` | `<UPLOAD_ROOT>/ppdb-documents/submissions/<userId>/document.pdf` | Hanya `GET /api/uploads/ppdb-documents/:userId` (berautentikasi) | **Tidak** |

Kebutuhan:

- `UPLOAD_ROOT` **wajib** di lokasi persisten dan **di luar** `frontend/dist` dan
  **di luar** `public_html`. Ini mencegah file upload hilang saat redeploy frontend
  dan mencegah dokumen privat PPDB terekspos publik.
- Contoh absolut: `/home/smktelkom/uploads` (atau `/home/smktelkom/smk-data/uploads`).
- `MEDIA_BASE_URL` **wajib** diisi URL publik backend, jika tidak media URL memakai
  `http://localhost:PORT` (lihat `storage.js:7`) dan gambar akan rusak di browser.
- Dokumen PPDB privat **tidak boleh** disajikan statis. Hanya lewat API berautentikasi
  (owner atau admin). Jangan menaruh folder `ppdb-documents` di `public_html`.
- Permission direktori: **755** untuk direktori, **644** untuk file, owner = user akun
  cPanel (server menulis file dengan `mode 0o640`, lihat `storage.js:36`).
- WAJIB DIKONFIRMASI KE PROVIDER HOSTING: `UPLOAD_ROOT` persisten antar-deployment,
  dan backup/restore dapat membaca/menulisnya.

---

## 5. Persiapan Domain

Gunakan placeholder domain sekolah, contoh `smkcontoh.sch.id`.

**Rekomendasi (Opsi A — subdomain API):**

```
www.smkcontoh.sch.id   -> Frontend React (static, public_html)
api.smkcontoh.sch.id   -> Backend Express (Node.js App)
```

Langkah:

1. WAJIB DIKONFIRMASI KE PROVIDER HOSTING: subdomain dapat dibuat di cPanel.
2. Buat subdomain `api.smkcontoh.sch.id` di cPanel → **Subdomains**.
3. Arahkan DNS (cPanel → **Zone Editor**) `api` sebagai `A` ke IP hosting, atau
   `CNAME` ke domain utama bila DNS dikelola provider.
4. Konfirmasi domain sekolah sudah menunjuk ke hosting ini. **Jangan menganggap
   domain sudah diarahkan** — verifikasi dulu.
5. Untuk alternatif satu domain (Opsi B), lihat §9.

---

## 6. Persiapan MySQL

### 6.1 Membuat database & user (cPanel → "MySQL Databases")

1. cPanel → **MySQL® Databases** → *Create New Database*: `smk` → menjadi
   `smktelkom_smk`.
2. *Add New User*: `app` + password kuat → menjadi `smktelkom_app`.
3. *Add User To Database*: hubungkan `smktelkom_app` ke `smktelkom_smk`.
4. Beri privilege: **ALL PRIVILEGES** (setara daftar pada §4.2). WAJIB DIKONFIRMASI
   KE PROVIDER HOSTING apakah `ALL PRIVILEGES` diizinkan; jika tidak, berikan daftar
   privilege minimum pada §4.2.
5. Charset: saat impor/migrasi pastikan `utf8mb4`/`utf8mb4_unicode_ci`. Bila cPanel
   membuat database dengan collation berbeda, format tabel tetap didefinisikan
   `utf8mb4_unicode_ci` oleh migration SQL.

### 6.2 Connection string

```env
DATABASE_URL=mysql://smktelkom_app:PASSWORD_KUAT@127.0.0.1:3306/smktelkom_smk
```

- Host: gunakan `127.0.0.1` (localhost) karena backend berjalan di host yang sama.
- Password: URL-encode karakter spesial (`@`, `:`, `/`, `#`) bila ada.
- Variabel ini **secret**; jangan pernah ditaruh di frontend atau di-commit.

### 6.3 Struktur database (15 tabel aplikasi + 1 tabel Prisma)

`backend/prisma/schema.prisma` mendefinisikan **15 model/tabel aplikasi**:

`admins`, `users`, `auth_tokens`, `sessions`, `berita`, `pengumuman`, `prestasi`,
`bkk`, `ppdb`, `ppdb_drafts`, `events`, `spmb_information`, `site_settings`,
`ai_daily_attempts`, `site_visitors`.

Prisma membuat satu tabel internal tambahan, **`_prisma_migrations`**. Jadi jumlah
akhirnya **16 tabel** setelah migration history dicatat. File SQL yang **dikirim
developer secara terpisah** (bukan dari GitHub) membuat 15 tabel aplikasi; Prisma
membuat tabel ke-16 secara resmi saat baseline. Detail isi file SQL:
[`./sql/README.md`](./sql/README.md).

### 6.4 Pilih satu strategi inisialisasi database

> **Jangan memakai dua strategi ini sekaligus.** Menjalankan `prisma migrate deploy`
> setelah SQL schema diimpor tanpa baseline akan gagal karena tabel sudah ada.

| Strategi | Kapan dipilih | Kebutuhan | Rekomendasi |
|---|---|---|---|
| **A. Prisma migration** | SSH/Terminal atau aksi command Node tersedia | Prisma CLI 7.10.1 + privilege DDL | **Utama dan paling aman.** Database kosong, lalu `npm run db:migrate`. |
| **B. SQL phpMyAdmin + Prisma baseline** | Tidak ada Terminal saat menyiapkan tabel melalui GUI | phpMyAdmin untuk import, lalu developer/provider menjalankan 4 kali `prisma migrate resolve --applied` | Alternatif terkontrol. Tidak ada record migration manual. |

Panduan GUI, SQL, dan baseline lengkap: [`./sql/README.md`](./sql/README.md).

---

## 7. Deployment Frontend (React + Vite, statis)

Frontend adalah **build statis**. Build dilakukan di mesin dengan Node 22 +
devDependencies (lokal/CI), lalu hasilnya diunggah ke cPanel.

### Serah terima build — WAJIB dibaca sebelum menyerahkan file

- **Build dilakukan dari folder `frontend/`**, bukan dari root repository:
  ```bash
  cd frontend
  npm ci
  npm run build
  ```
- **Perintah produksi adalah `npm run build`.** Jangan memakai `npm run build:ci`
  (lihat §7.4 — outputnya sengaja tidak terindeks dan berisi feed kosong).
- **Output berada di `frontend/dist/`.**
- Output **dapat dikompres menjadi ZIP** untuk diserahkan/diunggah.
- **Isi ZIP yang diunggah adalah isi folder `dist`** (`index.html`, `app.html`,
  `assets/`, dst.), **bukan folder source `frontend/`** dan **bukan folder `dist`
  sebagai subfolder**. Jadi di dalam ZIP, `index.html` berada di level paling atas.
- **`VITE_API_BASE_URL` dan `VITE_SITE_URL` harus disesuaikan sebelum build**, karena
  Vite menanam nilainya saat build (§7.3).
- **Jangan mengunggah `.env`.** File itu hanya untuk mesin build dan tidak boleh ikut
  ke server.
- **File build dibagikan terpisah** (mis. lewat WhatsApp/file transfer) dan
  **tidak di-commit ke Git** (`dist/` sudah diabaikan).

### 7.1 Prasyarat build

- Node.js 22.x + npm.
- `frontend/node_modules` terpasang lengkap (devDependencies wajib: `vite`, `sharp`,
  `parse5`, `react-dom/server`, dll. dipakai oleh `prerender-seo.mjs`).
- **Backend harus dapat dijangkau** pada saat build (mode `strict`) karena
  `prerender-seo.mjs` **mengambil data publik** (berita, pengumuman, prestasi, BKK,
  SPMB, events) dari API agar halaman ter-prerender. Jika backend tidak terjangkau,
  build **gagal** kecuali memakai `PRERENDER_MODE=resilient` (§7.6).

### 7.2 Instalasi dependency

```bash
cd frontend
npm ci
```

### 7.3 Environment variables (build-time)

`Vite` menanamkan env **saat build**, bukan saat runtime. Set sebelum `npm run build`.

```env
VITE_API_BASE_URL=https://api.smkcontoh.sch.id
VITE_SITE_URL=https://www.smkcontoh.sch.id
VITE_TURNSTILE_SITE_KEY=
VITE_TURNSTILE_ENABLED=false
```

Aturan dari `frontend/scripts/validate-deployment-env.mjs` (berjalan pada `npm run build`):

- Untuk build produksi, `VITE_API_BASE_URL` **wajib** dan **tidak boleh** localhost.
- `VITE_SITE_URL` (bila diisi) harus URL http(s) absolut.

Keduanya **harus sudah disesuaikan sebelum menjalankan `npm run build`** — setelah build,
nilainya tertanam dan tidak dapat diubah tanpa build ulang. **Jangan mengunggah file
`.env`** ke server; `.env` hanya dipakai di mesin build dan sudah diabaikan Git
(root `.gitignore` dan `frontend/.gitignore`).

### 7.4 Perbedaan perintah build

| Perintah | Isi (`frontend/package.json`) | Kegunaan |
|---|---|---|
| `npm run build` | `validate-deployment-env.mjs && vite build && prerender-seo.mjs` | **Build produksi sebenarnya.** Prerender SEO **strict** (abort bila data publik tak terjangkau). |
| `npm run build:ci` | `vite build && prerender-seo.mjs --offline` | **Hanya untuk CI/tes.** `--offline` dibatasi: gagal bila `CI !== 'true'` atau dijalankan di Vercel (`prerender-seo.mjs:13`), output diberi `robots.txt` *Disallow: /*. **Jangan deploy** hasil `build:ci`. |
| `npm run preview` | `vite preview` | Menyajikan hasil `dist/` lokal untuk uji, bukan untuk produksi. |

**Jangan menyarankan `build:ci` untuk produksi cPanel** — hasilnya sengaja tidak
terindeks mesin pencari dan berisi feed kosong.

### 7.5 Output `dist/`

`prerender-seo.mjs` menghasilkan:

- `dist/index.html` — shell untuk `/` (sudah diprerender).
- `dist/<route>/index.html` — halaman publik yang sudah diprerender (mis. `/berita/index.html`,
  `/berita/<slug>/index.html`, `/jurusan/<slug>/index.html`, dll.).
- `dist/app.html` — **shell SPA cadangan** untuk URL yang tidak diprerender dan
  halaman akun/admin (lihat `frontend/vercel.json` yang me-rewrite `/(.*)` → `/app.html`).
- `dist/assets/*`, `dist/sitemap.xml`, `dist/robots.txt`, `dist/seo-routes.json`, `dist/og-school.jpg`.

### 7.6 Mode prerender: strict vs resilient (dan konsekuensinya)

Mode diatur lewat `PRERENDER_MODE` (`frontend/scripts/prerender-seo.mjs`).

**`strict` (default) — untuk build produksi di mesin yang backend-nya terjangkau.**

- Bila data publik (berita, pengumuman, prestasi, BKK, SPMB, events) **tidak** dapat
  diambil saat build, proses **abort** dan build **gagal**.
- Konsekuensi baik: tidak akan pernah ter-deploy halaman yang hanya berisi data kosong
  atau "loading-only"; feed SEO terisi lengkap.
- Konsekuensi buruk: build **wajib** dilakukan ketika API backend dapat dijangkau.
  Jika tidak, build tidak menghasilkan output sama sekali.

**`resilient` — untuk build di lingkungan yang backend-nya mungkin tak terjangkau
(mis. sandbox CI/Vercel).** Aktifkan dengan `PRERENDER_MODE=resilient npm run build`.

- Bila sumber data publik tak terjangkau, build tetap **selesai**, tetapi: rute dinamis
  di-prerender **tanpa entri detail**, halaman ditandai **`noindex`**, dan browser
  mengambil data saat runtime.
- Konsekuensi baik: SPA tetap berfungsi walau backend mati saat build.
- Konsekuensi buruk: halaman yang di-prerender **tidak terindeks mesin pencari** dan
  HTML awal kosong; SEO halaman dinamis hilang sampai build ulang dalam mode `strict`.
- Mode ini **tidak pernah mengarang data**: sumber yang tak terjangkau menghasilkan
  daftar kosong, bukan data palsu.

Ringkas: **pakai `strict` bila memungkinkan** (build di lokal/CI dengan backend dapat
dijangkau). Pakai `resilient` **secara sadar** hanya bila `strict` memang tidak mungkin,
dan lakukan build ulang `strict` setelah backend tersedia. Di cPanel, cara paling aman:
**build di lokal/CI dengan backend terjangkau**, lalu unggah `dist/`.

### 7.7 Serah terima & unggah ke document root

**Mengemas ZIP (developer):** masuk ke dalam `frontend/dist/`, lalu kompres **isi**
folder itu (bukan folder `frontend/`, bukan folder `dist/` sebagai subfolder). Hasil
ZIP harus langsung berisi `index.html`, `app.html`, `assets/`, `sitemap.xml`, dst. di
level paling atas. Jangan sertakan `.env`, `node_modules`, atau folder source.

**Mengunggah (administrator hosting):**

Opsi 1 — File Manager cPanel: unggah ZIP tadi → **Extract** ke document root
domain/subdomain frontend (mis. `public_html` atau `public_html/flexbox`). Pastikan
`index.html` berada tepat di document root, bukan di dalam subfolder tambahan.

Opsi 2 — SSH/rsync (bila ada): skrip `deploy-remote.sh` di root repo adalah contoh
nyata (docroot `/home/smktelkom/public_html/flexbox`), **jangan** menyalin `.htaccess`
dari `dist` agar tidak menimpa konfigurasi rewrite manual:

```bash
rsync -a --delete --exclude='.htaccess' frontend/dist/ /home/smktelkom/public_html/flexbox/
```

Pastikan file `.htaccess` (SPA fallback §7.8) tetap ada.

### 7.8 Konfigurasi React Router SPA fallback (`.htaccess`)

Karena shell SPA adalah `app.html` (mengikuti rewrite `frontend/vercel.json`),
aturan `try_files`-nya adalah: **sajikan file/direktori yang ada; jika tidak ada,
lompat ke `app.html`.**

Contoh `.htaccess` di document root frontend (`public_html/...`):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1) Jangan pernah menangkap request backend (bila memakai reverse proxy Opsi B).
  #    Untuk Opsi A (subdomain api.*), request /api/ tidak pernah sampai ke sini.
  RewriteRule ^api/ - [L]
  RewriteRule ^uploads/ - [L]
  RewriteRule ^health$ - [L]

  # 2) Jika file atau direktori ada (mis. aset statis, /berita/index.html hasil prerender),
  #    sajikan apa adanya.
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3) Fallback SPA untuk URL yang tidak punya file statis (deep link, halaman admin).
  RewriteRule ^ /app.html [L]
</IfModule>

# Cache aset ber-hash (meniru frontend/vercel.json)
<IfModule mod_headers.c>
  <FilesMatch "^.*\.(js|css|woff2?|svg|ico|webp|avif|png|jpe?g)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "^(index\.html|app\.html)$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>
```

Aturan ini:

- Mengarahkan route frontend ke `app.html` (fallback), tetapi **tidak** menimpa aset
  statis/`<route>/index.html` hasil prerender.
- **Tidak** menangkap `/api`, `/uploads`, `/health` (dipakai backend).
- **Tidak** membuat loop (karena file ada selalu dilayani lebih dulu; `app.html`
  nyata ada sehingga aturan ke-2 menghentikan rewrite).

WAJIB DIKONFIRMASI KE PROVIDER HOSTING: `AllowOverride` mengizinkan `RewriteEngine`.

### 7.9 HTTPS & caching

- Aktifkan SSL untuk frontend (§16).
- Cache aset ber-hash sesuai contoh `.htaccess` §7.8 (konsisten dengan `frontend/vercel.json`).

### 7.10 Pengujian frontend

Setelah unggah:

- Buka `https://www.smkcontoh.sch.id/` → homepage ter-render.
- Buka `https://www.smkcontoh.sch.id/berita` lalu refresh (F5) → harus tetap memuat
  (bukan 404) → membuktikan SPA fallback bekerja.
- Buka detail `/berita/<slug>`, `/jurusan/<slug>` → refresh tetap bekerja.
- Periksa Console browser: tidak ada error "Failed to fetch" (bila ada, lihat §9 & troubleshooting).

---

## 8. Deployment Backend (Express via Node.js Application Manager)

### 8.1 Membuat folder backend

Di luar `public_html`. Contoh pola nyata dari `deploy-remote.sh`:
`/home/smktelkom/projects/smk-telkom-purwokerto`.

```
/home/smktelkom/
├── public_html/            # document root frontend (jangan taruh backend di sini)
├── projects/smk-telkom-purwokerto/backend/   # source backend
├── uploads/               # UPLOAD_ROOT (persisten, di luar public_html)
└── backups/               # BACKUP_DIR (persisten)
```

### 8.2 Unggah source code backend

- WAJIB DIKONFIRMASI KE PROVIDER HOSTING: tersedia Terminal/SSH. Jika ya, gunakan
  `git clone` pada commit/tag tertentu. Jika tidak, unggah arsip backend (tanpa
  `node_modules/`, `.env`, `uploads/`, `backups/`, `tests/`) via File Manager lalu ekstrak.

### 8.3 Pemisahan folder upload dan backup dari source

Set `UPLOAD_ROOT` dan `BACKUP_DIR` ke **luar** folder source (mis. `/home/smktelkom/uploads`,
`/home/smktelkom/backups`) agar tidak hilang saat redeploy §8.2.

### 8.4 Node.js Application Manager (cPanel)

1. cPanel → **Setup Node.js App** → *Create Application*.
2. **Node.js version**: pilih **22.x** (WAJIB DIKONFIRMASI KE PROVIDER HOSTING).
3. **Application root**: `/home/smktelkom/projects/smk-telkom-purwokerto/backend`.
4. **Application URL**: `api.smkcontoh.sch.id`.
5. **Application startup file**: `src/server.js` (atau `app.js` bila panel mewajibkan
   shim — lihat §4.1). WAJIB DIKONFIRMASI KE PROVIDER HOSTING.
6. **Environment variables**: isi seluruh variabel backend (§10) — jangan hanya `.env`
   file, karena sebagian panel tidak membaca `.env` otomatis. (Keduanya boleh dipakai.)
7. Simpan → panel menjalankan `npm install`. Bila gagal karena native module, lihat
   troubleshooting.

### 8.5 Instalasi dependency

Dari shell (bila ada) di `backend/`:

```bash
npm ci
```

Catatan penting Prisma:

- `prisma` CLI adalah **devDependency** (`prisma@7.10.1`). `npm ci --omit=dev`
  akan menghapus CLI → **tidak bisa** `prisma generate` / `prisma migrate deploy`.
- **Strategi yang disarankan**: jalankan `npm ci` (lengkap), lakukan
  `npm run prisma:generate` (§8.7) **sebelum** memangkas devDependencies. Jika kuota
  disk ketat dan ingin `--omit=dev`, generate client terlebih dahulu, simpan
  `node_modules/.prisma` dan `node_modules/@prisma/client`, baru pangkas.

### 8.6 Environment variables

Lihat tabel lengkap §10. Minimal agar aplikasi boot: `NODE_ENV=production`, `PORT`,
`DATABASE_URL`, `SESSION_SECRET` (>=32 karakter), `FRONTEND_URL`. Tanpa salah satu
variabel wajib, `backend/src/config/env.js` (Zod) akan **gagal saat start**.

### 8.7 Prisma generation

```bash
npm run prisma:generate     # = prisma generate
```

Prisma 7 memakai **driver adapter** (`@prisma/adapter-mariadb`), sehingga tidak
memerlukan engine Rust untuk runtime query. `prisma generate` tetap memerlukan CLI
dan berpotensi mengunduh artefak saat instalasi (`@prisma/engines`) — WAJIB DIKONFIRMASI
KE PROVIDER HOSTING: outbound HTTPS saat `npm ci`.

### 8.8 Prisma migration

**Pertama kali** (schema belum ada) jalankan **deploy** (bukan `dev`):

```bash
npm run db:migrate       # = prisma migrate deploy
npm run db:status        # = prisma migrate status
```

Detail di §11. **Jangan** `prisma migrate dev` di production.

### 8.9 Seed awal

```bash
npm run db:seed
```

`scripts/seed.mjs` membuat baris `site_settings` bila belum ada, dan (bila
`ADMIN_RECOVERY_*` diisi) membuat admin pemulihan dengan password ter-hash argon2.
Hapus `ADMIN_RECOVERY_*` dari environment setelah bootstrap (lihat §15).

### 8.10 Restart aplikasi

cPanel → **Setup Node.js App** → **Restart**. Verifikasi lewat log aplikasi panel.

### 8.11 Inspeksi log

- Panel Node.js App biasanya menampilkan `stderr.log`/`app.log` aplikasi. Baca di sana.
- Bila ada SSH: log Passenger ada di `~/logs` atau `stderr.log` sesuai panel.

### 8.12 Health check

```bash
curl -s https://api.smkcontoh.sch.id/health
```

Harus mengembalikan (dari `backend/src/app.js:53`):

```json
{ "ok": true, "service": "smk-backend", "uptime": 12, "database": "up" }
```

`database: "down"` + HTTP 503 → masalah koneksi MySQL.

### 8.13 Kondisi tanpa Terminal/SSH

Guru pembimbing **belum memiliki akses Terminal**. Dokumentasi ini jujur soal batas
tersebut: sebagian pekerjaan dapat diselesaikan lewat GUI cPanel, sebagian lagi **tidak
mungkin** tanpa Terminal, **Run JS Script / Run NPM Install** pada Node.js Application
Manager, atau **bantuan provider hosting**.

- **SQL import dapat dilakukan lewat phpMyAdmin (GUI).** Tidak perlu Terminal.
- **Upload frontend dapat dilakukan lewat File Manager (GUI).** Tidak perlu Terminal.
- **Environment variable dapat diisi lewat Node.js Application Manager** bila panel
  menyediakannya.
- **phpMyAdmin TIDAK dapat menjalankan npm atau Prisma.** Tidak ada tombol npm/Prisma
  di phpMyAdmin.

| Proses | Bisa via GUI? | Kebutuhan lain |
|---|---|---|
| SQL import schema | Ya | phpMyAdmin; pilih Strategi B di [`sql/README.md`](./sql/README.md). |
| Upload frontend | Ya | File Manager; build dilakukan developer lebih dahulu. |
| Upload backend | Ya | File Manager; unggah ZIP tanpa `.env`, `node_modules`, `uploads`, `backups`. |
| Setup environment | Sebagian | Isi UI Node App bila tersedia; jika hanya `.env`, File Manager + permission aman. |
| `npm ci` | Tergantung panel | SSH/Terminal, atau tombol **Run NPM Install** yang dikonfirmasi provider. |
| `prisma generate` | Tidak dengan phpMyAdmin | SSH/Terminal atau provider/developer menjalankan perintah pada Application Root. |
| `prisma migrate deploy` | Tidak dengan phpMyAdmin | SSH/Terminal atau provider/developer. Untuk Strategi B gunakan baseline resmi. |
| Seed admin (`npm run db:seed`) | Tidak | SSH/Terminal atau provider/developer; variabel recovery hanya sementara. |
| Backup aplikasi terenkripsi | Tidak sepenuhnya | Cron + Node + binary `mysqldump`/`tar` + outbound HTTPS harus disediakan provider. |
| Restore aplikasi | Tidak sepenuhnya | SSH/Terminal dan database testing; jangan restore production via coba-coba. |
| Cron job | Ya, jika menu Cron Jobs tersedia | Path Node dan environment cron harus diberikan/dikonfirmasi provider. |
| Restart aplikasi | Ya | Tombol Restart pada Setup Node.js App, jika provider menyediakannya. |

**Jika Terminal tidak tersedia:** selesaikan database melalui phpMyAdmin dan upload
melalui File Manager. Lalu kirim provider/developer daftar perintah dari §11.3 atau
§11.5, Application Root, dan nama database. Jangan mengunggah `node_modules` dari
Windows/macOS sebagai workaround untuk server Linux; modul native `argon2`/`bcrypt`
bisa tidak kompatibel.

---

## 9. Konfigurasi API (Frontend ↔ Backend)

Repository memisahkan frontend dan backend. Dua opsi arsitektur:

### Opsi A — Subdomain API (DIREKOMENDASIKAN untuk cPanel)

```
www.smkcontoh.sch.id  -> Frontend React (static)
api.smkcontoh.sch.id  -> Backend Express (Node App)
```

Konfigurasi:

- Frontend build: `VITE_API_BASE_URL=https://api.smkcontoh.sch.id`.
- Backend: `FRONTEND_URL=https://www.smkcontoh.sch.id`.
- CORS: `backend/src/app.js:38` → `cors({ origin: env.FRONTEND_URL, credentials: true })`
  (**satu origin**, tanpa wildcard). Semua request membawa `credentials: 'include'`
  (`apiClient.js:49`).
- Origin guard tambahan (`app.js:43-50`): mutasi dari origin selain `FRONTEND_URL`
  (atau host request) ditolak `403 origin_rejected`.
- Cookie `session_token`: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` di
  production (`routes/auth.js:15`).
- Cookie `csrf_token`: `httpOnly: false`, `sameSite: 'lax'`, `secure: true` di
  production (`middleware/csrf.js:6`).
- CSRF: double-submit cookie. Frontend mengambil `/api/auth/csrf`, mengirim header
  `x-csrf-token` pada setiap mutasi (`apiClient.js:61`). Middleware menolak bila
  cookie/header tak cocok (`middleware/csrf.js:14`).
- Karena `secure: true`, **HTTPS wajib** agar cookie tersimpan. `sameSite: 'lax'`
  cocok untuk subdomain terpisah dengan CORS `credentials` (bukan `SameSite=None`).
- Preflight `OPTIONS`: `cors` menangani; origin guard mengizinkan `OPTIONS`
  (`app.js:44`).

Keunggulan Opsi A: **tidak** memerlukan reverse proxy cPanel; CORS/cookie jelas;
`.htaccess` frontend sederhana; sesuai pola `deploy-remote.sh` (docroot terpisah).

### Opsi B — Satu domain dengan reverse proxy

```
smkcontoh.sch.id/       -> Frontend
smkcontoh.sch.id/api/   -> Backend
```

- HANYA dapat dipakai bila hosting mendukung **reverse proxy** (`mod_proxy` +
  `mod_proxy_http`, atau ProxyPass) atau routing aplikasi Node yang sesuai.
- **`.htaccess` biasa BUKAN reverse proxy.** Jangan mengandalkan `RewriteRule`
  untuk mem-proxy `/api` ke proses Node kecuali provider menyediakan `mod_proxy`.
- Bila memakai opsi ini, `VITE_API_BASE_URL=https://smkcontoh.sch.id` dan
  `FRONTEND_URL=https://smkcontoh.sch.id` (same-origin), sehingga cookie lebih
  sederhana. Namun tetap butuh `mod_proxy`.

WAJIB DIKONFIRMASI KE PROVIDER HOSTING: ketersediaan `mod_proxy` di Apache cPanel.

### Perbandingan

| Aspek | Opsi A (subdomain) | Opsi B (satu domain) |
|---|---|---|
| Reverse proxy | Tidak perlu | Wajib ada |
| CORS | Perlu (`FRONTEND_URL`) | Sama-origin (lebih mudah) |
| Cookie | `sameSite: lax` + `secure` lintas subdomain | same-origin |
| `.htaccess` frontend | Sederhana | Harus mengecualikan `/api`, `/uploads` |
| Risiko | Rendah | Bergantung fitur provider |

**Rekomendasi:** Opsi A, kecuali provider mengonfirmasi `mod_proxy` tersedia.

---

## 10. Environment Variables

Tidak ada nilai secret nyata di dokumen ini. Gunakan placeholder.

### A. Frontend build-time (publik, aman terekspos)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `VITE_API_BASE_URL` | Base URL backend. Dipakai `apiClient.js`; divalidasi wajib saat build produksi | **Wajib** (produksi) | Tidak |
| `VITE_SITE_URL` | URL kanonik situs untuk SEO | Opsional | Tidak |
| `VITE_TURNSTILE_SITE_KEY` | Site key Cloudflare Turnstile di login admin | Opsional | Tidak |
| `VITE_TURNSTILE_ENABLED` | Toggle UI Turnstile | Opsional | Tidak |
| `PRERENDER_MODE` | `strict` (default) / `resilient` saat build | Opsional | Tidak |

> `VITE_*` adalah variabel **publik** (tertanam di bundel). **Jangan** menaruh secret di sini.

### B. Backend runtime — wajib (divalidasi Zod `backend/src/config/env.js`)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `NODE_ENV` | `development`/`test`/`production` (default development). Set `production` | Wajib (prod) | Tidak |
| `PORT` | Port listen (default 3000) | Wajib (diberi panel) | Tidak |
| `DATABASE_URL` | Koneksi MySQL (`mysql://user:pass@host:port/db`) | **Wajib** | **Ya** |
| `SESSION_SECRET` | Kunci sesi, **minimal 32 karakter** | **Wajib** | **Ya** |
| `FRONTEND_URL` | Origin CORS + guard origin | **Wajib** | Tidak |

### C. Backend runtime — opsional (dibaca langsung `process.env`)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `UPLOAD_ROOT` | Root penyimpanan upload (absolut di produksi) | Opsional | Tidak |
| `MEDIA_BASE_URL` | URL publik backend untuk menyusun URL media | Opsional (disarankan) | Tidak |
| `PUBLIC_STORAGE_URL` | URL object storage alternatif | Opsional | Tidak |
| `DB_CONNECTION_LIMIT` | Batas koneksi pool MariaDB (default 10) | Opsional | Tidak |
| `SPMB_INTERNAL_ENABLED` | Sakelar portal SPMB internal (default `false`) | Opsional | Tidak |

### D. Email (opsional)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `SMTP_HOST` | Host SMTP | Opsional | Tidak |
| `SMTP_PORT` | Port SMTP (default 587) | Opsional | Tidak |
| `SMTP_USER` | User SMTP | Opsional | **Ya** |
| `SMTP_PASS` | Password SMTP | Opsional | **Ya** |
| `MAIL_FROM` | Alamat pengirim | Opsional | Tidak |
| `PUBLIC_URL` | Base URL frontend untuk tautan verifikasi/reset | Opsional | Tidak |

> Bila SMTP kosong, token tetap dibuat di DB dan (hanya di development) tautan
> dicetak ke log (`services/emailService.js`). Di production tanpa SMTP, email
> tidak terkirim.

### E. AI / STELA / NEXTTEL (opsional)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `STELA_AKTIF` | Sakelar STELA (`false` = nonaktif) | Opsional | Tidak |
| `STELA_API_KEY` | API key provider STELA | Opsional | **Ya** |
| `GEMINI_API_KEY` | Key Gemini fallback | Opsional | **Ya** |
| `STELA_PROVIDER_URL` | Endpoint OpenAI-compatible | Opsional | Tidak |
| `STELA_MODEL` / `NINEROUTER_MODEL` | Model | Opsional | Tidak |
| `NINEROUTER_KEY` / `NINEROUTER_URL` | 9Router | Opsional | Key = **Ya** |
| `STELA_MAKS_PER_HARI` | Kuota harian STELA (default 200) | Opsional | Tidak |
| `NEXTTEL_MAKS_PER_HARI` | Kuota harian NextTel (default 100) | Opsional | Tidak |
| `STELA_MAKS_PER_IP` | Rate limit per IP STELA (default 5/menit) | Opsional | Tidak |
| `NEXTTEL_MAKS_PER_IP` | Rate limit per IP NextTel (default 10/menit) | Opsional | Tidak |

> **AI key tidak boleh** menjadi `VITE_*`. Hanya di backend.

### F. Turnstile (opsional)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `CF_TURNSTILE_SECRET` | Secret server verifikasi `/api/turnstile/verify` | Opsional | **Ya** |
| `TURNSTILE_ALLOWED_ORIGINS` | Daftar origin, dipisah koma | Opsional | Tidak |

> Bila `CF_TURNSTILE_SECRET` kosong, endpoint mengembalikan sukses (bypass development).

### G. Backup / restore

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `BACKUP_DIR` | Direktori backup lokal | Opsional | Tidak |
| `BACKUP_ENCRYPTION_KEY` | Kunci AES-256 (base64 32 byte) | Wajib untuk backup | **Ya** |
| `BACKUP_RETENTION_DAYS` | Retensi hari (default 30) | Opsional | Tidak |
| `BACKUP_SCHEDULE` | Jadwal cron (dipakai dokumentasi) | Opsional | Tidak |
| `MYSQLDUMP_PATH` | Path absolut `mysqldump` | Opsional | Tidak |
| `MYSQL_PATH` | Path absolut `mysql` | Opsional | Tidak |
| `SUPABASE_URL` | URL project Supabase (tujuan backup) | Opsional | Tidak |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Wajib untuk upload backup | **Ya** |
| `SUPABASE_BACKUP_BUCKET` | Nama bucket privat (default `mysql-backups`) | Opsional | Tidak |
| `SUPABASE_ANON_KEY` | Anon key (dipakai STELA ctx di legacy) | Opsional | Tidak |
| `SOURCE_DATABASE_URL` | Postgres lama untuk ETL satu kali | Opsional (ETL) | **Ya** |

> `SUPABASE_SERVICE_ROLE_KEY` **hanya** di backend. `BACKUP_ENCRYPTION_KEY` disimpan
> aman; kehilangannya = backup tidak dapat dipulihkan.

### H. Account recovery (sementara, opsional)

| Variable | Fungsi | Wajib/Opsional | Secret |
|---|---|---|---|
| `ADMIN_RECOVERY_EMAIL` | Email admin bootstrap | Opsional | Tidak |
| `ADMIN_RECOVERY_PASSWORD` | Password admin bootstrap (12–200 karakter) | Opsional | **Ya** |
| `ADMIN_RECOVERY_NAME` | Nama admin | Opsional | Tidak |
| `ADMIN_RECOVERY_ALLOW_EXISTING` | Izinkan memulihkan user existing (`true`/`false`) | Opsional | Tidak |

### Aturan keamanan variabel

- `VITE_*` = publik; **tidak boleh** berisi secret.
- `DATABASE_URL`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_ENCRYPTION_KEY`,
  SMTP/AI/Turnstile secret = **hanya backend**.
- `SESSION_SECRET` tidak boleh kosong dan minimal 32 karakter (Zod menolak).
- `.env` **tidak** boleh di-commit (sudah di `.gitignore` root dan `frontend/.gitignore`).

---

## 11. Prisma Migrations

### 11.1 Konfigurasi Prisma 7 aktual

- `backend/prisma.config.ts`: `schema: "prisma/schema.prisma"`, `migrations.path:
  "prisma/migrations"`, `datasource.url = env("DATABASE_URL")`.
- `schema.prisma`: `generator client { provider = "prisma-client-js" }`,
  `datasource db { provider = "mysql" }` (tanpa `url` — url dari config),
  `@prisma/adapter-mariadb` sebagai adapter runtime (`backend/src/db.js`).
- Versi yang **harus dipakai untuk deployment ini**: `prisma` CLI **7.10.1**,
  `@prisma/client ^7.10.1`, dan `@prisma/adapter-mariadb ^7.10.1`.
- Sebelum menjalankan skrip migrasi, cek `npx prisma -v`. Bila output CLI adalah
  `8.0.0-rc.*`, hentikan dan pulihkan `backend/package.json`/`package-lock.json`
  ke `prisma: 7.10.1`, lalu `npm ci`. Prisma 8 RC mengubah nama perintah dan tidak
  sesuai skrip `db:status`/`db:migrate` proyek ini.

### 11.2 Kapan memakai perintah apa

| Perintah | Setara | Kapan |
|---|---|---|
| `npm run prisma:generate` | `prisma generate` | Setelah install / setiap kali schema berubah, **sebelum** start |
| `npm run db:status` | `prisma migrate status` | Cek status migrasi |
| `npm run db:migrate` | `prisma migrate deploy` | **Produksi** — menerapkan migrasi yang belum ada, non-interaktif |
| `npm run prisma:migrate` | `prisma migrate dev` | **Hanya development** — jangan di produksi |
| `npm run db:generate` | `prisma generate` | Alias generate |
| `npm ci` | — | Install dependency sesuai lockfile |
| `npm ci --omit=dev` | — | Install tanpa devDeps (hati-hati: menghapus CLI `prisma`) |

### 11.3 Strategi A — database kosong, Prisma membuat schema (REKOMENDASI UTAMA)

Pilih ini bila Terminal/SSH atau fasilitas menjalankan perintah Node tersedia.
Jangan impor SQL schema sebelum langkah ini.

1. Pastikan cPanel membuat database kosong dan `DATABASE_URL` menunjuk database itu.
2. Pastikan CLI Prisma adalah versi 7.10.1 (§11.1).
3. Jalankan `npm ci` dari `backend/` (butuh devDependencies untuk CLI Prisma).
4. Jalankan `npm run prisma:generate`.
5. Jalankan `npm run db:status` — untuk database kosong, 4 migration tampil pending.
6. Jalankan `npm run db:migrate` — menerapkan empat migration resmi dan membuat
   `_prisma_migrations` otomatis.
7. Jalankan `npm run db:status` — harus menyatakan schema up to date/semua applied.
8. Lanjutkan seed awal §15.1, lalu restart Node App.

Ini metode utama karena migration SQL dan riwayatnya dijalankan oleh Prisma sendiri.

### 11.4 Strategi B — SQL phpMyAdmin lalu Prisma baseline (bila tanpa Terminal saat import)

Gunakan hanya bila tabel perlu dibuat melalui GUI terlebih dahulu. Minta **file SQL
schema-only dari developer** (dikirim terpisah, bukan dari GitHub), lalu impor ke
**database baru dan kosong** melalui phpMyAdmin. Setelah itu minta developer/provider
menjalankan empat perintah baseline resmi dari Application Root `backend/`:

```bash
npm run prisma:generate
npx prisma migrate resolve --applied 20261103000000_init
npx prisma migrate resolve --applied 20261103010000_auth_tokens
npx prisma migrate resolve --applied 20261104000000_site_settings_revision_int
npx prisma migrate resolve --applied 20261104010000_events_category_enum
npm run db:status
```

Setelah keempat `resolve` sukses, `db:status` harus menunjukkan schema up to date.
Perintah `migrate resolve --applied` adalah mekanisme resmi Prisma: Prisma sendiri
membuat tabel `_prisma_migrations` dan menulis checksum, nama migration, timestamp,
status selesai, `logs`, dan `applied_steps_count` yang sesuai. **Jangan membuat/isi
`_prisma_migrations` secara manual** dan jangan menjalankan `npm run db:migrate`
sebelum baseline selesai; jika dilakukan, migration pertama mencoba membuat tabel
yang sudah ada (P3005/"already exists").

Baseline menandai migration sebagai sudah diterapkan, **bukan menjalankan isi SQL**.
Karena itu gunakan hanya SQL final yang sudah disesuaikan dengan semua migration:
`site_settings.revision` harus `INT` (migration 3) dan `events.kategori` harus enum
final 15 nilai (migration 4). Jangan baseline schema buatan sendiri atau schema yang
belum diverifikasi.

Sebelum start aplikasi, validasi drift dari folder `backend/`:

```bash
npx prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --exit-code
```

Exit code `0` / `No difference detected` = cocok. Bila ada perbedaan, **berhenti**;
jangan jalankan `migrate deploy` sebagai percobaan.

### 11.5 Perintah migration dan batasannya

| Perintah | Makna | Kapan |
|---|---|---|
| `npm run prisma:generate` | `prisma generate` | Setelah install / schema berubah, sebelum start. |
| `npm run db:status` | `prisma migrate status` | Periksa riwayat. CLI harus Prisma 7. |
| `npm run db:migrate` | `prisma migrate deploy` | Produksi; database kosong atau sudah punya history yang cocok. |
| `npx prisma migrate resolve --applied <nama>` | Menandai migration sudah diterapkan tanpa menjalankan SQL | Baseline SQL import terverifikasi; sekali per migration. |
| `npm run prisma:migrate` | `prisma migrate dev` | Development saja; jangan di produksi. |
| `npm ci --omit=dev` | Install tanpa devDependencies | Jangan sebelum semua pekerjaan CLI selesai; menghapus CLI `prisma`. |

`prisma db push` **bukan** pengganti Prisma migration: tidak membangun riwayat
migration yang dibutuhkan `migrate deploy/status`. Jangan menggunakannya untuk
menyiasati Terminal yang tidak tersedia.

### 11.6 Daftar migrasi yang berlaku

Dari `backend/prisma/migrations/`:

1. `20261103000000_init` — 14 tabel inti, termasuk `users`, `events`, dan `site_settings`.
2. `20261103010000_auth_tokens` — tabel `auth_tokens` + foreign key.
3. `20261104000000_site_settings_revision_int` — `site_settings.revision` BIGINT → INT.
4. `20261104010000_events_category_enum` — perluas enum `events.kategori` dari 5 ke 15 nilai.

**Jangan** reset database, menghapus migration, atau menjalankan `migrate dev` di
produksi. Batasan shared hosting untuk DDL (CREATE/ALTER/INDEX/FOREIGN KEY) wajib
dikonfirmasi ke provider.

---

## 12. File Uploads

- `UPLOAD_ROOT` = lokasi persisten **di luar** `public_html` dan **di luar** `dist`.
- Gambar konten (`/api/uploads/content`, admin): disimpan di `<UPLOAD_ROOT>/content-images/`
  dan disajikan publik lewat Express `GET /uploads/content-images/*`.
- Dokumen PPDB (`/api/uploads/ppdb-documents`, user terautentikasi): disimpan di
  `<UPLOAD_ROOT>/ppdb-documents/submissions/<userId>/document.pdf` dan **hanya** dapat
  diunduh lewat `GET /api/uploads/ppdb-documents/:userId` (owner atau admin).
- Validasi backend: ukuran maksimum **10 MB** per file; hanya gambar
  (`jpeg/png/webp/gif`) untuk konten, hanya **PDF** untuk dokumen PPDB; divalidasi
  magic bytes (`routes/uploads.js`).
- `MEDIA_BASE_URL` harus mengarah ke backend agar URL gambar benar.
- Permission: direktori 755, file 644 (server menulis `0640`). Jangan menaruh
  `ppdb-documents` di area yang dilayani Apache statis.

**Uji:** unggah gambar konten dari dashboard → URL harus
`https://api.smkcontoh.sch.id/uploads/content-images/<uuid>.<ext>`. Akses dokumen
PPDB sebagai user lain harus **403/404**.

---

## 13. Backup & Restore

Implementasi aktual: `backend/scripts/backup.mjs`, `backup-verify.mjs`, `restore.mjs`,
`backup-keygen.mjs`, logika `backend/src/utils/backup.js`. Dokumentasi detail ada di
`docs/MYSQL_BACKUP_GUIDE.md`.

### 13.1 Alur

```
mysqldump --single-transaction --quick --routines --triggers --events \
          --no-tablespaces --hex-blob --default-character-set=utf8mb4
   -> gzip -> AES-256-GCM (header "SMKBACK1" + IV 12B + ciphertext + tag 16B)
   -> backups/mysql/YYYY/MM/mysql-backup-YYYY-MM-DD.sql.gz.enc
tar uploads/ -> gzip -> AES-256-GCM -> backups/uploads/uploads-backup-YYYY-MM-DD.tar.gz.enc
manifest JSON (SHA-256, tableCounts) -> backups/manifests/backup-YYYY-MM-DD.json
upload + verifikasi ke Supabase Storage bucket privat `mysql-backups`
status: LOCAL_CREATED -> REMOTE_UPLOADED -> REMOTE_VERIFIED (atau FAILED)
retensi 30 hari (Asia/Jakarta), hapus lokal + remote
```

### 13.2 Kebutuhan binary & izin

- `mysqldump`, `mysql`, `tar` harus tersedia; set `MYSQLDUMP_PATH`/`MYSQL_PATH` absolut
  bila tidak di `PATH`.
- Proses Node harus boleh `spawn` child process (mysqldump/tar).
- Outbound HTTPS ke `SUPABASE_URL` (default `https://<project>.supabase.co`).

### 13.3 Menjalankan

```bash
npm run db:backup                 # lokal + upload (di production wajib remote)
npm run db:backup -- --no-upload  # lokal saja
npm run db:backup:verify          # verifikasi checksum manifest
```

### 13.4 Bila cPanel tidak mendukung kebutuhan tersebut

WAJIB DIKONFIRMASI KE PROVIDER HOSTING. Jika `mysqldump`/`tar` tidak tersedia,
`spawn` diblokir, atau outbound HTTPS ditutup, **jangan** mengklaim backup otomatis
berfungsi. Alternatif:

1. **cPanel Backup / Backup Wizard** — unduh backup home/database berkala (manual/tak
   terenkripsi oleh aplikasi). Simpan di luar server.
2. **phpMyAdmin → Export** — ekspor database manual (SQL). Untuk uploads, unduh via
   File Manager (ZIP) manual.
3. Bila SSH tersedia, jalankan `mysqldump` manual lalu `scp` keluar server.

Alternatif ini **tidak** memberi enkripsi AES-256-GCM otomatis milik aplikasi. Dokumentasikan
secara eksplisit keterbatasannya.

### 13.5 Restore

```bash
# dari file lokal
node scripts/restore.mjs backups/mysql/YYYY/MM/mysql-backup-YYYY-MM-DD.sql.gz.enc \
  --db=smktelkom_smk_restore_test --apply
# dari Supabase
node scripts/restore.mjs --remote-date=YYYY-MM-DD --target=mysql \
  --db=smktelkom_smk_restore_test --apply
```

- **Selalu restore ke database testing lebih dulu.** Restore ke production menolak
  kecuali `--allow-production --confirm`.
- `--apply` wajib (guard `restore.mjs:36`).
- Restore uploads ke direktori testing dulu (`--uploads-root=...`), jangan menimpa
  `UPLOAD_ROOT` aktif tanpa `--allow-production --confirm`.
- **Jangan menghapus data production** saat uji restore.

---

## 14. Cron Jobs dan Scheduler

### 14.1 Prinsip

Repository menyediakan scheduler **VPS/Windows** (`backend/schedulers/linux-backup-daily.{service,timer}`,
`windows-backup-daily.xml`). **Jangan menempel konfigurasi systemd ke cPanel.**
Di cPanel, gunakan **Cron Jobs**.

### 14.2 Scheduler proyek hanya untuk backup

Tidak ada scheduler aplikasi in-app untuk backup; jadwal dijalankan oleh OS
(`BACKUP_SCHEDULE=0 2 * * *`) atau cron. Jalankan **script** `scripts/backup.mjs`,
bukan entry point server.

### 14.3 Contoh Cron Job cPanel (placeholder)

cPanel → **Cron Jobs** → *Add New Cron Job*:

```
# Jam 02:00 WIB setiap hari. 
# 02:00 WIB = 19:00 UTC; sesuaikan dengan timezone server cPanel.
0 19 * * * /home/smktelkom/nodevenv/projects/smk-telkom-purwokerto/backend/22/bin/node /home/smktelkom/projects/smk-telkom-purwokerto/backend/scripts/backup.mjs >> /home/smktelkom/logs/backup.log 2>&1
```

Ketentuan:

- **Node binary path**: pakai path Node **versi aplikasi** dari panel (contoh pola
  `~/nodevenv/<app>/<ver>/bin/node`). WAJIB DIKONFIRMASI KE PROVIDER HOSTING.
- **Working directory**: cron cPanel tidak punya working dir aplikasi; gunakan path
  absolut untuk script dan pastikan `.env`/env terbaca. Bila perlu:
  `cd /home/smktelkom/projects/smk-telkom-purwokerto/backend && <node> scripts/backup.mjs`.
- **Environment variables**: cron cPanel tidak mewarisi env Node App. Ekspor variabel
  yang dibutuhkan (minimal `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, `MYSQLDUMP_PATH`,
  `MYSQL_PATH`, `BACKUP_DIR`, `UPLOAD_ROOT`, `SUPABASE_*`) — atau gunakan wrapper
  shell yang `source` file env (permission `0600`).
- **Logging**: redirect `>> <log> 2>&1`; periksa berkala.
- **Exit code**: `backup.mjs` keluar non-zero bila gagal (di production tanpa remote
  env, exit 1). Cron cPanel tidak punya UI status, jadi pantau log.
- **Locking**: `backup.mjs` memakai lock `backups/.backup.lock` (`wx`) untuk mencegah
  backup bersamaan.
- **Timezone**: server cPanel umumnya UTC. `0 19 * * *` UTC = 02:00 WIB. Konfirmasi
  timezone server (cPanel → Server Information / timezone).
- **Duplikasi**: pastikan hanya **satu** cron backup terdaftar.

### 14.4 Bila Cron/tar/mysqldump tidak tersedia

WAJIB DIKONFIRMASI KE PROVIDER HOSTING. Jika cron tidak bisa menjalankan script,
gunakan backup manual terjadwal (§13.4). Jangan menjanjikan backup otomatis.

---

## 15. Security Hardening

- **HTTPS wajib** (cookie `secure: true`). Force HTTPS untuk frontend dan API (§16).
- **Cookie**: `session_token` `httpOnly` + `secure` + `SameSite=Lax`; `csrf_token`
  non-httpOnly (double-submit).
- **CORS**: satu origin `FRONTEND_URL`, `credentials: true`. Jangan wildcard.
- **CSRF**: header `x-csrf-token` wajib pada mutasi; diverifikasi timing-safe.
- **Origin guard**: `app.js:43` menolak mutasi dari origin lain (`403`).
- **Session**: token disimpan hashed (`sha256`) di tabel `sessions`; TTL 7 hari.
- **Kredensial DB**: user DB least-privilege; jangan `root`; jangan expose 3306.
- **Privilege MySQL**: berikan hanya yang diperlukan (§4.2).
- **File permission**: `.env` `0600`; `UPLOAD_ROOT`/`BACKUP_DIR` di luar `public_html`.
- **Upload validation**: batas 10 MB, whitelist MIME, magic bytes, nama file UUID.
- **Dokumen PPDB privat**: hanya via API berautentikasi.
- **Supabase Service Role**: hanya backend.
- **Backup encryption**: AES-256-GCM, key disimpan terpisah.
- **`.env` exposure**: `helmet()` aktif (`app.js:32`); pastikan Apache **tidak**
  menyajikan `.env`/`backups`/`uploads/ppdb-documents`. Rekomendasi penempatan backend
  **di luar** `public_html` (§8.1).
- **Directory listing**: matikan `Options -Indexes` di `.htaccess` document root.
- **Debug mode**: `NODE_ENV=production` (pesan error 500 tidak membocorkan stack,
  `middleware/error.js`).
- **Error logging**: log JSON ke stdout (ditangkap panel/log).
- **Rate limit**: global 300/15 menit (`app.js:41`); login 10/15 menit; AI per-IP.
- **Admin recovery**: buat admin via `db:seed` + `ADMIN_RECOVERY_*`, lalu **hapus**
  variabel tersebut dan ganti password dari UI. Detail: `docs/ADMIN_ACCOUNT_RECOVERY.md`.

---

## 16. Domain dan SSL

- **Primary domain**: `www.smkcontoh.sch.id` (frontend).
- **Subdomain API**: `api.smkcontoh.sch.id` (backend).
- **DNS**: `A`/`CNAME` di Zone Editor cPanel/provider. Jangan menganggap domain sudah
  diarahkan ke hosting ini — verifikasi.
- **SSL/TLS**: aktifkan AutoSSL atau Let's Encrypt untuk **kedua** host.
- **Force HTTPS**: redirect 301 HTTP→HTTPS untuk frontend dan API.
- **CORS origin**: `FRONTEND_URL=https://www.smkcontoh.sch.id` (harus sama persis,
  tanpa trailing slash).
- **Cookie behavior**: karena `secure: true`, cookie hanya terkirim via HTTPS.
- **Verifikasi API**: `curl -s https://api.smkcontoh.sch.id/health`.

---

## 17. Testing

### 17.1 Frontend

- Homepage, profil sekolah, jurusan, prestasi, BKK, berita, pengumuman, kalender
  kegiatan, ekstrakurikuler, galeri, kebijakan privasi.
- Responsif mobile.
- Refresh (F5) pada route detail (`/berita/:slug`, `/jurusan/:slug`) → tidak 404.
- Aset (gambar/font) termuat; tidak ada 404 di Console.

### 17.2 Backend

- `GET /health` → `{ ok: true, database: "up" }`.
- `GET /api/auth/csrf` → mengembalikan `csrfToken` + cookie.
- `GET /api/auth/me` → 401 tanpa sesi; data user setelah login.
- Login admin, akses `/api/admin/*` (harus 403 untuk non-admin).
- CRUD Berita/Pengumuman/Prestasi/BKK/Events via dashboard.
- Upload gambar (`/api/uploads/content`).
- Dokumen PPDB privat (`/api/uploads/ppdb-documents/:userId`).
- CORS (origin lain ditolak), CSRF (tanpa header ditolak 400 `csrf_failed`), session
  cookie tersimpan.

### 17.3 Infrastruktur

- Koneksi MySQL aktif (`/health` database up).
- `npm run db:status` → semua migrasi applied.
- Upload persisten (unggah, restart app, file tetap ada).
- Backup (lokal + remote) dan restore test database.
- Cron job berjalan (log terbentuk).
- HTTPS aktif.
- Log error bersih.

### 17.4 SPMB internal

- `SPMB_INTERNAL_ENABLED=false` (default) → mutasi PPDB/SPMB ditolak `503 SPMB_DISABLED`.
- CTA tetap menuju portal resmi Yayasan Telkom Schools
  (`https://ppdb.telkomschools.sch.id/welcome`, `backend/src/config/features.js`).

---

## 18. Rollback

1. **Kode backend**: simpan rilis sebelumnya; kembalikan folder source lalu restart
   Node App. (Di cPanel tanpa symlink rilis, simpan salinan `backend/` sebelum update.)
2. **Frontend**: simpan salinan `dist/` lama; unggah ulang untuk rollback. Pola
   `deploy-remote.sh` membuat folder backup (`public_html/flexbox-backup-<timestamp>`).
3. **Database**: restore dari backup `REMOTE_VERIFIED` terakhir ke DB test, verifikasi,
   baru ke production dengan `--allow-production --confirm` dan persetujuan eksplisit.
   Lihat §13.5 dan `docs/ROLLBACK_GUIDE.md`.
4. **Migrasi**: migrasi yang sudah diterapkan **tidak** di-rollback manual di production;
   pulihkan DB dari backup bila perlu.

---

## 19. Troubleshooting

Lihat [`./CPANEL_TROUBLESHOOTING.md`](./CPANEL_TROUBLESHOOTING.md) untuk tabel lengkap gejala → penyebab →
diagnosis → solusi.

---

## 20. Checklist Akhir

Lihat [`./CPANEL_DEPLOYMENT_CHECKLIST.md`](./CPANEL_DEPLOYMENT_CHECKLIST.md).

---

## Lampiran A — Ringkasan perintah yang benar (sesuai `package.json`)

Backend (`backend/`):

```bash
npm ci                     # install dependency (butuh devDeps untuk CLI prisma)
npm run prisma:generate    # prisma generate
npm run db:migrate         # prisma migrate deploy  (produksi)
npm run db:status          # prisma migrate status
npm run db:seed            # seed site_settings (+ admin recovery)
npm run db:backup          # backup terenkripsi
npm run db:backup:verify   # verifikasi backup
npm start                  # node src/server.js
```

Frontend (`frontend/`):

```bash
npm ci
npm run build              # build produksi (prerender SEO strict)
npm run preview            # uji lokal hasil build
```

## Lampiran B — Hal yang BELUM dapat diverifikasi dari source (jujur)

| Item | Alasan |
|---|---|
| Deployment cPanel nyata | Tidak ada akses cPanel/SSH/DNS pada sesi ini |
| Versi Node yang benar-benar disediakan provider | Bergantung provider; wajib dikonfirmasi |
| Ketersediaan Passenger format startup file | Bergantung provider |
| Keberhasilan `npm ci` native module (`argon2`, `bcrypt`) di server | Bergantung toolchain/prebuilt provider |
| Ketersediaan `mysqldump`/`tar`/cron/outbound HTTPS | Bergantung provider |
| Upload backup ke Supabase | Tidak ada service role key |
| SMTP / provider AI / Turnstile live | Tidak ada kredensial |
| Build frontend dengan backend terjangkau saat build | Bergantung alur build yang dipilih |

Langkah di dokumen ini adalah prosedur siap-pakai, **bukan klaim sudah berjalan
di produksi**.
