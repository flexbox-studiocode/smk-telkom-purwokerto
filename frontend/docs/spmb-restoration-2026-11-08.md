# Pemulihan Informasi SPMB — 8 November 2026

## Kesimpulan

Halaman asli tidak pernah dihapus. Route `/spmb` masih terdaftar dan `SpmbPage.jsx`, CSS, aset, hook, service, Admin Panel, serta backend MySQL masih tersedia. Halaman tertutup oleh guard redirect sebelum React Router merendernya. Pemulihan dilakukan pada hunk route/navigasi/metadata, tanpa rollback repository atau menimpa source halaman dengan versi lama.

## Bukti Git

| Commit | Peran |
| --- | --- |
| `d801fef` | Implementasi asli halaman informasi SPMB, section dan aset. |
| `9de3d41` | Sinkronisasi informasi publik dengan pengelolaan admin. |
| `a6f5a64` | Penyempurnaan manajemen informasi SPMB. |
| `e2161a6` | Migrasi backend Supabase ke MySQL/Prisma; integrasi terbaru ini dipertahankan. |
| `9578b7e` | Mengganti tujuan menu Informasi SPMB, footer, quick access, serta carousel menjadi portal eksternal. |
| `a89a6f2` | Guard `isHiddenAdmissionsPath` menutupi `/spmb`; metadata informasi ikut dihapus. |

History ditelusuri dengan `git log --all`, `git show` dan `git diff` pada halaman, App, data navigasi, admission guard, SEO, dan service. Source sebelum `9578b7e`/`a89a6f2` dipakai sebagai acuan pemulihan hunk. Tidak memakai full-file restore karena source terbaru masih memuat rebranding, rich text, carousel, dan perbaikan hero yang harus dipertahankan.

## File dan adaptasi

| File | Perubahan |
| --- | --- |
| `src/utils/admissions.js` | Membuka hanya root informasi `/spmb`, termasuk slash/encoding/case yang sudah dinormalisasi. Redirect portal lama tetap aman dan tidak meneruskan token. |
| `src/data/dummyData.js` | Mengembalikan menu Informasi, footer informasi dan quick access ke `/spmb`. CTA masuk/pendaftaran tetap ke portal resmi. |
| `src/data/landingHeroSlides.js` | Mengembalikan tujuan slide Informasi SPMB. |
| `src/components/Navbar.jsx`, `src/utils/seo.js` | Memulihkan prefetch halaman dan metadata asli. |
| `src/services/spmbInformationService.js` | Menormalkan ISO DATE Prisma menjadi `YYYY-MM-DD`, meneruskan abort signal, dan menyaring Published untuk publik meskipun ada sesi admin. |
| `src/services/siteSettingsService.js` | Mengembalikan pemetaan camelCase API ke field existing form/settings; memperbaiki tahun ajaran dan status pada Pengaturan Admin. Field API asli tetap tersedia. |
| `src/pages/SpmbPage.jsx` | Tetap halaman asli. Membaca settings terbaru, mempertahankan tujuan pendaftaran resmi, menampilkan tanggal pembukaan, melokalkan tanggal/angka/nama gelombang, dan menerjemahkan rich text dengan aman. |
| `src/data/translationsSpmbInfo.js`, `src/utils/spmbTranslation.js` | Melengkapi terjemahan semua teks seed asli; mempertahankan formatting, URL, brand, escaping dan sanitization HTML. |

Tidak ada perubahan endpoint, schema, migration, authorization, authentication, aset, CSS global, atau section desain lainnya. Hero memakai `HeroSection`, `HeroPanel`, `PageHeroCarousel`, `HeroQuickAccess` dan token terbaru yang sudah tersedia, sehingga tidak diperlukan override CSS SPMB baru. Gambar, gradient, mask dan dekorasi asli tetap dipakai.

## Verifikasi yang dijalankan

