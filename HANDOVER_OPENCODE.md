# Handover SMK Telkom Purwokerto untuk OpenCode

Tanggal: 2 November 2026, Asia/Jakarta.
Dokumen ini merangkum konteks percakapan dan pemeriksaan repository pada tanggal tersebut. Status kode/Git diperiksa ulang saat penulisan; hasil pengujian dan perubahan hosted yang disebut sebagai pengujian sebelumnya berasal dari pekerjaan dalam sesi ini, bukan pengujian ulang saat membuat dokumen.

## 1. Baca ini sebelum bekerja

- Repository aktif: `D:/LombaTelkom/smk-telkom-purwokerto`.
- Aplikasi aktif: `D:/LombaTelkom/smk-telkom-purwokerto/frontend`. Jangan menjalankan npm dari `D:/LombaTelkom` atau mengedit salinan project lain.
- Ini website tim sekolah, bukan project kosong. Pertahankan section, aset, teks, i18n, routing, backend, dan design system yang sudah benar. Ubah hanya scope permintaan pengguna.
- Pengguna meminta Bahasa Indonesia, penjelasan singkat, dan tidak memakai asterisk untuk bold/italic. Panggilan aman: Rainer; profil instruksi terakhir menyebut panggilan Reiner. Hindari memperdebatkan ejaan nama; tidak perlu memakai sapaan nama.
- Kerjakan permintaan secara konkret; jangan sekadar memberi rencana. Jangan meminta password/token melalui chat.
- Gunakan atomic commit: pisahkan perubahan fitur, perbaikan bug, dan dokumentasi bila memang terpisah. Commit/push pada pekerjaan sebelumnya sudah diminta pengguna dan memakai akun miliknya. Jangan otomatis merge atau deploy hanya karena commit sudah di-push; ikuti permintaan berikutnya.
- Jangan `git add .`, reset hard, clean, menghapus output, memindahkan folder besar, mengubah role admin, atau menjalankan ulang migration tanpa audit.
- Jangan menganggap semua catatan README lama sebagai kondisi terkini. Lihat bagian koreksi dokumentasi di bawah.
- Jangan menyalin kredensial dari `.env`, browser storage, atau session ke dokumen, log, commit, maupun chat. Dokumen ini sengaja tidak memuat password, token, atau nilai API key.

## 2. Status Git yang telah diverifikasi

| Item | Kondisi saat handover |
| --- | --- |
| Branch lokal aktif | `feat/home-hall-of-fame` |
| HEAD lokal | `5fedbd2` — restore original school wordmark in navbar |
| Remote main setelah fetch | `71df5746339f08843d12350ab41596d05071a749` |
| Perbedaan isi HEAD terhadap origin/main | `git diff --stat HEAD origin/main` kosong; perbedaannya hanya riwayat merge |
| Main lokal | Masih `bce1e2d`, tertinggal; jangan menjadikannya baseline tanpa fetch/update |
| Working tree tracked | Bersih sebelum pembuatan dokumen handover ini |
| Open PR | Tidak ada saat diperiksa memakai GitHub CLI |
| Branch fitur hosted | `ls-remote` tidak lagi menemukan dua branch fitur terbaru; branch lokal dan tracking ref lama dapat tetap ada |

Remote `origin` masih memakai URL lama `https://github.com/KiandrAHD/smk-telkom-purwokerto.git`; GitHub mengarahkan ke repository saat ini:
https://github.com/flexbox-studiocode/smk-telkom-purwokerto

Akun GitHub CLI pada pekerjaan sebelumnya: `Constanvel`. Git author lokal: `Rainer`. Verifikasi kembali identitas aktif sebelum push; jangan menciptakan identitas baru.

PR yang sudah merged, diverifikasi saat membuat handover:

| PR | Isi |
| --- | --- |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/72 | Wave marquee dan horizontal innovation loop |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/73 | Integrasi scroll word reveal berbasis Framer Motion |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/74 | Perbaikan artwork hero bagian atas |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/75 | Pengaturan admin tersambung Supabase |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/76 | Hall of Fame Beranda dan batas ukuran logo |
| https://github.com/flexbox-studiocode/smk-telkom-purwokerto/pull/77 | Mengembalikan logo navbar beserta tulisan sekolah |

