# Pemulihan Informasi SPMB

Tujuan: membuka kembali implementasi asli `/spmb`, mempertahankan backend MySQL/Prisma, portal resmi, dan perubahan hero terbaru.

Sumber: `d801fef` (halaman asli), `9de3d41` dan `a6f5a64` (admin/integrasi), `e2161a6` (migrasi MySQL). Penyebab tersembunyi: `9578b7e` (tautan eksternal), `a89a6f2` (guard redirect). File halaman/aset tidak dihapus.

## Batas

- Selektif: pulihkan route informasi, metadata, dan tautan informasi dari history. Pertahankan tujuan pendaftaran resmi dan redirect portal lama.
- Jangan mengubah schema, endpoint, auth, data tersimpan, section lain, atau file lokal pengguna.
- Gunakan komponen hero dan token yang sudah tersedia. Jangan mengembalikan ukuran lama.
- Konten dinamis memakai kamus existing; teks admin tanpa padanan tetap menjadi sumber asli.
- Commit memakai identitas Git terkonfigurasi, tanpa atribusi AI; push branch khusus, PR tanpa merge.

## Langkah

1. Tambahkan regresi `/spmb` yang gagal pada guard saat ini. Pulihkan hanya hunk navigasi/SEO dan pengecualian route informasi; uji routing dan redirect aman; commit pemulihan.
2. Tambahkan regresi service untuk ISO date, payload edit, abort, dan Published ketika sesi admin aktif. Perbaiki adapter service dan pembacaan settings pada SPMB. Uji CRUD melalui API/database lokal dan Admin Panel; commit integrasi.
3. Verifikasi hero SPMB melawan Jurusan pada ukuran sama; adaptasi hanya SPMB jika perlu. Lengkapi terjemahan konten lama, tanggal/angka/HTML dinamis dengan mekanisme existing; uji ID/EN dan tampilan 320–1920 px; commit adaptasi.
4. Jalankan lint, build CI/offline SEO, regresi relevan. Catat hasil dan batas pengujian dalam laporan; commit dokumentasi, push, buat PR.

## Risiko yang diuji

- Route informasi boleh dibuka, route portal lama tetap redirect tanpa token/query.
- Publik tidak menampilkan Draft walau browser mempunyai sesi admin.
- ISO timestamp tidak membuat tanggal invalid atau menggagalkan edit admin.
- Tahun/status backend tidak menjadi undefined akibat perubahan camelCase.
- Rich text tetap disanitasi; terjemahan tidak mengubah URL, nama resmi, atau nilai faktual.
- Hero/CTA tidak menumpuk dengan floating cards dalam kedua bahasa.

## Hasil pelaksanaan

Route/navigasi/SEO dipulihkan secara selektif. Adapter DATE/Published dan settings backend diperbaiki tanpa endpoint/schema baru. Seluruh teks seed asli diterjemahkan dengan sanitization rich text. API/MySQL lokal, CRUD Admin UI, settings -> publik, 14 perbandingan ID/EN dan regresi portal resmi lulus. Akun/data QA telah dibersihkan. Hero sudah mengikuti shared components; tidak memerlukan perubahan CSS. Bukti dan batas hasil: `frontend/docs/spmb-restoration-2026-11-08.md`.

Keputusan: pertahankan portal pendaftaran resmi dan redirect portal lama; hanya halaman informasi dibuka. Pertahankan teks admin tanpa padanan Inggris sebagai sumber karena model existing tidak mempunyai kolom terjemahan. Basis PR adalah `fix/hero-consistency-audit` agar tidak membawa ulang perubahan hero yang belum masuk main.
