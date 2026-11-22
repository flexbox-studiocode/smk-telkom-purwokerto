# Audit Performa — Website SMK Telkom Purwokerto

Dokumen ini adalah hasil audit **Phase 0** dari rencana optimisasi
(`MASTER PROMPT — OPTIMISASI, REVISI, DAN MIGRASI`). Semua temuan di bawah
diverifikasi langsung dari repository, bukan asumsi template.

- Repositori: `https://github.com/flexbox-studiocode/smk-telkom-purwokerto`
- Branch: `main`
- Tanggal audit: 22 November 2026
- Commit audit: (lihat commit `docs(performance): add comprehensive website performance audit`)

> Catatan penting: struktur repo aktual **berbeda dari asumsi master prompt**.
> Template mengasumsikan Supabase + folder `supabase/` sebagai backend utama.
> Yang benar: aplikasi operasional sudah bermigrasi ke **Express 5 + Prisma 7 +
> MySQL 8** (`backend/`). Folder `supabase/` hanya tersisa sebagai arsip ETL
> read-only. Audit mengikuti arsitektur aktual.

---

## 0. Baseline

### 0.1 PageSpeed Insights (produksi, 22 November 2026)

| Kategori | Mobile | Desktop |
|---|---:|---:|
| Performance | 55 | 74 |
| Accessibility | 97 | 97 |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

Temuan PageSpeed yang dilaporkan:

- Potensi penghematan gambar: ± 1.388 KiB (mobile), ± 1.662 KiB (desktop).
- JavaScript execution ± 1,9 s (mobile); main-thread work ± 2,7 s.
- Unused JavaScript ± 72,1 KiB.
- LCP mobile ± 7,7 s; LCP render delay ± 2.570 ms.
- Render-blocking CSS ± 440 ms.
- Forced reflow (desktop) ± 65 ms.

### 0.2 Baseline build lokal (`npm run build:ci`, `frontend/`)

Perintah: `CI=true vite build` (menghasilkan `frontend/dist`), diukur 22 Nov 2026.

Initial load homepage (raw / gzip):

| Chunk | Raw | Gzip |
|---|---:|---:|
| `index` (entry) | 396,17 kB | 131,61 kB |
| `school-content` (`dummyData.js`, dimuat hampir semua route) | 271,00 kB | 94,04 kB |
| `react-vendor` | 181,72 kB | 57,17 kB |
| `motion-vendor` (framer-motion) | 144,61 kB | 48,72 kB |
| `gsap-vendor` | 112,84 kB | 44,35 kB |
| `lenis-vendor` | 28,28 kB | 8,90 kB |
| **Total JS relevan homepage** | **± 1.134 kB** | **± 385 kB** |

Chunk lazy (tidak di initial load):

| Chunk | Raw | Gzip | Dimuat oleh |
|---|---:|---:|---|
| `RichTextEditor` | 454,88 kB | 143,85 kB | dashboard admin |
| `index.module` (`@photo-sphere-viewer/core`) | 630,19 kB | 162,51 kB | `/fasilitas` (panorama kampus) |
| `FasilitasPage` | 117,12 kB | 32,94 kB | `/fasilitas` |
| `TentangPage` | 73,77 kB | 24,78 kB | `/profil-sekolah` |
| `NextTelPage` | 70,28 kB | 22,31 kB | `/nexttel` |

### 0.3 Baseline aset bitmap terberat (yang benar-benar dikirim)

`frontend/src/assets` ± 100 MB total; 20 berkas > 500 kB (± 31,9 MB).
Disalin apa adanya dari `frontend/public` juga membengkak:

