# Audit tipografi per frame

Acuan kode adalah `7394403`, setelah PR #123 digabung. Figma MCP menginventarisasi 108 frame layar berteks di empat halaman, dengan 10.424 layer berstatus terlihat dan 10.714 segmen font. Ada 89 kombinasi gaya dari family, nama face, ukuran, bobot, line-height, tracking, perataan, dan pengaturan wrapping. Inventaris ini mengukur gaya tipografi. [File Figma](https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=343-799&m=dev)

Jika frame menunjukkan revisi atau varian yang bertentangan untuk rute yang sama, halaman `Font` menjadi acuan pertama. Frame yang lebih spesifik digunakan untuk bagian yang tidak ada di `Font`. Contohnya, judul hero Pengumuman mengikuti `305:1340` dari `305:1331` dan label FAQ Beranda tetap mengikuti `344:800`. Inventaris di akhir laporan membedakan rujukan, varian, dan arsip.

## Tahapan dan hasil

| Kelompok | Rujukan | Perbandingan dan koreksi |
|---|---|---|
| Beranda, Profil, Guru, Fasilitas, Ekstrakurikuler, Jurusan, Prestasi, BKK | 17 frame pada `343:799` | Pemeriksaan browser mengulang verifikasi per section dari PR #123. Hero memakai Jakarta atau Poppins sesuai frame. Pengecualian Inter pada breadcrumb dan CTA Fasilitas tetap terukur. Breadcrumb induk pada hero yang relevan mengikuti bobot dan tracking yang sama dengan perannya di Figma. |
| Berita | `231:16851` | Breaking news memakai Jakarta 600 untuk label dan 500 untuk tanggal. Sorotan dan trending memakai 800 pada judul/label/CTA, dengan 500 pada tanggal dan deskripsi. Metadata kartu, pencarian dan urutan memakai 500. CTA baca dan muat memakai 800. Tombol newsletter memakai 600. |
| Pengumuman dan Kalender | `305:1331`, `200:901` dan varian yang tercatat | Judul hero Pengumuman memakai Poppins 700, tracking 2% dan rasio line-height 65/55. Breadcrumb aktif keduanya memakai Inter 800. Kalender mempertahankan Poppins 600 pada hero, Poppins pada judul bagian, dan Jakarta pada kontrol serta teks agenda sesuai peran. |
| Detail RPL, TKJ, TJAT, dan PG | `225:10916`, `225:11486`, `225:11972`, `225:12486` | Breadcrumb aktif Inter 800, judul hero Jakarta 800 dan tracking 5%. Paragraf pengantar, fakta dan atribusi memakai Arimo; kutipan memakai Arimo Bold Italic 700. Judul Fasilitas Pendukung dan Perjalanan Tiga Tahun Poppins 700. Judul kartu dan judul kelas Jakarta 800. |
| NextTel | `280:1884`, `280:2041` hingga `280:3206` | Intro memakai Inter pada breadcrumb aktif dan Jakarta 700 pada deskripsi dan CTA yang terlihat di frame. Progress, instruksi, pertanyaan, navigasi dan judul hasil Jakarta 800. Opsi dan tabel skor Jakarta 700. Penjelasan hasil mengikuti Jakarta 800. |
| Informasi SPMB admin | `198:782` | Shell, label menu dan judul dibandingkan dengan teks yang dapat dibaca di frame. Tabel dan kartu yang berupa gambar di frame tidak menyediakan metrik font yang dapat diukur. |
| SPMB publik | `183:358`, `221:10192`, `261:12716` | Frame dipetakan ke alur penerimaan lama. Rute lokal mengarah ke portal resmi Telkom Schools. Tipografi domain tersebut berada di luar implementasi situs ini. |

