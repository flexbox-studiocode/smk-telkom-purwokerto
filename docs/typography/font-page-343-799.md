# Audit pilihan font pada halaman Font

Referensi mencakup 17 frame halaman penuh, grup navigasi dan teks lepas pada halaman `343:799`. Figma MCP membaca 2.086 layer teks dengan visibilitas aktif, terdiri dari 2.145 segmen font. Baseline situs untuk perbandingan adalah `0254adf`, hasil merge PR #122. [Halaman Font di Figma](https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=343-799&m=dev)

## Pemetaan tiap bagian

| Halaman dan frame | Bagian yang dicocokkan | Pilihan font |
|---|---|---|
| Navbar dan footer bersama, termasuk grup `344:2540` | Tautan, label dropdown, CTA SPMB, bahasa, merek footer, judul kolom, kontak dan teks legal | Plus Jakarta Sans. Glyph panah `>` di Figma memakai Play Regular dan tampil sebagai ikon SVG di situs |
| Beranda `344:800`, `344:1687` | Hero dan akses cepat, Tentang, statistik, marquee, jurusan dan kartu, fasilitas dan kartu, judul Prestasi, Hall of Fame, FAQ, Digital Innovation, asisten dan CTA | Plus Jakarta Sans. Dua tombol di bawah carousel fasilitas memakai Inter 800. Label bantuan, pertanyaan dan tautan FAQ pada varian `344:800` memakai Plus Jakarta Sans 800 |
| Profil Sekolah `344:3871` | Hero, statistik, Tentang, visi dan misi, nilai, perjalanan, kepala sekolah, guru, metode belajar, fasilitas, dan CTA | Plus Jakarta Sans untuk teks umum. Breadcrumb aktif dan dua CTA fasilitas memakai Inter 800. Seluruh bagian Metode Pembelajaran memakai Poppins |
| Profil Guru `344:4488` | Hero, akses cepat, kepala sekolah, Kesiswaan dan Karakter, daftar dan kartu guru | Judul hero Poppins 600. Breadcrumb aktif Inter 800. Teks bagian dan kartu memakai Plus Jakarta Sans |
| Ekstrakurikuler `344:9293` | Hero, input cari, statistik, filter kategori, judul kategori dan isi kartu | Poppins pada judul, deskripsi, pencarian dan statistik hero serta filter dan judul kategori. Breadcrumb aktif Inter 800. Isi kartu dan teks umum Plus Jakarta Sans |
| Fasilitas `344:5859`, `344:6353`, `344:7035`, `344:7377`, `344:7707`, `344:8034`, `344:8359`, `346:386`, `351:448` | Hero dan akses cepat, School Tour, label peta, preview, judul dan filter daftar, judul grup dan kartu ruangan | Breadcrumb aktif Inter 800. Poppins pada judul daftar, filter dan judul grup. Plus Jakarta Sans pada hero, peta, preview dan isi kartu |
| Jurusan `344:8686` | Hero, daftar program, tag, kuis, mitra, perbandingan, proyek, dan CTA | Plus Jakarta Sans |
| Prestasi `344:2562` | Hero, unggulan, galeri, Hall of Fame, dukungan dan CTA | Plus Jakarta Sans |
| BKK `344:3170` | Hero, pencarian perusahaan dan talenta, lowongan, PKL, jalur karier dan alumni | Plus Jakarta Sans. Nama perusahaan di kartu lowongan 600, sementara metadata pada kartu PKL 400 |

Play hanya digunakan pada 42 segmen panah dekoratif. Teks UI Figma memakai Plus Jakarta Sans 400/500/600/700/800, Poppins 300/400/500/600/700, dan Inter 800. Tidak ada segmen italic. Ketiga font sudah tersedia sebagai aset WOFF2 di situs.

## Koreksi yang masuk PR

| Peran | Sebelum | Sesudah | Node Figma |
|---|---|---|---|
| Breadcrumb aktif Profil Guru, Fasilitas dan Ekstrakurikuler | Plus Jakarta Sans 600, 12 px, tracking normal | Inter 800, 10 px, tracking 1,2 px | `344:5708`, `344:6155`, `344:10054` |
| Label Pusat Bantuan, pertanyaan dan tautan Lihat Semua FAQ pada Beranda | Plus Jakarta Sans 700 | Plus Jakarta Sans 800 | `344:1655`, `344:1624`, `344:1632`, `344:1637`, `344:1647` |
| Tautan Tanya NEXA pada FAQ Beranda | Plus Jakarta Sans 600 | Plus Jakarta Sans 800 | `344:1642` |

Varian FAQ Beranda memakai `344:800` karena memuat komponen bantuan yang sesuai dengan halaman aktif. Layer `Komunitas Siswa` adalah judul tersendiri di desain, sedangkan situs langsung menampilkan filter dan judul kategori. Elemen yang tertanam dalam artwork dan layer tanpa padanan HTML tidak dapat diukur sebagai font browser. Halaman Berita, Pengumuman, Kalender, dan Admin tidak memiliki frame mandiri pada halaman `343:799`.

## Verifikasi

- Chrome menguji delapan rute pada 1847, 768, dan 375 px dalam ID/EN. Seluruh 48 kombinasi lulus pemeriksaan font aktual melalui CDP, clipping, dan overflow. Delapan sampel slide sekunder juga lulus.
- Pemeriksaan terarah lulus untuk 24 kombinasi breadcrumb dan 36 sampel teks FAQ. Baseline gagal pada 18 kombinasi breadcrumb dan seluruh 36 sampel FAQ, sesuai selisih di tabel.
- Sebanyak 48 status filter Fasilitas dan Ekstrakurikuler lulus. Preview School Tour dan kartu BKK juga diperiksa pada desktop dan ponsel. Data Prestasi dan lowongan BKK memakai fixture lokal.
- Lint, typecheck, tes bahasa, 22 skenario animasi scroll, delapan penempatan hero, serta geometri dan kontinuitas marquee lulus. Pengujian browser mengonfirmasi Text Reveal dan Digital Innovation dalam mode normal dan reduced motion.
- Build produksi Vite dan verifikasi prerender/SEO offline 100 HTML lulus.

[Screenshot FAQ pada 1847 px](screenshots/font-page-faq-comparison.webp) memperlihatkan Figma, baseline, dan hasil perbaikan. Pertanyaan pertama terbuka di Figma dan tertutup di kedua tangkapan situs. Perbandingan ini menilai pilihan font serta bobot pada peran yang sepadan. Lebar kontainer situs dan ukuran teks responsif tetap mengikuti implementasi yang ada.