| Berkas | Ukuran | Dimensi | Catatan |
|---|---:|---|---|
| `public/assets/branding/nexttel-mark.png` | 450,7 kB | 1433×1098 | tampil ± 38×29 px (ikon) hingga ± 128 px |
| `public/assets/branding/about-background.png` | 298,8 kB | 1847×1076 | latar `AboutSection` |
| `src/assets/prestasi-remake/partnersCard.png` | 398,5 kB | 786×506 | tanpa alpha → kandidat WebP |
| `src/assets/tentang/profile/mission-classroom.png` | 3.497 kB | 4032×3024 | sebenarnya JPEG di dalam ekstensi `.png` |
| `src/assets/landing/laurel-branch.png` | 107,2 kB | 273×503 | dekorasi prestasi |
| `src/assets/landing/partners-bg.png` | 278,0 kB | 1847×255 | strip dekorasi |
| `public/assets/branding/nexa-mark.png` | 81,8 kB | 501×498 | maskot NEXA, tampil kecil |
| `src/assets/fasilitas/campus/campus-map.webp` | 870,1 kB | 2164×727 | peta isometrik |
| `src/assets/kalender/hero-calendar-lossless.webp` | 865,2 kB | 1774×887 | hero kalender (`fetchPriority=high`) |
| `src/assets/landing/stela-card-en.png` | 1.500,0 kB | — | fallback `src` STELA (ada set WebP responsif) |

Total `frontend/public` raster saja ± 6,1 MB; total `frontend/dist/assets` ± 71,3 MB.

---

## 1. Masalah yang ditemukan (prioritas menurun)

### P1 — Gambar Jauh Lebih Besar dari Ukuran Tampil ⭐ tertinggi

**Masalah.** Banyak bitmap beresolusi/dimensi jauh melebihi kebutuhan render,
dan format PNG dipakai untuk foto. Contoh paling parah: `nexttel-mark.png`
450,7 kB untuk ikon 38×29 px (± 4.000× lebih besar dari yang dibutuhkan);
`mission-classroom.png` 3,5 MB untuk foto 4032 px.

**File sumber.**
`frontend/public/assets/branding/nexttel-mark.png`,
`frontend/public/assets/branding/about-background.png`,
`frontend/public/assets/branding/nexa-mark.png`,
`frontend/src/assets/prestasi-remake/partnersCard.png` (+ `-en`),
`frontend/src/assets/tentang/profile/mission-classroom.png`,
`frontend/src/assets/landing/partners-bg.png`,
`frontend/src/assets/landing/laurel-branch.png`,
`frontend/src/assets/landing/ribbon(-divider).png`,
`frontend/src/assets/fasilitas/campus/campus-map.webp`,
`frontend/src/assets/kalender/hero-calendar-lossless.webp`.

**Dampak.** Penghematan ± 1.388 KiB (mobile) / ± 1.662 KiB (desktop) yang
dilaporkan PageSpeed hampir seluruhnya berasal dari kelas masalah ini. Ini
penyebab tunggal terbesar LCP lambat dan transfer besar.

**Prioritas.** 1 — dikerjakan lebih dulu.

**Solusi.** Downscale ke batas dimensi render + kompresi optimal; foto tanpa
alpha → WebP; PNG ber-alpha → PNG terkompresi/di-resize (bukan JPEG).

**Verifikasi.** Bandingkan ukuran sebelum/sesudah per berkas, cek metadata
dimensi (`sharp().metadata()`), dan periksa visual (tidak ada pecah/broken).

### P2 — JavaScript Awal Berat (TBT / JS execution)

**Masalah.** Entry `index` 396 kB + `school-content` 271 kB + vendor
(`react` + `motion` + `gsap` + `lenis` ± 467 kB) → ± 385 kB gzip sebelum
halaman interaktif. `dummyData.js` (168,7 kB) diimpor oleh ± 77 berkas sehingga
terbawa `MainLayout` (Navbar/Footer) di hampir semua route.

**File sumber.** `frontend/src/data/dummyData.js` (dan 37 berkas
`src/data/*` lain ± 1 MB), `frontend/src/components/Navbar.jsx`,
`frontend/src/components/Footer.jsx`, `frontend/src/App.jsx`,
`frontend/src/layouts/MainLayout.jsx`.

