# Audit & Rencana Redesain — Halaman Kebijakan Privasi

Dokumen ini adalah **Phase 1 (Visual Audit)** dari master prompt
"Privacy Policy Page Redesign & Typography Refinement" untuk halaman
`/kebijakan-privasi` SMK Telkom Purwokerto.

- File utama: `frontend/src/pages/KebijakanPrivasiPage.jsx`
- Tanggal audit: 22 November 2026
- Basis: inspeksi kode aktual (bukan asumsi).

---

## 1. Kondisi aktual yang diperiksa

| Area | Berkas | Temuan |
|---|---|---|
| Halaman | `src/pages/KebijakanPrivasiPage.jsx` | 6 seksi, tiap seksi dibungkus `rounded-2xl border … shadow-card`. Judul/isi memakai `text-xs`/`text-sm`. |
| Hero | `src/components/HalamanHeader.jsx` | Dipakai bersama oleh 7 halaman. `py-12 lg:py-16`, judul `text-3xl sm:text-4xl`, deskripsi `text-sm sm:text-base`. |
| Layout | `src/layouts/MainLayout.jsx` | Default `showMarquees` & `showOpeningMarquee` = true → menyisipkan `WaveMarquee` tepat setelah child pertama. |
| Ribbon | `src/components/WaveMarquee.jsx` | SVG `viewBox="0 2354 1847 340"` full-bleed, tinggi ± 340/1847 × lebar halaman → pada 1440 px ± 265 px ruang vertikal. Ini "ribbon merah" besar di screenshot. |
| Dekorasi bawah | `src/components/InnovationReveal.jsx` | Reveal teks besar di akhir konten. |
| Navbar | `src/components/Navbar.jsx` | `sticky top-0 z-[60]`, tinggi `h-16` (mobile) / `lg:h-[88px]`. |
| NEXA | `src/components/stela/StelaWidget.jsx` | `fixed bottom-4 right-4 z-50`, tombol 48–56 px; sudah menyembunyikan diri saat scroll di mobile (`max-sm:… translate-y-6 opacity-0`). |
| Token warna | `src/index.css` | `--color-primary #c8102e`, `dark-50…900`, `primary-50…900`. |
| Tipografi | `src/styles/typography.css`, `src/index.css` | `.public-site` memakai Plus Jakarta Sans (variable 200–800) untuk sans & heading. Tidak ada CSS khusus halaman privasi. |
| Scroll offset global | `src/index.css` | `:where(main section[id]) { scroll-margin-top: 6rem }` — hanya berlaku untuk `<section id>`, bukan div anchor. |

---

## 2. Penyebab masalah (sesuai daftar Phase 1)

1. **Ukuran font terlalu kecil.** Body/isi `text-xs` (12 px), judul seksi `text-sm` (14 px), subjudul `text-xs`. Di bawah standar dokumen (16 px).
2. **Line-height terlalu rapat.** `leading-relaxed` (1.625) pada teks 12 px; tidak mencapai 1.7–1.8 yang diminta.
3. **Lebar paragraf tidak ideal.** `max-w-3xl` (768 px) untuk seluruh halaman, tanpa batas kolom teks tersendiri.
4. **Jarak antarseksi tidak konsisten.** `space-y-6` seragam, tanpa pemisah/heading rhythm.
5. **Hero terlalu kosong.** `HalamanHeader` hanya kolom kiri `max-w-2xl`; sisi kanan kosong; tidak ada metadata.
6. **Ribbon dekoratif terlalu besar.** `WaveMarquee` full-bleed ± 265 px, muncul tepat setelah hero karena `MainLayout` default — tidak menyerupai dokumen.
7. **Sidebar terlalu kecil.** Sekarang hanya `<p>` (tanggal + domain), bukan daftar isi.
8. **Navbar sticky menutupi anchor.** Tidak ada daftar isi/anchor; `scroll-margin-top` global hanya untuk `section[id]`.
9. **NEXA menutupi konten.** `fixed bottom-4 right-4`; pada baris terakhir konten berpotensi tertutup karena tidak ada padding aman bawah.
10. **Responsive kurang optimal.** Tidak ada mode kolaps daftar isi; belum ada uji lebar kecil.

---

## 3. Arah desain

**Modern Institutional Privacy Document** — clean, editorial, corporate,
readability-focused. Identitas visual SMK Telkom Purwokerto dipertahankan
(merah brand `#c8102e`, navy `dark-900` untuk heading, putih + `dark-50`
untuk latar, `primary-50` untuk callout). Tidak ada warna atau font baru.

Target tipografi desktop / mobile mengikuti tabel Phase 3 master prompt.

---

## 4. Rencana implementasi (urutan commit)

1. `refactor(privacy): restructure privacy policy page layout` — hero khusus, dua kolom (sidebar 15rem + konten ≤ 850 px, container ≤ 1200 px), seksi editorial tanpa kartu per-seksi, tambah seksi **Retensi Data** dan **Hak Pengguna**, `MainLayout` tanpa marquee, anchor + `scroll-margin-top`.
2. `style(privacy): improve typography and readability` — ukuran/line-height/weight sesuai tabel Phase 3.
3. `style(privacy): redesign hero and content sections` — hero proporsional + metadata, accent, callout informasi.
4. `fix(privacy): improve table of contents and sticky navigation` — active state via IntersectionObserver, sticky offset, daftar isi collapsible di mobile.
5. `fix(privacy): prevent navbar and nexa widget overlap` — `scroll-margin-top` yang cukup + padding aman bawah.
6. `test(privacy): validate responsive layout and accessibility` — skrip regresi SSR.

> Catatan: `MainLayout` pada halaman ini diubah **hanya lewat prop** (`showMarquees={false}`), bukan mengubah komponen global, sehingga halaman lain tidak terpengaruh.