Ada worktree lain `D:/LombaTelkom/merge-public-design` pada branch `fix/resolve-public-design-conflicts`. Jangan mengubah atau menghapusnya tanpa kebutuhan yang jelas.

Folder untracked existing di root meliputi `Telkom/` dan sejumlah `outputs/`: banner-badges, campus-sync, carousel-sync, detail-jurusan, guru-grid-sync, hero-carousel, kalender-pendidikan, motion-redesign, prestasi-ci, refinement-sync, screenshots-website dan zip-nya. Ini sudah ada sebelum handover. Jangan ikut commit atau hapus. Gunakan `git status` untuk daftar aktual.

Dokumen ini dibuat sebagai artefak lokal handover. Pembuatan dokumen tidak sekaligus berarti sudah di-commit/push.

## 3. Menjalankan project

```powershell
Set-Location 'D:/LombaTelkom/smk-telkom-purwokerto/frontend'
# Hanya jika dependency belum tersedia atau lockfile berubah:
npm.cmd ci
npm.cmd run dev
```

URL lokal yang dipakai: `http://localhost:5173/`. Sebelum menyalakan server baru, periksa proses/port existing agar tidak muncul server duplikat atau port 5174 yang membuat pemeriksaan salah target. Pada pekerjaan sebelumnya pernah ada listener IPv4 dan IPv6 berbeda di port 5173; pastikan browser membuka checkout yang dimaksud.

Gunakan `npm.cmd` bila PowerShell memblokir `npm.ps1`. Node yang dipakai dalam pengujian sebelumnya adalah v24.16.0; ini catatan lingkungan pengujian, bukan deklarasi minimum versi project.

