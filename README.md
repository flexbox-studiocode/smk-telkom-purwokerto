# SMK Telkom Purwokerto

Website sekolah dan dashboard pengelolaan konten. Repository berisi frontend React, backend API Node.js, database MySQL, layanan AI, dokumentasi operasional, serta arsip migrasi konten WordPress.

## Arsitektur saat ini

```text
Browser
  └─ React 19 + Vite 8 frontend
       └─ REST API (cookie session + CSRF)
            └─ Express 5 backend
                 └─ MySQL 8.4 melalui Prisma 7
```

- **Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4, Framer Motion, GSAP, Lenis, dan `fetch` terpusat di `frontend/src/services/apiClient.js`.
- **Backend:** Node.js `>=22.12`, Express 5, Prisma 7, MySQL/MariaDB, session berbasis cookie, validasi Zod, dan rate limiting.
- **Layanan tambahan:** SMTP untuk verifikasi email/pemulihan sandi, Cloudflare Turnstile, penyimpanan upload persisten, serta STELA/NEXA dan NextTel melalui backend.
- **Supabase:** migration PostgreSQL di `supabase/migrations/` adalah bagian sistem lama/arsip ETL. Frontend dan backend aktif tidak memakai Supabase sebagai database operasional. Supabase Storage opsional dipakai script backup server-side.

## Fitur utama

- Website publik: beranda, profil sekolah, guru, fasilitas, jurusan, prestasi, BKK, sinergi, berita, pengumuman, kalender, galeri, panduan, chatbot NEXA/STELA, NextTel, dan kebijakan privasi.
- Admin: login terlindungi; pengelolaan berita, pengumuman, prestasi, BKK, kalender, pengaturan, dan data PPDB historis.
- API: konten publik/admin, autentikasi, statistik, event, pengaturan situs, upload, fitur AI, dan informasi SPMB.
- Portal pendaftaran internal saat ini **nonaktif secara default**. Route `/spmb/*` lama dialihkan ke portal resmi Yayasan Telkom Schools; mutasi API internal diblokir kecuali `SPMB_INTERNAL_ENABLED=true` dikonfigurasi.
- Sebagian materi halaman tetap berasal dari aset/data statis frontend; konten berita, pengumuman, prestasi, lowongan, event, dan pengaturan menggunakan API backend.
- Import WordPress tersedia sebagai workflow terpisah. Analisis/dry-run membaca dump; import perlu backup dan pemeriksaan sesuai `backend/wordpress-archive/MIGRATION_GUIDE.md`.

## Route ringkas

| Area | Route |
|---|---|
| Situs publik | `/`, `/profil-sekolah`, `/fasilitas`, `/jurusan`, `/prestasi`, `/bkk`, `/sinergi`, `/berita`, `/pengumuman`, `/kalender`, `/galeri`, `/ekstrakurikuler` |
| Detail/halaman tambahan | `/jurusan/:slug`, `/berita/:slug`, `/pengumuman/:slug`, `/prestasi/:slug`, `/profil-sekolah/guru`, `/bkk/panduan`, `/jurusan/faq`, `/jurusan/perbandingan` |
| AI dan informasi | `/nexa`, `/stela`, `/nexttel`, `/spmb`, `/kebijakan-privasi` |
| Admin | `/login`, `/dashboard`, `/dashboard/berita`, `/dashboard/pengumuman`, `/dashboard/prestasi`, `/dashboard/bkk`, `/dashboard/kalender`, `/dashboard/spmb` |
| Pendaftaran | `/spmb/*` diarahkan ke portal resmi selama fitur internal nonaktif; `/ppdb/*` adalah alias lama yang juga dialihkan |

## Struktur repository

```text
.
├── frontend/                 # React/Vite, pages, components, services, build scripts
├── backend/                  # Express API, Prisma schema/migrations, tests, backup/ETL tools
│   └── wordpress-archive/    # Parser dan workflow migrasi WordPress
├── supabase/                 # Migration dan Edge Function legacy/arsip
├── docs/                     # Setup, deployment, audit, keamanan, QA
├── docs-cpanel/              # Catatan deployment cPanel
├── outputs/                  # Snapshot hasil audit lokal
└── README.md
```

## Menjalankan lokal

Prasyarat: Node.js `>=22.12`, npm, dan MySQL 8.4 atau MariaDB yang kompatibel. Untuk setup MySQL lokal/Laragon, lihat [`docs/BACKEND_LOCAL_SETUP.md`](docs/BACKEND_LOCAL_SETUP.md), [`docs/MYSQL_SETUP_GUIDE.md`](docs/MYSQL_SETUP_GUIDE.md), dan [`docs/MYSQL_RUN_GUIDE.md`](docs/MYSQL_RUN_GUIDE.md).

Siapkan database dan salin `backend/.env.example` ke `backend/.env`. Isi setidaknya `DATABASE_URL` dan `SESSION_SECRET` (minimal 32 karakter); sesuaikan `FRONTEND_URL` dan SMTP bila diperlukan. Jangan commit `.env` atau rahasia.

