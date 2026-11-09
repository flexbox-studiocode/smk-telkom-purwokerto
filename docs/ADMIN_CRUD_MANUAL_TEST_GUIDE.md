# Panduan Uji Manual CRUD Admin

## Prasyarat

1. Jalankan MySQL lokal sesuai konfigurasi `backend/.env`.
2. Pastikan backend dan frontend memakai konfigurasi lokal.
3. Jalankan backend dengan `npm run dev` dari `backend/` dan frontend dengan `npm run dev` dari `frontend/`.
4. Gunakan akun admin yang sudah tersedia. Jangan menyalin password atau cookie ke laporan.

## Alur umum

Untuk setiap modul, lakukan:

1. Login ke Dashboard.
2. Buka modul dari sidebar.
3. Klik tambah data.
4. Isi field wajib dan field opsional.
5. Simpan; pastikan notifikasi sukses dan baris baru muncul.
6. Buka detail; pastikan data tampil.
7. Edit satu field dan simpan; pastikan perubahan bertahan setelah refresh.
8. Hapus fixture yang baru dibuat; pastikan baris hilang.

## Modul

### Berita

- Uji status Draft dan Published.
- Uji slug duplikat; pesan harus menjelaskan bahwa slug sudah digunakan.
- Uji upload gambar bila diperlukan.
- Uji edit konten sebagian tanpa menghapus field lain.

### Pengumuman

- Uji tanggal pengumuman.
- Uji status Draft dan Published.
- Uji slug duplikat dan upload gambar.

### Prestasi

- Uji tanggal pada create dan edit.
- Buka kembali modal edit; date input harus berisi `YYYY-MM-DD`, bukan string ISO lengkap.
- Uji tingkat, kategori, deskripsi, dan URL Instagram.

### BKK

- Uji deadline dengan data baru.
- Buka kembali modal edit untuk baris yang memiliki deadline; tidak boleh muncul `RangeError: Invalid time value`.
- Pastikan tabel, detail, filter, dan pengurutan deadline bekerja.
- Uji link pendaftaran dan logo.

### Kalender/Event

- Buat event dengan kategori `Cuti bersama` dan `Awal praktek kerja industri`.
- Simpan lalu edit event; kategori harus tetap tampil sebagai label resmi.
- Pastikan respons UI tetap menggunakan tanggal dan kategori yang benar.
- Uji tanggal selesai sebelum tanggal mulai dan waktu selesai sebelum waktu mulai pada hari yang sama; simpan harus ditolak.
- Uji Draft dan Published, detail, edit, hapus, pencarian, dan filter status.

## Akses dan error

1. Logout, panggil atau coba gunakan URL mutation; harus ditolak dan tidak ada perubahan.
2. Login sebagai applicant bila akun tersedia; akses mutation harus ditolak.
3. Putuskan koneksi backend sementara, muat halaman admin, lalu pastikan pesan menyebut koneksi/server tanpa menampilkan stack trace.
4. Akses `/dashboard/pengaturan`; harus diarahkan ke `/dashboard`. Sidebar tidak boleh menampilkan Pengaturan.
5. Pastikan endpoint publik `/api/settings` tetap tersedia; data settings tidak dihapus.

## Kriteria lulus

- Semua create/read/update/delete berhasil untuk data valid.
- Data invalid ditolak dengan pesan yang dapat ditindaklanjuti.
- Tidak ada crash `RangeError`, stack trace, secret, token, atau password di UI/log laporan.
- Data existing tidak berubah selain operasi fixture yang dibuat selama uji.