Environment frontend mengacu ke `frontend/.env.example`:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_TURNSTILE_SITE_KEY
VITE_TURNSTILE_ENABLED
```

Nilai lokal existing jangan ditimpa. Prefix `VITE_` berarti data dapat masuk bundle browser. Service-role dan provider AI secrets tidak boleh memakai prefix ini. Pengaturan server STELA/NextTel ada pada Supabase Edge Function secrets atau konfigurasi lokal yang diabaikan Git; baca dokumentasi modul sebelum mengubahnya.

## 4. Stack dan struktur

Versi dependency yang tercatat di package.json saat handover:

| Teknologi | Versi deklarasi |
| --- | --- |
| React / react-dom | ^19.2.8 |
| Vite | ^8.2.0 |
| Tailwind CSS | ^4.3.3, plugin @tailwindcss/vite |
| React Router | ^7.18.2 |
| Supabase JS | ^2.111.0 |
| GSAP | ^3.15.0 |
| Framer Motion | ^14.9.0 |
| Lenis | ^1.3.26 |
| TypeScript | ^7.0.2 |

Mayoritas aplikasi memakai JSX/JavaScript dan functional components. `src/components/ui/text-reveal.tsx` memakai TypeScript. `tsconfig.json` saat ini hanya memeriksa file TSX di dalam `src/components/ui`; typecheck lulus tidak berarti seluruh JSX ikut diperiksa.

Tailwind dan CSS existing dipakai bersama; jangan migrasi massal ke framework/style lain. Font, warna merah, layout, dan aset harus mengikuti project. `src/components/ui` mengikuti konvensi shadcn, tetapi project belum diinisialisasi menjadi seluruh sistem shadcn. Tidak perlu menjalankan CLI shadcn untuk perubahan biasa. Import existing menggunakan path relatif; jangan mengasumsikan alias `@/` tersedia.

Peta lokasi utama:

| Path relatif repository | Fungsi |
| --- | --- |
| frontend/src/App.jsx | Routes, lazy pages/providers, redirect lama, metadata |
| frontend/src/main.jsx | StrictMode, BrowserRouter, LanguageProvider, SiteSettingsProvider |
| frontend/src/layouts/MainLayout.jsx | Navbar, main, STELA/CTA bersama, Footer, widget |
| frontend/src/pages/LandingPage.jsx | Susunan Beranda |
| frontend/src/components/Navbar.jsx | Navbar bersama dan wordmark asli |
| frontend/src/components/Footer.jsx | Identitas/kontak publik, supporter, tautan |
| frontend/src/index.css | Style global dan tokens |
| frontend/src/styles/hero.css | Layout hero bersama |
| frontend/src/context | Auth, bahasa, PPDB, settings, state admin legacy |
| frontend/src/services | Layanan Supabase dan AI |
| frontend/src/data/dummyData.js | Banyak konfigurasi/konten existing; namanya tidak berarti semua isinya boleh dibuang |
| frontend/src/utils/publicContent.js | Adapter record backend ke tampilan publik |
| frontend/src/assets | Aset lokal, termasuk aset Figma dan foto |
| frontend/scripts | Pengujian, prerender, optimasi dan audit |
| frontend/docs | Catatan desain, sumber foto, QA, SEO dan modul |
| supabase/migrations | Migration SQL bernomor 001–015 |
| supabase/functions | stela, nexttel, turnstile, helper kuota AI |
| .github/workflows | frontend-ci.yml dan codeql.yml |

STELA memiliki plugin development `frontend/vite-plugin-stela.js`. Jangan menganggap endpoint development adalah endpoint production. Tidak ada folder `frontend/api` pada checkout yang diperiksa.

## 5. Route dan sumber data

Publik: `/`, `/profil-sekolah`, `/profil-sekolah/guru`, `/fasilitas`, `/jurusan`, `/prestasi`, `/bkk`, `/berita`, `/pengumuman`, `/kalender`, `/spmb`, `/stela`, `/nexttel`, `/ekstrakurikuler`, `/galeri`, `/kebijakan-privasi`, serta route detail slug.

Admin: `/login`, `/dashboard`, `/dashboard/berita`, `/dashboard/pengumuman`, `/dashboard/prestasi`, `/dashboard/bkk`, `/dashboard/jurusan`, `/dashboard/spmb`, `/dashboard/informasi-spmb`, `/dashboard/kalender`, `/dashboard/pengaturan`.

Portal penerimaan: `/spmb/daftar`, `/spmb/masuk`, `/spmb/verifikasi`, `/spmb/formulir`, `/spmb/berkas`, `/spmb/selesai`, `/spmb/status`, `/spmb/dokumen-peserta`, `/spmb/atur-sandi`, callback `/auth/confirm` dan `/lupa-sandi`.

URL lama `/ppdb/...` dan `/dashboard/ppdb` memiliki redirect. Pertahankan search/hash dan parameter callback; istilah internal database masih memakai ppdb meskipun URL publik memakai spmb. Jangan melakukan rename global tanpa membaca `utils/admissions.js` dan tes kontraknya.

Data bersifat campuran: CRUD berita/pengumuman/prestasi/BKK, kalender, informasi SPMB, pendaftaran dan settings memakai service Supabase. Sebagian konten/deskripsi/jurusan/alumni masih dari data lokal; Dashboard Jurusan masih memakai state AdminDataContext. Jangan menyebut semua dashboard sudah persistent.

## 6. Beranda dan motion: keputusan yang harus dipertahankan

Susunan komponen Beranda saat ini:

```text
HeroSection → WaveMarquee → AboutSection → RibbonDivider
→ DepartmentsSection → FacilitiesSection → PartnersSection
→ AchievementsSection → HallOfFameSection → InnovationReveal
→ STELA dan CTA dari MainLayout → Footer
```

### Wave marquee

`components/WaveMarquee.jsx`, `utils/waveMarquee.js`, `components/HomeMotion.css`, aset wave-ribbon.svg, wave-rocket.svg, wave-award.svg dan wave-bulb.svg dalam assets/landing.

Pita merah bergelombang memakai SVG textPath. Teks mengikuti path; posisi ikon mengikuti koordinat/tangen path. GSAP menggerakkan fase kontinu dengan ease none dan periode berdasarkan ukuran teks setelah font siap. Urutan: NEXT GENERATION, GLOBAL TECHNOPRENEUR, AKREDITASI A. Jangan menggantinya menjadi marquee lurus atau mengubah pita dekorasi merah pada section lain. Cleanup dan prefers-reduced-motion harus tetap berjalan.

### Text reveal dan Digital Innovation

`components/InnovationReveal.jsx`, `components/ui/text-reveal.tsx`, `components/HomeMotion.css`.

Permintaan awal pernah menyebut vertical rolling, tetapi iterasi pengguna selanjutnya meminta horizontal text loop. Implementasi terbaru yang harus dilanjutkan: reveal per kata melalui Framer Motion/useScroll; GSAP hanya menangani loop horizontal di dalam kotak merah stabil. Hanya frasa “Digital Innovation”, diulang terus; jangan menciptakan daftar frasa baru.

Teks ID: “Bukan sekadar belajar Teknologi”, “Digital Innovation”, “Kami bikin karya nyata”. EN melalui sistem i18n existing. Scroll maju/mundur harus mengubah reveal secara bertahap; reduced motion menampilkan teks utuh dan menghentikan loop. Jangan menyalin demo fixed overlay atau tinggi 200vh ke Beranda.

Dokumen `frontend/docs/qa/text-reveal-horizontal/README.md` merekam tahap sebelum integrasi Framer Motion. Untuk perilaku reveal terkini, baca kode dan `frontend/src/components/ui/README.md`; jangan mengembalikan reveal ke GSAP berdasarkan laporan lama.

### Hero clipping

Penyebab bug sebelumnya adalah object-fit contain pada media desktop yang terlalu sempit dibanding tinggi panel, menghasilkan strip kosong besar di atas artwork. Perbaikan mempertahankan contain dan menghitung lebar kanvas dari tinggi hero serta rasio aset. Jangan mengganti seluruh hero ke cover sebagai perbaikan cepat karena dapat memotong artwork.

Baca `frontend/docs/qa/hero-artwork-clipping/README.md`, `frontend/src/styles/hero.css`, komponen HeroPanel/HeroSection/HeroCarousel/PageHeroCarousel, dan data landingHeroSlides/pageHeroSlides.

Audit browser existing:

```javascript
(await import('/scripts/hero-layout-audit.mjs')).auditHeroLayout(document)
```

### Hall of Fame

Commit `bd0b5d3` menambahkan lazy import komponen `components/prestasi/PrestasiPerjalananSection.jsx` di LandingPage dengan alias HallOfFameSection. Dipasang setelah Prestasi Membanggakan dan sebelum InnovationReveal, dibungkus Reveal existing. Jangan membuat salinan markup/data terpisah.

Sumber data adalah `hallOfFame` dari dummyData, diturunkan dari kisahAlumni. Ada tiga alumni existing, bukan empat kartu dummy bernama sama pada screenshot Figma. Nama/foto harus tetap berpasangan: Moh. Khairudin, Tenia Wahyuningrum, Alfa Putra Kurnia. Desktop menampilkan ketiganya; mobile satu, tablet dua. Kontrol nonaktif bila semua item sudah muat; jangan memaksa tombol aktif atau menduplikasi orang untuk mengisi empat slot.

### Navbar: keputusan terakhir pengguna

Commit `a83d747` membatasi kotak logo menjadi tinggi 46px pada mobile dan 52px desktop. Sebelumnya gambar logo persegi dari settings berubah menjadi 180x180px akibat width tetap + height auto di navbar setinggi 80px.

Permintaan terakhir pengguna secara eksplisit mengembalikan logo beserta tulisan “SMK Telkom Purwokerto” seperti dulu. Commit `5fedbd2` membuat Navbar selalu memakai aset lokal `assets/landing/beranda-navbar-logo.png` (257x74). Hook SiteSettings di Navbar dihapus. Jangan memasang kembali settings.logo_url ke navbar tanpa menangani wordmark dan tanpa permintaan baru.

Class gambar saat handover: h-[2.875rem], w-40, object-contain, object-left, lg:h-[3.25rem], lg:w-[11.25rem]. Logo settings tetap berlaku pada komponen Logo, footer dan preview admin; pengecualian navbar ini memang keputusan terbaru pengguna.

## 7. Supabase dan Pengaturan Admin

Project sekolah: `jxrcbkseudollokdtfxy`.
Dashboard organisasi: https://supabase.com/dashboard/org/tzpkvpqhjqxxangfrfqr
Dashboard proyek: https://supabase.com/dashboard/project/jxrcbkseudollokdtfxy
URL API publik: https://jxrcbkseudollokdtfxy.supabase.co

Akun Supabase yang terhubung sebelumnya bernama Constanvel dan awalnya belum mendapat akses organisasi sekolah. Pengguna kemudian memberi akses melalui dashboard. Jangan mengira sesi login browser atau MCP milik Codex otomatis tersedia pada OpenCode. Minta pengguna login sendiri bila diperlukan, tanpa meminta kredensial di chat.

Auth admin: `context/AuthContext.jsx` dan `router/ProtectedRoute`. Supabase Auth user harus memiliki relasi pada public.admins. `public.is_admin()` adalah guard server/RLS. Jangan hanya mengandalkan frontend.

Nama admin yang disimpan atas instruksi pengguna: “Admin SMK Telkom Purwokerto”. Email yang sudah ada dipertahankan; password tidak diubah, role tidak diubah.

Tabel utama: admins, berita, pengumuman, prestasi, bkk, ppdb, ppdb_drafts, events, spmb_information, site_settings. Ada juga struktur kuota AI dan counter; baca migration untuk detail lengkap, jangan mengandalkan daftar ini sebagai dump schema.

Migration:

| Nomor | Tujuan ringkas |
| --- | --- |
| 001 | Initial schema, RLS, admins dan storage |
| 002–005 | Identitas/ownership PPDB, unique submission, drafts, application fields |
| 006–008 | Guard upload/input/dokumen PPDB dan kuota percobaan AI |
| 009 | Visitor counter |
| 010–011 | Calendar events dan kategori |
| 012 | Informasi SPMB |
| 013 | Instagram URL prestasi |
| 014 | Site settings singleton, RLS admin, revision, guard penutupan SPMB |
| 015 | Validasi URL settings lebih ketat |

Migration 014 dan 015 sudah diterapkan pada hosted project sekolah melalui SQL Editor dan dicatat dalam supabase_migrations.schema_migrations pada sesi ini. Jangan menjalankannya ulang membabi buta. Sebelum migration berikutnya, periksa riwayat hosted dan perubahan yang dibuat anggota tim.

Berkas inti fitur Pengaturan:

```text
frontend/src/pages/dashboard/PengaturanPage.jsx
frontend/src/services/siteSettingsService.js
frontend/src/utils/siteSettings.js
frontend/src/context/SiteSettingsContext.jsx
frontend/src/hooks/useUnsavedSettings.js
frontend/src/context/AuthContext.jsx
frontend/src/components/dashboard/DashboardHeader.jsx
supabase/migrations/014_site_settings.sql
supabase/migrations/015_settings_url_validation.sql
docs/admin-settings-verification.md
```

Profil Sekolah mengedit nama, NPSN, alamat, telepon, email, website dan logo; Pengaturan Umum mengedit tahun ajaran, status SPMB dan jumlah berita; Akun Admin mengedit full_name dan email melalui Auth. Role readonly. Modal menampilkan ringkasan sebelum/sesudah, Batal tidak menyimpan, Konfirmasi melakukan request backend, tombol terkunci selama save.

site_settings memiliki satu row id boolean true. Public SELECT hanya data profil/operasional yang memang publik. Authenticated hanya boleh UPDATE kolom allowlist jika is_admin. Revision dan updated_at ditangani trigger; UPDATE menggunakan revision awal agar konflik tidak menimpa data baru. Service melakukan readback dan verifikasi sebelum memberi notifikasi sukses.

Perubahan nama akun disimpan ke Auth user_metadata.full_name, bukan role atau sekadar React state. Email memakai auth.updateUser dan status pending dibandingkan dengan hasil getUser. Callback Auth ditunda ke task berikutnya sebelum query admin agar tidak tertahan lock Auth pada updateUser/token refresh.

Guard draf mencakup anchor, back, beforeunload dan event canLeaveSettings untuk pencarian header serta logout, dipanggil sebelum signOut. Busy state menolak navigasi terkait.

SiteSettingsProvider memperbarui data saat load, event save, storage event antar-tab, focus, dan polling 60 detik. Binding publik: Logo/footer/kontak/website, jumlah berita, tahun/status SPMB. Navbar memakai wordmark lokal sesuai keputusan terakhir. Penutupan SPMB juga dijaga trigger INSERT ppdb dan pengecekan service sebelum signup/submission.

Nilai hosted terakhir yang benar-benar dibaca pada sesi implementasi: tahun 2027/2028, SPMB dibuka, berita 5, revision 6, logo tersimpan, RLS aktif. Nilai ini dapat berubah oleh admin setelahnya; jangan menjadikannya nilai wajib pada produksi.

Storage existing:

- content-images public read, admin-only write; logo memakai folder school-logo. Gunakan contentImageService/imageFile helper existing untuk validasi dan cleanup upload.
- ppdb-documents private, dokumen memakai path submissions/<auth_user_id>/document.pdf. Jangan memakai getPublicUrl untuk dokumen peserta. Gunakan signed URL sesuai service existing.

## 8. Verifikasi dan batas bukti

Pada pekerjaan terbaru, bukan saat menulis handover, pengujian berikut sudah lulus:

- Settings form → hosted Supabase → readback; berita 5→6 bertahan sesudah refresh, lalu dipulihkan 5.
- Tab publik ikut menampilkan 6 dari 13 berita, lalu kembali 5 melalui update settings.
- Logo sekolah existing berhasil diunggah melalui form, URL disimpan, fetch gambar 200, preview/publik memuat gambar.
- Nama admin disimpan ke Auth, tampil di header, tetap ada sesudah refresh dan pengguna logout/login ulang.
- NPSN abc ditolak; pembatalan modal tidak menyimpan; save mengunci tombol.
- REST anon UPDATE ditolak, revision tidak berubah. Hosted SQL role authenticated dengan sub non-admin menghasilkan nol update dalam transaksi yang di-rollback. Ini bukan login browser memakai akun siswa.
- Tes SQL lokal PGlite menguji constraints, admin/non-admin, reopen persistence, stale revision dan closed SPMB. Tes ini tidak mensimulasikan seluruh Auth/Storage hosted.
- Tes service memakai boundary mock untuk network rejection/readback mismatch/konflik/email pending; jangan menyebutnya pemutusan jaringan production.
- Hall of Fame diperiksa pada 390, 768, 1440px: tanpa horizontal overflow, foto benar, carousel kembali ke awal setelah tiga next pada mobile, keyboard bekerja, ID/EN bekerja. Halaman Prestasi tetap menampilkan komponen yang sama.
- Navbar wordmark asli sudah diperiksa visual setelah refresh, image loaded dan ukuran desktop 180x52 dalam header. Batas ukuran logo sebelumnya diperiksa pada mobile/tablet/desktop.
- Lint dan production build terakhir pada 5fedbd2 lulus, termasuk prerender 146 route publik. Typecheck lulus pada pekerjaan settings sebelumnya; perubahan navbar terakhir tidak menyentuh TSX.

Batas yang tetap harus dinyatakan:

- Perubahan email nyata dan penyelesaian tautan konfirmasi email baru belum diuji; alamat admin dipertahankan. Jangan mengklaim email delivery sudah berhasil.
- Pengujian responsive memakai viewport browser, bukan perangkat fisik/Safari.
- Pengujian aplikasi latest dilakukan dari localhost terhadap backend hosted. Status merge sudah diperbarui saat handover, tetapi deployment production dan hasil UI production setelah PR #77 belum diperiksa ulang.
- Ada tes lama yang bisa merekam kontrak tahap desain terdahulu. Jika gagal, baca assertion dan callsite; jangan mengubah fitur di luar scope demi memaksa semua tes hijau.

Perintah dasar dari frontend:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run ppdb:uji
node scripts/uji-admin-settings.mjs
node scripts/uji-site-settings-service.mjs
node scripts/uji-settings-navigation.mjs
node scripts/uji-site-settings-hosted.mjs
node scripts/uji-innovation-layout.mjs
node scripts/uji-wave-marquee.mjs
npm.cmd run animasi:uji
npm.cmd run bahasa:uji
```