```powershell
cd backend
npm ci
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Jalankan frontend di terminal lain:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Frontend lokal tersedia di `http://localhost:5173`, API di `http://localhost:3000`; pemeriksaan kesehatan API ada di `GET /health`. `frontend/.env.example` menyediakan `VITE_API_BASE_URL=http://localhost:3000`. Sebagian fitur membutuhkan SMTP, Turnstile, atau kunci provider AI yang dikonfigurasi pada backend. Jangan letakkan rahasia dalam variabel `VITE_*`.

## Environment

Variabel operasional lengkap dan penjelasannya ada di [`backend/.env.example`](backend/.env.example) dan [`frontend/.env.example`](frontend/.env.example).

| Variabel | Lokasi | Fungsi |
|---|---|---|
| `DATABASE_URL` | Backend | Koneksi database MySQL operasional |
| `SESSION_SECRET` | Backend | Rahasia session; isi nilai acak minimal 32 karakter |
| `FRONTEND_URL` | Backend | Origin frontend yang diizinkan untuk CORS/cookie |
| `VITE_API_BASE_URL` | Frontend | URL absolut API backend; wajib untuk build production |
| `VITE_SITE_URL` | Frontend | URL situs untuk SEO/prerender; isi URL deployment |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Backend | Pengiriman verifikasi email dan pemulihan sandi |
| `STELA_API_KEY` atau `GEMINI_API_KEY` | Backend | Provider NEXA/STELA; rahasia server-side |
| `SPMB_INTERNAL_ENABLED` | Backend | Default `false`; membuka portal internal hanya bila disetel `true` |

Variabel backup, Turnstile, upload, dan provider lain dijelaskan dalam contoh env. `SOURCE_DATABASE_URL` hanya untuk ETL arsip Supabase; bukan koneksi database aktif.

## Perintah pemeriksaan

Jalankan sesuai direktori yang disebutkan:

```powershell
# backend/
npm test
npm run prisma:validate
npm run db:status

# frontend/
npm run lint
npm run build
```

Frontend `build` memvalidasi environment deployment dan melakukan prerender SEO; build production memerlukan `VITE_API_BASE_URL` publik yang valid. `build:ci` menggunakan mode offline dengan feed kosong dan bukan artefak konten production. `preview` menyajikan hasil build lokal. Pemeriksaan data/fitur khusus tersedia sebagai script `uji-*` di `frontend/package.json`.

## Database, keamanan, dan backup

- Skema aktif ada di `backend/prisma/schema.prisma`; migration MySQL ada di `backend/prisma/migrations/`. Terapkan dengan `npm run db:migrate` dari `backend/` setelah menyiapkan database dan backup sesuai kebutuhan.
- Backend menggunakan session cookie, CSRF token untuk mutasi, pemeriksaan origin, Helmet, validasi input, dan rate limit. Endpoint admin memerlukan autentikasi/otorisasi.
- Upload dan backup harus memakai direktori persisten serta izin filesystem yang sesuai. Atur `UPLOAD_ROOT`, `BACKUP_DIR`, dan kunci enkripsi backup di backend.
- Script tersedia untuk `npm run db:backup`, `npm run db:backup:verify`, `npm run db:restore`, dan tugas backup terjadwal. Baca panduan backup sebelum restore atau operasi database.
- Gunakan nilai rahasia unik di lingkungan production. Simpan kunci provider AI, SMTP, session, Turnstile, dan kredensial database di server; jangan pernah masukkan ke frontend atau Git.
- Untuk kebijakan pelaporan kerentanan, lihat [`SECURITY.md`](SECURITY.md).

## Deployment dan dokumentasi

Dokumentasi deployment VPS saat ini ada di [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) dan [`docs/VPS_DEPLOYMENT_GUIDE.md`](docs/VPS_DEPLOYMENT_GUIDE.md); deployment cPanel dibahas di [`docs-cpanel/README.md`](docs-cpanel/README.md). `frontend/vercel.json` menyediakan rewrite SPA; Vercel tetap memerlukan `VITE_API_BASE_URL` ke backend terpisah. Keberadaan konfigurasi di repo tidak membuktikan deployment production aktif.

Dokumen lanjutan: [`docs/BACKEND_LOCAL_SETUP.md`](docs/BACKEND_LOCAL_SETUP.md), [`docs/MYSQL_BACKUP_GUIDE.md`](docs/MYSQL_BACKUP_GUIDE.md), [`docs/ROLLBACK_GUIDE.md`](docs/ROLLBACK_GUIDE.md), [`supabase/README.md`](supabase/README.md), dan `backend/wordpress-archive/MIGRATION_GUIDE.md`.

## Status dan batasan penting

- Database runtime adalah MySQL melalui Express/Prisma; dokumentasi Supabase lama tidak menggambarkan arsitektur aktif.
- Pendaftaran online terpusat di portal resmi secara default. Menyalakan fitur internal perlu konfigurasi eksplisit serta kesiapan backend dan data.
- Konten statis tertentu tidak dikelola melalui dashboard. Konsultasikan sumber tiap halaman sebelum menganggap semua konten dinamis.
- File di `outputs/` adalah snapshot audit, bukan hasil pemantauan production terkini.
- Prosedur deployment dan konfigurasi repo tidak membuktikan bahwa DNS, server, database production, email, atau integrasi eksternal sudah berfungsi.
