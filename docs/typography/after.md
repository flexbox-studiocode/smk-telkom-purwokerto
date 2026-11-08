# Laporan tipografi Figma

Audit MCP mencatat 33 frame berteks dan 185 kombinasi gaya. Nilai sumber dan audit awal per komponen ada di [inventaris Figma](figma-all-frame-styles.json), [audit umum](README.md), [audit akademik](academics-before.md), [audit fasilitas dan konten](content-facilities-before.md), serta [pengukuran sebelum perubahan](verification-before.md). Baseline kode adalah `fa6fb19`.

## Before dan after

| Area | Sebelum | Sesudah |
|---|---|---|
| Pemuatan font | 18 sampel CDP yang meminta Plus Jakarta Sans aktualnya memakai Inter | Plus Jakarta Sans terdaftar dengan nama kanonis dan aset WOFF2 asli |
| Hero Beranda | Poppins 30 px, 800, line-height 36 px, tracking −0,75 px | Plus Jakarta Sans 30,4 px, 800, line-height normal, tracking +1,52 px pada 1847 px. Dua baris sesuai komposisi Figma |
| Hero Ekstrakurikuler | Poppins 32 px, 800, tracking −0,8 px | Poppins 35,264 px, 600, line-height normal, tracking +1,7632 px pada 1847 px. Judul ID satu baris dan statistik tetap terlihat |
| Navigasi, CTA, footer | Gaya Inter dan Poppins generik, dengan ukuran dan bobot yang berbeda dari desain | Plus Jakarta Sans dengan peran tersendiri untuk tautan, CTA, bahasa, judul dan isi footer. Tracking desktop sempit disesuaikan untuk label EN |
| Profil, guru, jurusan, prestasi | Beberapa judul, label dan kartu mewarisi font dan bobot generik | Ukuran, bobot, tracking dan line-height diterapkan per peran. Poppins dipertahankan untuk hero guru, Ekstrakurikuler dan metode belajar profil |
| Fasilitas, School Tour, Kalender | Gaya generik pada filter, label dan judul | Poppins untuk peran fasilitas dan kalender yang memakai Poppins di Figma. Inter untuk CTA School Tour dan breadcrumb aktif profil |
| Berita, BKK, pengumuman, Nexa | Family dan hierarki teks memakai default lama | Family publik kanonis dan gaya per peran untuk layar referensi, termasuk card dan filter BKK/pengumuman. Teks yang menjadi bagian dari artwork Nexa mengikuti aset yang tersedia |
| Digital Innovation dan marquee | Alias Jakarta terpisah, judul Innovation lebih rapat | Jakarta kanonis. Digital Innovation berbobot 600 dengan tracking 0. Marquee memakai ukuran SVG 48 px dan bobot 800 |
| Admin | Inter/Poppins dari default global | Jakarta di shell, login, dan layar Informasi SPMB. Ukuran login mengikuti desain aplikasi yang ada |

Peran tipografi sumber dipetakan ke lebar kontainer yang tersedia. Contohnya, judul Beranda Figma berukuran 48 px pada frame 1847 px. Website pada viewport yang sama memakai kolom hero sekitar 397 px, sehingga ukuran 30,4 px diperlukan untuk mempertahankan pemisahan dua baris. Gaya heading dan body disesuaikan per peran, dengan pengecualian untuk detail artikel, dialog dan login yang tidak memiliki frame padanan.

## Font dan token

| Token | Nilai |
|---|---|
| `--font-jakarta` | Plus Jakarta Sans 200–800, lalu Jakarta Fallback, Arial, sans-serif |
| `--font-poppins` | Poppins 300/400/500/600/700/800, lalu Arial, sans-serif |
| `--font-inter` | Inter 100–900, lalu Arial, sans-serif |
| `--text-figma-display` | `clamp(1.5rem, 6.209cqw, 6rem)` |
| `--text-figma-page` | `clamp(1.75rem, 2.755cqw, 3rem)` |
| `--text-figma-section` | `clamp(1.5rem, 2.296cqw, 2.5rem)` |
| `--text-figma-card` | `clamp(1rem, 1.378cqw, 1.5rem)` |
| `--text-figma-body` | `clamp(.875rem, .918cqw, 1rem)` |
| `--text-figma-label` | `clamp(.75rem, .861cqw, .9375rem)` |
| `--tracking-figma-heading`, `--tracking-figma-copy`, `--tracking-figma-label` | `.05em`, `.12em`, `.08em` |

Semua font menggunakan aset WOFF2 lokal berlisensi SIL Open Font License. Satu file Jakarta Latin sebesar 27.348 byte dipreload. Fallback Arial memakai penyesuaian metrik berdasarkan aset. `font-display: swap` menjaga teks terbaca selama pemuatan. Jaminan FOUT dan CLS pada seluruh kondisi jaringan memerlukan pengukuran produksi.

## Screenshot pembanding

Ketiga gambar diambil pada lebar 1847 px dan dipotong pada tinggi 1100 px. Perbedaan lebar kontainer, foto, dan isi antara Figma dan situs tampak di gambar.

- [Frame Figma](screenshots/figma-home-hero.webp)
- [Website sebelum perubahan](screenshots/home-before.webp)
- [Website setelah perubahan](screenshots/home-after.webp)

## Verifikasi

- Pemeriksaan 78 kombinasi pada 13 rute publik dengan lebar 1847, 768 dan 375 px dalam ID/EN. Pada putaran awal, statistik Ekstrakurikuler terpotong pada dua kombinasi desktop. Putaran setelah koreksi lulus untuk 12 kombinasi Beranda dan Ekstrakurikuler, termasuk dua kasus tersebut. Pemeriksaan mencakup computed styles, font aktual melalui CDP, overflow, clipping dan urutan heading.
- Sebanyak 12 kombinasi desktop sempit di Fasilitas, 20 pemeriksaan geometri hero pada lebar 1024–1847 px, dan 16 pemeriksaan dropdown desktop/mobile lulus.
- Sebanyak 24 sampel kartu atau detail berita, prestasi, dan pengumuman memakai fixture lokal. Empat pemeriksaan login dan Informasi SPMB admin memakai fixture sesi dalam ID pada lebar 1847 dan 375 px.
- Pengujian browser terpisah mengonfirmasi Text Reveal berprogres hingga selesai saat digulir, reel bergerak, dan teks tetap terlihat pada reduced motion.

- Lint, typecheck dan seluruh rangkaian `bahasa:uji` lulus. Fixture tes bahasa mengikuti WaveMarquee aktif dan cookie CSRF simulasi.
- Build produksi Vite, `CI=true npm run build:ci`, serta verifikasi SEO offline untuk 100 HTML lulus. Build CI memakai data feed kosong.
- Tes scroll umum mencakup 22 skenario. Delapan penempatan hero, lifecycle reel GSAP, geometri dan kontinuitas wave juga lulus.
- Tes siklus reel mengamati lima siklus di desktop dan ponsel, serta frasa utuh pada mode reduced motion. Asersi reset Text Reveal di skrip motion lama gagal sama pada baseline dan branch. Skrip lama untuk urutan marquee profil juga masih mengharapkan komponen yang sudah dipindah atau diganti di baseline.
- API produksi, sesi admin nyata, Web Vitals produksi dan rilis Vercel pascamerge berada di luar verifikasi ini.

Perubahan dikelompokkan menjadi audit sebelum implementasi, font dan token, navigasi/footer/CTA, grup halaman, verifikasi responsif, serta dokumentasi. Daftar lengkap file dan commit tersedia pada tab Files changed dan Commits di pull request.