Pilih tes sesuai scope; tidak semua perintah di atas dijalankan ulang pada commit terakhir. Tes hosted membutuhkan environment ke proyek yang benar; baca skrip sebelum menjalankannya. Skrip hosted settings sekarang melakukan SELECT, mencoba no-op UPDATE anonim yang harus ditolak, memeriksa revision tetap, lalu fetch logo.

Tes database settings lokal:

```powershell
# Runtime PGlite yang dipakai pada mesin ini; pastikan masih tersedia:
$env:PGLITE_MODULE='D:/LombaTelkom/outputs/security-p0-p1-2026-10-04/db-runtime/node_modules/@electric-sql/pglite/dist/index.js'
node scripts/uji-site-settings-db.mjs
```

SQL test membuat fixture database lokal; bukan alasan untuk menjalankan fixture di Supabase produksi.

## 9. Build, SEO dan deployment

Production yang pernah dipakai: https://smk-telkom-purwokerto.vercel.app/
Situs sekolah sumber konten: https://smktelkom-pwt.sch.id/

`npm run build` bukan hanya vite build: juga menjalankan scripts/prerender-seo.mjs, mengambil konten yang diperlukan dan menghasilkan HTML route publik, sitemap, robots serta OG image. Koneksi backend dapat memengaruhi tahap prerender. Jangan hanya melihat pesan vite built lalu mengklaim seluruh build selesai; tunggu exit code dan pesan SEO.

