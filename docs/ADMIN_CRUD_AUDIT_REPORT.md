# Laporan Audit CRUD Admin

Tanggal pemeriksaan: 9 November 2026  
Stack: MySQL + Prisma + Express, frontend React/Vite. Tidak ada migrasi atau perubahan data produksi.

## Ruang lingkup
Audit mencakup CRUD admin untuk Prestasi, BKK, Berita, Pengumuman, dan Kalender/Event, berikut validasi, autentikasi, CSRF, pengelolaan tanggal, respons error, dan menu Dashboard.

## Temuan dan perbaikan

1. **Kategori Event akademik gagal disimpan.** Kontrak HTTP memakai kategori hyphen seperti `cuti-bersama`, sedangkan identifier enum Prisma memakai underscore. `backend/src/routes/events.js` kini mengonversi nilai pada batas DB dan menserialisasi kategori HTTP konsisten untuk seluruh operasi. Baris lama tidak diubah.
2. **Tanggal deadline BKK dapat merusak tampilan.** DateTime API berbentuk ISO dapat menerima akhiran `T00:00:00` tambahan, membuat `Invalid Date` dan `RangeError`. `frontend/src/utils/date.js` menormalkan date-only, dan formatter, sorter, service, serta date input admin menggunakan hasil normalisasi.
3. **GET BKK by ID gagal.** Router generik mencari `slug` pada model BKK yang tidak memilikinya. `backend/src/routes/content.js` hanya melakukan pencarian slug pada model yang mendukungnya.
4. **Date input dapat kosong/invalid saat edit.** Form Prestasi, BKK, dan Kalender sekarang mengisi input dari date key ter-normalisasi.
5. **Kode error frontend tidak sesuai backend MySQL/Prisma.** `frontend/src/utils/apiError.js` memetakan kode aplikasi backend, termasuk `duplicate`, `not_found`, `validation_error`, `csrf_failed`, dan `network_error`; detail validasi tidak perlu ditampilkan sebagai error database mentah.
6. **Error Prisma yang diketahui tidak dibedakan.** Middleware backend memetakan P2003 ke 409 dan Prisma validation error ke 400 dengan pesan aman.
7. **Menu Pengaturan Dashboard dihapus.** Entri sidebar dan route aktif dihilangkan; URL lama diarahkan ke `/dashboard`. File Pengaturan tetap ada untuk ekspor yang digunakan skrip internal. API `/api/settings` dan data MySQL tetap dipertahankan.
8. **BKK, Prestasi, Event memakai tanggal API secara langsung.** Service terkait kini mengubah nilai ke date key tanpa mengubah tanggal tersimpan.

## Keamanan dan data
- Database produksi lokal tetap MySQL dan skema terdeteksi up to date.
- Tidak ada migrasi, penghapusan massal data, atau pengubahan migration terapan.
- Fixture tes memakai prefix `crudtest-` dan cleanup terbatas pada fixture tersebut.
- SPMB internal tetap dikendalikan feature flag.
- Tidak ada deployment.

## Kesimpulan
Semua temuan yang direproduksi ditangani pada boundary yang sesuai. Validasi otomatis backend dan build frontend lulus setelah perbaikan.