**Dampak.** JavaScript execution ± 1,9 s & main-thread work ± 2,7 s (mobile);
forced reflow dari React render awal + GSAP. Ini menekan TBT dan LCP (render delay).

**Prioritas.** 2.

**Solusi.** Kode sudah lumayan ter-split (`App.jsx` lazy untuk ± 70 route,
`vite.config.js` `manualChunks`). Tindak lanjut: pertahankan, jangan tambah
impor berat ke initial render; evaluasi memisah `dummyData` per domain.

**Verifikasi.** `npm run performa:uji` (budget bundle) + analisis output build.

### P3 — Polling Berulang Menambah Kerja Main-Thread dan Network

**Masalah.** Beberapa interval berjalan bersamaan per halaman:
`useEvents.js` & `useSpmbInformation.js` (30 s), `SiteSettingsContext.jsx` (60 s),
plus pemicu `focus`/`visibilitychange`/`storage`. Setiap respons `no-store`.

**File sumber.** `frontend/src/hooks/useEvents.js`,
`frontend/src/hooks/useSpmbInformation.js`,
`frontend/src/context/SiteSettingsContext.jsx`,
`backend/src/app.js` (Cache-Control `private, no-store`, ETag dimatikan).

**Dampak.** Reflow/task periodik, network berulang, baterai mobile boros.

**Prioritas.** 3.

**Solusi.** Naikkan/interval adaptif, hentikan saat tab tidak aktif, cache
in-memory dengan TTL untuk data jarang berubah (`settings`, `spmb`).

**Verifikasi.** Pantau Network & Performance di Lighthouse/DevTools; pastikan
konten tetap ter-refresh.

### P4 — CSS Render-Blocking & Font

**Masalah.** PageSpeed mencatat render-blocking CSS ± 440 ms. Stylesheet
per-komponen diimpor dari JS (di-bundle jadi satu CSS), jadi CSS global tetap
render-blocking. Strategi font sudah baik: `font-faces-optimized.css` (variable
font, `font-display: swap`, fallback `Jakarta Fallback`), preload satu woff2,
`font-faces.css` (varian lama) tidak lagi diimpor.

**File sumber.** `frontend/src/index.css`,
`frontend/src/assets/fonts/font-faces-optimized.css`, `frontend/index.html`.

**Dampak.** FCP/LCP delay; risiko CLS bila metrik fallback meleset.

**Prioritas.** 4.

**Solusi.** Kurangi CSS yang tak terpakai; pastikan tinggi elemen hero/LCP tidak
bergantung animasi (`Reveal` sudah menampilkan elemen saat masuk viewport,
`opacity` awal 0 → verifikasi LCP tidak menunggu).

**Verifikasi.** Lighthouse render-blocking audit + CLS ≤ 0,05.

### P5 — LCP Element & Animasi

**Masalah.** LCP mobile ± 7,7 s. Kandidat LCP: gambar hero (`beranda-hero-*.webp`
atau ilustrasi hero) atau judul hero. `Reveal` mengeset elemen `opacity: 0`
sampai `IntersectionObserver` menyala; untuk elemen above-the-fold harus
dipastikan tidak menunda render teks/gambar LCP.

**File sumber.** `frontend/src/components/Reveal.jsx`,
`frontend/src/components/HeroPanel.jsx`,
`frontend/src/components/HeroCarousel.jsx`,
`frontend/src/components/HeroSection.jsx`.

**Dampak.** Render delay LCP ± 2.570 ms.

**Prioritas.** 2 (berpasangan dengan P1/P2).

**Solusi.** Pastikan elemen hero LCP eager + `fetchpriority="high"` dan tidak
dibungkus animasi opacity; turunkan biaya task di main thread.

**Verifikasi.** Lighthouse LCP breakdown; pastikan LCP element terdeteksi
sejak HTML awal.

### P6 — `site_visitors` Query Berpotensi Memburuk Saat Tabel Besar