`build:ci` memakai prerender --offline dan dibatasi untuk CI non-Vercel. Jangan deploy output offline sebagai production. `frontend/vercel.json` memakai rewrite SPA ke `/app.html` dan header cache; jangan mengganti rewrite ke index.html tanpa memahami prerender dan route privat.

SEO metadata ada di utils/seo.js dan komponen detail; pertahankan canonical/noindex untuk login/dashboard/portal. Status push, merge, deployment Vercel, dan hasil Google crawl adalah empat hal berbeda. Jangan mengklaim production terbarui atau hasil Google berubah hanya dari git push.

## 10. Referensi desain dan bukti lokal

Figma pengguna:
https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=261-1476&m=dev

Node ini mencakup kanvas besar berisi banyak versi. Pada pekerjaan Hall of Fame, get_design_context mengembalikan pesan layer belum dipilih meskipun nodeId diberikan; screenshot MCP berhasil. Jangan mengaku telah membaca properti detail dari context yang gagal. Hall of Fame dipasang memakai komponen Prestasi existing dan screenshot pengguna, bukan menduplikasi contoh alumni Figma.

Session/tool/browser milik Codex tidak menjadi bagian dari handover OpenCode. Jika OpenCode memiliki Figma MCP, ikuti skill/workflow connector yang tersedia di sana; akses read tidak berarti izin mengubah desain Figma.

