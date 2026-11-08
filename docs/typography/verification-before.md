# Verifikasi sebelum perbaikan tipografi

Tanggal audit: 6 November 2026. Sumber lokal: snapshot produksi yang disimpan di `outputs/typography-audit/baseline-dist`; bukti browser di `outputs/typography-audit/browser-local-before`. Snapshot dan screenshot before tidak diubah saat penguatan QA.

## Cakupan dan status bukti

`summary.json` mencatat 96 kombinasi dari 16 rute × lebar 1847/768/375 × bahasa ID/EN. Dari jumlah tersebut, 89 capture halaman lokal berstatus HTTP 200, 5 kombinasi berpindah ke portal penerimaan eksternal, dan 2 capture lokal tidak valid.

| Rute | Capture lokal valid | Catatan |
|---|---:|---|
| `/` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/berita` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/bkk` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/ekstrakurikuler` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/fasilitas` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/jurusan` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/jurusan/faq` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/kalender` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/nexa` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/nexttel` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/pengumuman` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/prestasi` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/profil-sekolah` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/profil-sekolah/guru` | 6/6 | 6/6: ID dan EN pada tiga lebar |
| `/sinergi` | 5/6 | 1847 EN masih berupa halaman server 404; tidak dihitung lulus |
| `/spmb` | 0/6 | 1847 ID membuka portal eksternal; EN 404 lama; empat ukuran/bahasa lain gagal menunggu h1 portal eksternal |

Rute `/sinergi` yang tidak diprerender dilayani lewat fallback HTML SPA hanya ketika navigasi snapshot mengembalikan 404. Fallback dicatat dalam setiap JSON. Halaman `/spmb` dalam snapshot ini mengarah ke situs penerimaan eksternal; pengujian tipografi situs eksternal bukan bukti tipografi aplikasi lokal.

## Font deklarasi dan font yang benar-benar dirender

Pemeriksaan ulang tanpa browser (`QA_RECHECK`) terhadap 89 capture lokal valid menghasilkan 89 pelanggaran kontrak font. Hasil terpisah ada di `outputs/typography-audit/contract-before/font-contract-recheck.json`.

- Font canonical `Plus Jakarta Sans` belum didaftarkan oleh stylesheet aktif. Deklarasi JSX dengan nama tersebut jatuh ke Inter; ini bukan sekadar perbedaan string CSS.
- CDP mengonfirmasi 18 sampel family/weight desktop yang meminta Plus Jakarta Sans tetapi merender Inter. Bobot sampel: 400, 500, 600, 700, 800.
- Alias lokal `Home Motion Jakarta` dan `Profile Jakarta` memang merender berkas Plus Jakarta Sans. Keberhasilan alias tidak membuktikan canonical family tersedia.
- Kontrak baru memeriksa cakupan bobot Jakarta 200–800, Inter 100–900, Poppins 300–800 dan font aktual CDP. Baseline yang gagal merupakan kontrol regresi yang diharapkan.

## Nilai heading desktop sebelum perubahan

Tabel berikut memakai h1 yang benar-benar terlihat pada capture ID lebar 1847, bukan ukuran source Figma. Ini menjadi pasangan numerik untuk perbandingan after.

| Rute | Ukuran CSS | Bobot | Tracking CSS | Family CSS pertama |
|---|---:|---:|---:|---|
| `/` | 30px | 800 | -0.75px | Poppins |
| `/profil-sekolah` | 32px | 800 | -0.8px | Poppins |
| `/ekstrakurikuler` | 32px | 800 | -0.8px | Poppins |
| `/jurusan` | 32px | 800 | -0.8px | Poppins |
| `/fasilitas` | 32px | 800 | -0.8px | Poppins |
| `/bkk` | 32px | 800 | -0.8px | Poppins |
| `/berita` | 32px | 800 | -0.8px | Poppins |
| `/pengumuman` | 32px | 800 | -0.8px | Poppins |
| `/nexa` | 36px | 800 | normal | Poppins |
| `/kalender` | 36px | 800 | -0.9px | Poppins |
| `/nexttel` | 36px | 800 | normal | Poppins |
| `/profil-sekolah/guru` | 32px | 800 | -0.8px | Poppins |
| `/prestasi` | 32px | 800 | -0.8px | Poppins |
| `/jurusan/faq` | 36px | 800 | normal | Poppins |
| `/sinergi` | 48px | 700 | normal | Poppins |

## Layout, CLS, dan animasi

- Tidak ditemukan horizontal overflow halaman pada 89 capture lokal valid.
- Detector lama menandai clipping pada 12 capture. Baris yang ditandai berada pada indikator fasilitas yang dapat digeser, carousel project, dan label peta kampus di luar viewport. Angka lama tidak cukup untuk menyebut teks utama rusak; QA diperkuat agar tetap memeriksa clipping internal teks/card sambil mengenali batas scroll/map yang disengaja.
- Reveal yang belum aktif tercatat pada 3 capture; perlu diperiksa ulang setelah build akhir.
- CLS yang tercatat adalah total satu sesi navigasi, pergantian bahasa, dan scroll dengan data API lokal tidak tersedia. Angka ini bukan Web Vitals produksi atau pengukuran dampak font saja.

| CLS tertinggi yang tercatat | Rute | Lebar | Bahasa |
|---:|---|---:|---|
| 0.8913 | `/prestasi` | 375 | ID |
| 0.8913 | `/pengumuman` | 375 | ID |
| 0.8913 | `/berita` | 375 | ID |
| 0.2437 | `/` | 1847 | EN |
| 0.1429 | `/` | 375 | EN |
| 0.1156 | `/` | 768 | EN |

Digital Innovation pada motion normal bergerak dari `matrix(1, 0, 0, 1, 0, 0)` ke `matrix(1, 0, 0, 1, -346.948, 0)`; `moved: true`. Setelah reduced motion diaktifkan, transform menjadi `none`, opacity `1`, visibility `visible`. Bukti screenshot animasi tersedia bersama JSON before. Ini mengonfirmasi gerak reel dan fallback reduced motion pada snapshot; detail word-reveal tetap memerlukan tes animasi terpisah.

## Batas verifikasi

Tidak ada API write, commit, push, atau deployment dalam QA ini. Seluruh capture lokal memuat sebagian request `/api/...` yang gagal karena server snapshot hanya menyajikan berkas statis; `stubbedApi: false`. Bukti menggunakan konten fallback asli aplikasi dan tidak membuktikan data backend hidup. Capture 404, redirect eksternal, dan timeout tidak dihitung lulus. Setelah build akhir, seluruh kombinasi lokal dan sampel halaman detail perlu diuji ulang dengan font aktual di tiap ukuran.