**Masalah.** `count({ day: today })`, rentang 30 hari, rentang 12 bulan; PK
adalah `(visitor_hash, day)` sehingga `day` sebagai kolom terakhir tidak punya
prefix index yang bisa dipakai untuk range count.

**File sumber.** `backend/src/routes/stats.js`,
`backend/prisma/schema.prisma` (model `SiteVisitor`).

**Dampak.** Latensi counter pengunjung naik seiring pertumbuhan tabel. Tidak
mempengaruhi skor PageSpeed homepage secara langsung.

**Prioritas.** 6 (backend, di luar jalur kritis PageSpeed).

**Solusi.** Tambah `INDEX(day)` lewat migration baru + pertimbangkan cache
harian. **WAJIB** migration aman + uji, bukan `DROP`/`TRUNCATE`.

**Verifikasi.** `EXPLAIN` sebelum/sesudah; `npm run prisma:validate`.

---

## 2. Konfigurasi yang sudah benar (tidak diubah)

- `frontend/vite.config.js`: `manifest: true`, `assetsInlineLimit` memaksa
  bitmap/font **tidak** di-inline ke JS, `manualChunks` memisah
  `school-content`, `react-vendor`, `motion-vendor`, `gsap-vendor`, `lenis-vendor`.
- `frontend/src/App.jsx`: seluruh route non-homepage `lazy()`.
- `frontend/vercel.json`: `immutable` untuk aset ber-hash, `index.html`
  `max-age=0, must-revalidate`.
- Strategi font variable + `size-adjust` fallback.
- `frontend/src/components/Reveal.jsx`: `IntersectionObserver` (tanpa library
  animasi), observer dilepas setelah tampil.

---

## 3. Ruang lingkup kerja & urutan

| Fase | Fokus | Status audit |
|---|---|---|
| 1 | Gambar & aset | **Prioritas tertinggi** — kerjakan dulu |
| 2 | JavaScript & bundle | Sebagian sudah ada; jaga regresi |
| 3 | LCP, CSS, font, stabilitas layout | Perbaikan bertarget |
| 4 | Footer (FlexBox link, hapus tautan admin) | Sudah diterapkan di working tree; tinggal verifikasi/commit |
| 5 | Navbar SPMB (URL resmi) | Sudah diterapkan di working tree; tinggal verifikasi/commit |
| 6 | Redesain Kebijakan Privasi | Belum; dikerjakan |
| 7 | Tooling arsip WordPress | Belum ada analyzer; dikerjakan |
| 8 | Pengujian & regresi keamanan | Jalankan suite yang ada |
| 9 | Audit performa akhir | Setelah semua fase |

---

## 4. Cara verifikasi umum

```bash
cd frontend
npm run lint                     # ESLint
npm run performa:uji             # budget bundle/aset
npm run seo:uji                  # metadata SEO
npm run footer:uji               # regresi footer publik
npm run publik:uji               # layanan publik
npm run ppdb:uji                 # alur SPMB/PPDB
npm run security:uji             # regresi keamanan
CI=true npm run build:ci         # build produksi (offline prerender)

cd ../backend
npm test                         # suite backend (node:test)
npm run prisma:validate          # validasi schema
```

> Catatan: `npm run build:ci` memerlukan `CI=true` karena
> `prerender-seo.mjs --offline` sengaja hanya boleh jalan di CI non-Vercel.

---

## 5. Batasan audit ini

- Angka PageSpeed berasal dari laporan produksi; audit lokal memakai
  build + pengukuran ukuran chunk/aset, bukan Lighthouse penuh di CI.
- Verifikasi akhir PageSpeed (mobile ≥ 92, desktop ≥ 95) memerlukan
  deploy ke produksi dan Lighthouse pada kondisi konsisten — di luar
  lingkup commit lokal, dilaporkan pada `FINAL_PERFORMANCE_REPORT.md`.
- Tidak ada perubahan database production yang dilakukan pada fase ini.