Dokumen yang layak dibaca:

- docs/admin-settings-verification.md — rincian pengujian settings; catatan navbar dynamic di sana adalah kondisi sebelum keputusan wordmark terakhir.
- frontend/src/components/ui/README.md — integrasi Framer Motion terkini.
- frontend/docs/qa/hero-artwork-clipping/README.md — root cause dan audit hero.
- frontend/docs/qa/text-reveal-horizontal/README.md — histori horizontal loop; sebagian reveal sudah diperbarui oleh PR #73.
- frontend/docs/asset-image-sources.json — asal gambar; pertahankan pasangan identitas dan foto.
- frontend/docs/campus-explorer.md, standar-hero.md, agenda-spmb-admin.md, manajemen-kalender.md, audit-seo.md — sesuai modul yang akan dikerjakan.

Bukti implementasi lokal di luar root repository:

```text
D:/LombaTelkom/outputs/admin-settings-2026-11-02/account-readback.png
D:/LombaTelkom/outputs/admin-settings-2026-11-02/database-readback.png
D:/LombaTelkom/outputs/home-hall-of-fame/desktop.png
D:/LombaTelkom/outputs/home-hall-of-fame/mobile.png
D:/LombaTelkom/outputs/home-hall-of-fame/navbar-wordmark.png
```