- `node --import ./tests/setup.js --test tests/spmb.test.js` pada backend: login/CSRF admin nyata, penolakan mutasi anonim, CRUD persisten MySQL, Draft tidak terbaca anonim, Published terbaca publik, tanggal ISO, statistik agregat tanpa identitas pendaftar, serta cleanup akun/record sementara.
- `node scripts/uji-spmb-api-adapter.mjs`: Published saat sesi admin, akses Draft untuk admin, normalisasi/edit tanggal, settings camelCase dan abort signal.
- `node scripts/uji-spmb-management.mjs` dan `uji-spmb-information.mjs`: validasi payload, sumber, URL, urutan, tanggal WIB/countdown, kuota nullable, dan pemilihan gelombang.
- `node scripts/uji-spmb-translation.mjs`: seluruh judul/deskripsi seed migration 012, ID/EN, rich text, URL/format, entitas biasa/numerik/non-breaking space, dan escaping HTML.
- `node scripts/uji-spmb-restoration-browser.mjs`: browser Chrome dengan API Express dan MySQL lokal sebenarnya; login Admin Panel, tambah/edit/Published/Draft/hapus, edit tanggal melalui input admin, sinkronisasi focus, dan isolasi Draft pada halaman publik dalam sesi admin. Tidak memakai intercept/mock API untuk uji ini.
- Pengaturan Admin diuji melalui UI: tahun ajaran `2030/2031` dan status Ditutup tersimpan, terbaca ulang dari database, lalu muncul pada hero/status publik. Nilai awal `2027/2028` dan Dibuka dikembalikan melalui UI.
- 14 kombinasi ID/EN pada 1920, 1440, 1280, 1024, 820, 390 dan 320 px; route/reload, navigasi desktop/mobile dan anchor Alur. Tidak ada overflow horizontal atau page error. Screenshot desktop/tablet/mobile ditinjau.
- Perbandingan dengan Jurusan: tinggi panel sama, 462 px pada 1280–1920 px dan 542 px pada 1024 px. Ukuran heading sama. Jarak CTA ke floating cards 114,75 px (ID desktop), 78,27 px (EN desktop), dan lebih dari 134 px pada 1024 px.
- `uji-official-spmb-browser.mjs`: 68 kombinasi route/bahasa/viewport dan 11 redirect portal lama tanpa meneruskan token. Portal pendaftaran resmi tetap terpakai.
- ESLint, `hero:uji`, `bahasa:uji` (81 rendered views), `richtext:uji`, build CI, SEO prerender dan `seo:uji -- --offline` dijalankan. Pemeriksaan final menghasilkan 101 halaman HTML dan memeriksa metadata, schema, landmark, aset, sitemap, robots serta OG.
- Review independen tidak menemukan masalah tambahan setelah perbaikan entity escaping.

Bukti lokal: `outputs/spmb-restoration/results.json`, screenshot `spmb-ID/EN-width.png` dan versi full, serta `build-final.log`. Hasil build offline adalah artefak pengujian CI dan tidak untuk deploy.

## Batas hasil

- Database lokal `127.0.0.1` mula-mula tidak memiliki informasi SPMB atau akun admin. Uji browser memakai 20 record sumber asli migration 012 dan akun QA sementara pada database lokal, bukan data screenshot fiktif. Semua record/akun QA dibersihkan; tidak menambahkan fallback dummy ke aplikasi. Konten produksi perlu sudah tersimpan/Published pada backend produksi.
- Database/deployment produksi dan sinkronisasi lintas perangkat fisik tidak diperiksa atau diubah. Tidak submit pendaftaran nyata atau mengirim WhatsApp.
- Kontak WhatsApp asli tetap `spmbInfo.js`, bersumber dari pengumuman sekolah. History/schema/form asli tidak mempunyai field admin WhatsApp khusus; tidak dibuat pengaturan baru dan tidak diklaim bahwa kontak tersebut dikelola dari Admin Panel.
- Backend existing hanya menyimpan satu bahasa untuk judul/deskripsi. Seluruh konten seed asli memiliki padanan Inggris dan rich text memakai kamus existing. Teks admin baru yang belum ada dalam kamus tetap ditampilkan sebagaimana sumber; terjemahan otomatis atau kolom bahasa baru tidak dibuat.
- Angka 150 dan tanggal/countdown contoh pada screenshot tidak dipakai sebagai data produksi. Total pendaftar berasal dari agregat database; tanggal yang belum tersimpan tetap empty state.
- Perubahan `.gitignore` dan file untracked milik pengguna dipertahankan di luar commit tugas ini.
- PR ditargetkan ke `fix/hero-consistency-audit`, yang telah menerima PR #133. `main` saat pemeriksaan masih `f0db2c9` dan belum memuat seluruh perubahan hero tersebut; basis ini menjaga PR pemulihan hanya berisi perubahan SPMB. Tidak merge atau deploy.