Arimo menggunakan dua berkas WOFF2 asli yang tersedia dari Google Fonts, total 32.524 byte. Berkas normal 400–700 dan bold italic 700 berlisensi SIL OFL dan dimuat melalui CSS halaman detail jurusan. Play dan Podkova hanya muncul sebagai glyph dekoratif yang direpresentasikan oleh ikon. [Arimo dan lisensinya](https://github.com/google/fonts/blob/main/ofl/arimo/OFL.txt)

## Verifikasi

- Bundle produksi lokal lulus 99 skenario browser. Sebanyak 16 rute publik diuji dalam Bahasa Indonesia dan Inggris pada lebar 375, 768, dan 1847 px. Informasi SPMB admin diuji dalam Bahasa Indonesia pada ketiga lebar.
- Pemeriksaan browser lulus untuk peran tipografi yang diuji, clipping, overflow halaman dan navigasi. Chrome mengonfirmasi bahwa dua face Arimo benar-benar merender teks yang ditargetkan di empat detail jurusan.
- NextTel lulus 66 skenario terarah yang mencakup 11 state dalam dua bahasa pada tiga lebar. Pengujian animasi mencakup 22 kasus, termasuk Text Reveal dan Digital Innovation.
- Lint, typecheck, build produksi lokal dalam mode CI, audit SEO offline (100 halaman), tes bahasa, penempatan hero dan NextTel bilingual lulus.

Perbandingan desktop memakai potongan hero Pengumuman, detail RPL, judul Berita, dan intro NextTel. Figma ada di kiri dan hasil bundle lokal di kanan. Lebar browser 1847 px, sementara frame Berita lebarnya 1844 px. Salinan teks dan media di beberapa bagian sudah berubah sejak frame dibuat. [Perbandingan screenshot Figma dan bundle](screenshots/all-frames-comparison.webp)

Metrik sumber dibaca pada frame desktop. Ukuran situs diskalakan ke lebar kontainer, sehingga pencocokan ini berlaku pada peran tipografi yang sepadan, dengan ukuran responsif dan reflow yang diperiksa di browser. Desain arsip, teks di dalam artwork, dan layar tanpa padanan Figma dilaporkan sesuai cakupannya. Pengujian data memakai fixture lokal, termasuk Informasi SPMB admin dan fallback hasil NextTel.

## Inventaris setiap frame layar

### Telkom remake (0:1)

| Frame | Nama | Padanan | Layer teks | Font | Status |
|---|---|---|---:|---|---|
| `12:63` | HALAMAN profil guru | `/profil-sekolah/guru` | 84 | Jakarta, Inter, Poppins | Varian desain |
| `24:867` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 87 | Jakarta, Inter | Varian desain |
| `24:1827` | Halaman Jurusan | `/jurusan` | 146 | Jakarta | Varian desain |
| `24:2575` | HALAMAN PRESTASI | `/prestasi` | 120 | Jakarta | Varian desain |
| `59:133` | HALAMAN EKSTRAKURIKULER | `/ekstrakurikuler` | 54 | Jakarta, Poppins, Play | Varian desain |
| `106:90` | HALAMAN KHUSUS FOOTER | `Footer bersama` | 82 | Jakarta, Play | Varian desain |
| `196:371` | Calender Of Event | `/kalender` | 117 | Jakarta, Poppins, Play, Inter | Varian desain |
| `198:782` | Informasi SPMB | `/dashboard/informasi-spmb` | 23 | Jakarta, Podkova | Rujukan |
| `117:445` | PENGUMUMAN | `/pengumuman` | 114 | Jakarta, Inter | Varian desain |
| `139:643` | HALAMAN PRESTASI | `/prestasi` | 98 | Jakarta | Varian desain |
| `146:2125` | Fasilitas sekolah (nanti ditaroh di beranda, di tengah-tengah jurusan dan prestasi membanggakan | `/jurusan` | 49 | Jakarta, Inter, Play | Varian desain |
| `150:196` | HALAMAN 1 BERANDA | `/` | 116 | Jakarta, Play | Varian desain |
| `174:151` | FASILITAS SEKOLAH | `/fasilitas` | 100 | Jakarta, Play, Poppins | Varian desain |
| `174:534` | FASILITAS SEKOLAH | `/fasilitas` | 100 | Jakarta, Play, Poppins | Varian desain |
| `174:1001` | FASILITAS SEKOLAH | `/fasilitas` | 66 | Jakarta, Play, Poppins | Varian desain |
| `174:1296` | FASILITAS SEKOLAH | `/fasilitas` | 74 | Jakarta, Play, Poppins | Varian desain |
| `174:1568` | FASILITAS SEKOLAH | `/fasilitas` | 60 | Jakarta, Play, Poppins | Varian desain |
| `174:1805` | FASILITAS SEKOLAH | `/fasilitas` | 60 | Jakarta, Play, Poppins | Varian desain |
| `174:2042` | FASILITAS SEKOLAH | `/fasilitas` | 60 | Jakarta, Play, Poppins | Gaya sama dengan 174:1805 |
| `183:358` | Page SPMB | `/spmb → portal eksternal` | 152 | Jakarta, Play, Inter | Arsip SPMB |
| `184:359` | Calender Of Event | `/kalender` | 107 | Jakarta, Poppins, Play, Inter | Varian desain |
| `200:901` | Calender Of Event | `/kalender` | 124 | Jakarta, Poppins, Play, Inter | Rujukan |
| `205:411` | FASILITAS SEKOLAH drag 1 | `/fasilitas` | 201 | Jakarta, Poppins, Play, Inter | Varian desain |
| `205:1177` | FASILITAS SEKOLAH drag 2 | `/fasilitas` | 203 | Jakarta, Poppins, Play, Inter | Gaya sama dengan 351:448 |
| `251:535` | FASILITAS SEKOLAH | `/fasilitas` | 103 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:1018` | FASILITAS SEKOLAH | `/fasilitas` | 143 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:1911` | FASILITAS SEKOLAH | `/fasilitas` | 84 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:2257` | FASILITAS SEKOLAH | `/fasilitas` | 78 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:2586` | FASILITAS SEKOLAH | `/fasilitas` | 77 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:2917` | FASILITAS SEKOLAH | `/fasilitas` | 76 | Jakarta, Poppins, Play, Inter | Varian desain |
| `251:3246` | FASILITAS SEKOLAH | `/fasilitas` | 76 | Jakarta, Poppins, Play, Inter | Varian desain |
| `322:760` | HALAMAN 1 BERANDA | `/` | 139 | Jakarta, Play, Inter | Varian desain |
| `328:786` | HALAMAN BKK | `/bkk` | 208 | Jakarta, Play | Gaya sama dengan 344:3170 |
| `367:799` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 123 | Jakarta, Play, Inter, Poppins | Varian desain |

### Font (343:799)

| Frame | Nama | Padanan | Layer teks | Font | Status |
|---|---|---|---:|---|---|
| `344:800` | HALAMAN 1 BERANDA | `/` | 139 | Jakarta, Play, Inter | Rujukan |
| `344:1687` | HALAMAN 1 BERANDA | `/` | 115 | Jakarta, Play, Inter | Rujukan |
| `344:2562` | HALAMAN PRESTASI | `/prestasi` | 110 | Jakarta, Play | Rujukan |
| `344:3170` | HALAMAN BKK | `/bkk` | 208 | Jakarta, Play | Rujukan |
| `344:3871` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 123 | Jakarta, Play, Inter, Poppins | Rujukan |
| `344:4488` | HALAMAN 1 PROFIL GURU | `/profil-sekolah/guru` | 95 | Jakarta, Poppins, Inter, Play | Rujukan |
| `344:5859` | FASILITAS SEKOLAH | `/fasilitas` | 100 | Jakarta, Poppins, Play, Inter | Rujukan |
| `344:6353` | FASILITAS SEKOLAH | `/fasilitas` | 140 | Jakarta, Poppins, Play, Inter | Rujukan |
| `344:7035` | FASILITAS SEKOLAH | `/fasilitas` | 81 | Jakarta, Poppins, Play, Inter | Rujukan |
| `344:7377` | FASILITAS SEKOLAH | `/fasilitas` | 77 | Jakarta, Poppins, Play, Inter | Rujukan |
| `344:7707` | FASILITAS SEKOLAH | `/fasilitas` | 74 | Jakarta, Poppins, Inter, Play | Rujukan |
| `344:8034` | FASILITAS SEKOLAH | `/fasilitas` | 73 | Jakarta, Poppins, Inter, Play | Rujukan |
| `344:8359` | FASILITAS SEKOLAH | `/fasilitas` | 73 | Jakarta, Poppins, Inter, Play | Rujukan |
| `344:8686` | Halaman Jurusan | `/jurusan` | 125 | Jakarta, Play | Rujukan |
| `344:9293` | HALAMAN EKSTRAKURIKULER | `/ekstrakurikuler` | 134 | Poppins, Jakarta, Inter, Play | Rujukan |
| `346:386` | FASILITAS SEKOLAH | `/fasilitas` | 196 | Poppins, Jakarta, Play, Inter | Rujukan |
| `351:448` | FASILITAS SEKOLAH | `/fasilitas` | 203 | Jakarta, Poppins, Play, Inter | Rujukan |

### Telkom remake again (221:2084)

| Frame | Nama | Padanan | Layer teks | Font | Status |
|---|---|---|---:|---|---|
| `221:2085` | HALAMAN 1 BERANDA | `/` | 107 | Jakarta, Play | Varian desain |
| `221:2738` | Calender Of Event | `/kalender` | 124 | Jakarta, Poppins, Play, Inter | Varian desain |
| `221:3169` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 101 | Jakarta, Inter, Play | Varian desain |
| `221:3839` | HALAMAN 1 PROFIL GURU | `/profil-sekolah/guru` | 98 | Jakarta, Poppins, Play, Inter | Varian desain |
| `221:9323` | HALAMAN EKSTRAKURIKULER | `/ekstrakurikuler` | 138 | Jakarta, Poppins, Play, Inter | Varian desain |
| `221:10192` | Halaman SPMB | `/spmb → portal eksternal` | 152 | Jakarta, Play, Inter | Arsip SPMB |
| `225:10916` | Selengkapnya Jurusan (RPL) | `/jurusan/rpl` | 80 | Jakarta, Play, Inter, Poppins, Arimo | Rujukan |
| `225:11486` | Selengkapnya Jurusan TKJ | `/jurusan/tkj` | 80 | Jakarta, Play, Inter, Poppins, Arimo | Rujukan |
| `225:11972` | Selengkapnya Jurusan TJA | `/jurusan/tjat` | 80 | Jakarta, Play, Inter, Poppins, Arimo | Rujukan |
| `225:12486` | Selengkapnya Jurusan PG | `/jurusan/pg` | 80 | Jakarta, Play, Inter, Poppins, Arimo | Rujukan |
| `229:14479` | FASILITAS SEKOLAH 1 | `/fasilitas` | 205 | Jakarta, Poppins, Play, Inter | Varian desain |
| `229:15290` | FASILITAS SEKOLAH 2 | `/fasilitas` | 203 | Jakarta, Poppins, Play, Inter | Gaya sama dengan 351:448 |
| `231:16259` | HALAMAN BKK | `/bkk` | 191 | Jakarta, Play | Varian desain |
| `231:16851` | HALAMAN BERITA | `/berita` | 159 | Jakarta | Rujukan |
| `236:17638` | HALAMAN PRESTASI | `/prestasi` | 110 | Jakarta, Play | Varian desain |
| `242:499` | FASILITAS SEKOLAH NEW | `/fasilitas` | 143 | Jakarta, Poppins, Play, Inter | Gaya sama dengan 251:1018 |
| `253:5314` | Halaman NextTel AI | `/nexttel` | 27 | Jakarta, Play, Inter | Gaya sama dengan 280:1884 |
| `253:5526` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Gaya sama dengan 280:2041 |
| `253:5648` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Gaya sama dengan 280:2041 |
| `253:5770` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Gaya sama dengan 280:2285 |
| `253:5892` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Gaya sama dengan 280:2407 |
| `253:6013` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Gaya sama dengan 280:2528 |
| `253:6133` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Gaya sama dengan 280:2648 |
| `253:6253` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Gaya sama dengan 280:2768 |
| `253:6373` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Gaya sama dengan 280:2888 |
| `253:6493` | Halaman NextTel AI | `/nexttel` | 67 | Jakarta, Play, Inter | Gaya sama dengan 280:3008 |
| `253:6691` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Gaya sama dengan 280:3206 |
| `314:1317` | HALAMAN 1 BERANDA | `/` | 139 | Jakarta, Play, Inter | Gaya sama dengan 322:760 |
| `316:1350` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 124 | Jakarta, Play, Inter, Poppins | Varian desain |

### Telkom again (261:1476)

| Frame | Nama | Padanan | Layer teks | Font | Status |
|---|---|---|---:|---|---|
| `261:2294` | HALAMAN 1 PROFIL SEKOLAH | `/profil-sekolah` | 99 | Jakarta, Inter, Play | Varian desain |
| `261:2968` | HALAMAN 1 PROFIL GURU | `/profil-sekolah/guru` | 95 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:8450` | FASILITAS SEKOLAH | `/fasilitas` | 100 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:8944` | FASILITAS SEKOLAH | `/fasilitas` | 140 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:9626` | FASILITAS SEKOLAH | `/fasilitas` | 81 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:9968` | FASILITAS SEKOLAH | `/fasilitas` | 77 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:10298` | FASILITAS SEKOLAH | `/fasilitas` | 74 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:10625` | FASILITAS SEKOLAH | `/fasilitas` | 73 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:10950` | FASILITAS SEKOLAH | `/fasilitas` | 73 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:11277` | Halaman Jurusan | `/jurusan` | 125 | Jakarta, Play | Varian desain |
| `261:11846` | HALAMAN EKSTRAKURIKULER | `/ekstrakurikuler` | 135 | Jakarta, Poppins, Play, Inter | Varian desain |
| `261:12716` | Halaman SPMB | `/spmb → portal eksternal` | 150 | Jakarta, Play, Inter | Arsip SPMB |
| `261:13248` | HALAMAN 1 BERANDA | `/` | 125 | Jakarta, Play, Inter | Varian desain |
| `261:14070` | HALAMAN 1 BERANDA | `/` | 104 | Jakarta, Play | Varian desain |
| `280:1884` | Halaman NextTel AI | `/nexttel` | 27 | Jakarta, Play, Inter | Rujukan |
| `280:2041` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Rujukan |
| `280:2163` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Rujukan |
| `280:2285` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Rujukan |
| `280:2407` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Rujukan |
| `280:2528` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Rujukan |
| `280:2648` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Rujukan |
| `280:2768` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Rujukan |
| `280:2888` | Halaman NextTel AI | `/nexttel` | 30 | Jakarta, Play | Rujukan |
| `280:3008` | Halaman NextTel AI | `/nexttel` | 67 | Jakarta, Play, Inter | Rujukan |
| `280:3206` | Halaman NextTel AI | `/nexttel` | 31 | Jakarta, Play | Rujukan |
| `287:578` | HALAMAN 1 BERANDA | `/` | 139 | Jakarta, Play, Inter | Varian desain |
| `305:1331` | PENGUMUMAN | `/pengumuman` | 119 | Jakarta, Poppins, Play, Inter | Rujukan |
| `309:1687` | HALAMAN 1 PROFIL GURU | `/profil-sekolah/guru` | 95 | Jakarta, Poppins, Play, Inter | Gaya sama dengan 261:2968 |