Desktop Hall of Fame pada screenshot desktop.png masih memakai navbar icon-only sebelum permintaan wordmark terakhir. Navbar-wordmark.png adalah bukti tampilan navbar yang terbaru. Log build di root repository outputs/admin-settings-build.log, outputs/home-hall-of-fame-build.log, outputs/navbar-wordmark-build.log.

## 11. Koreksi terhadap dokumentasi lama

- README root masih mengatakan tidak memakai Framer Motion: sudah tidak benar; dependency dan komponen terbaru memakainya.
- README root masih menyebut Pengaturan memakai AdminDataContext: sudah tidak benar untuk PengaturanPage terbaru; sekarang menggunakan Supabase.
- README root memuat route dashboard/ppdb lama; App.jsx adalah acuan routing terkini dengan dashboard/spmb dan redirect legacy.
- supabase/README masih berhenti pada migration 012; repository sudah sampai 015.
- Laporan settings lama menyebut logo navbar mengikuti settings. Keputusan terakhir pengguna mengembalikan wordmark lokal, sehingga Navbar menjadi pengecualian.
- Laporan lama yang menyebut belum merged adalah status saat laporan dibuat. Saat handover, PR #72–#77 sudah merged; deployment belum diverifikasi ulang.

## 12. Cara melanjutkan di OpenCode

Tidak ada permintaan implementasi yang masih menggantung dari tiga pekerjaan terakhir: settings, Hall of Fame dan pemulihan wordmark sudah selesai pada kode serta masuk remote main. Jangan mengulang implementasi atau otomatis merancang ulang halaman.

Urutan awal yang disarankan:

1. Baca dokumen ini, instruksi pengguna, dan AGENTS.md jika tersedia di lingkungan OpenCode.
2. Pastikan root dan git status; jangan mengganggu folder untracked atau worktree lain.
3. Fetch main dan cek history. Main lokal tertinggal; gunakan baseline origin/main untuk pekerjaan baru setelah memastikan perubahan lokal aman. Jangan reset/force push.
4. Baca file yang relevan dengan permintaan berikutnya, termasuk caller/service/test. Konfirmasi dari kode mana yang persistent dan mana yang masih lokal.
5. Kerjakan scope kecil, gunakan komponen/token/data existing, dan uji perilaku yang berubah.
6. Laporkan file, alasan perubahan, hasil tes aktual, batas bukti dan status commit/push/deploy secara terpisah.

Prompt pembuka yang bisa diberikan ke OpenCode:

> Baca HANDOVER_OPENCODE.md sampai selesai dan periksa git status serta origin/main sebelum mengedit. Ini project React/Vite sekolah existing, bukan project baru. Pertahankan keputusan terbaru navbar wordmark, Hall of Fame shared component, motion, i18n dan Supabase/RLS. Jangan tampilkan secrets atau menghapus folder untracked. Ringkas kondisi aktual dan tunggu permintaan berikutnya sebelum membuat perubahan fitur baru.
