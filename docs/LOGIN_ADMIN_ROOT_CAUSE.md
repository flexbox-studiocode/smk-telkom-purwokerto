# Root Cause: Login Admin Gagal

Tanggal audit: 2026-11-08
Database: MySQL lokal `127.0.0.1:3306/smk_telkom_purwokerto`
Kredensial tidak dicetak.

## Gejala

Halaman `/login` selalu menampilkan `Email atau password salah.` untuk akun admin yang dianggap sudah ada.

## Bukti

Diagnostik read-only (`backend/scripts/diagnose-auth.mjs`):

```text
Database : 127.0.0.1:3306/smk_telkom_purwokerto (mysql)
Kredensial: configured (not printed)
Users     : 0
Admins    : 0
Sessions  : 0
Auth token: 0
Events    : 52 total, 52 published
Login admin tersedia: tidak (tidak ada profil admin)
```

`users` dan `admins` kosong. `backend/src/services/authService.js` hanya mencari user di MySQL lalu memverifikasi Argon2; tidak ada akun default atau fallback. Karena tidak ada baris `users`, setiap login mengembalikan HTTP 401 dengan pesan generik yang sama.

`frontend/.env` memuat `VITE_DEMO_ADMIN_EMAIL` dan `VITE_DEMO_ADMIN_PASSWORD`, tetapi tidak ada kode yang membacanya. Provisioning admin satu-satunya adalah `ADMIN_RECOVERY_*` + `npm run db:seed`, dan variabel itu tidak di-set.

Kesimpulan: **akar masalah adalah data, bukan algoritma password**. Tidak ada akun admin di database yang sedang dipakai backend.

## Masalah sekunder yang ikut diperbaiki

1. **Role admin diambil dari string `users.role`**
   `publicUser()` sebelumnya mengembalikan `role: user.admin ? 'admin' : user.role`. User dengan `users.role = 'admin'` tetapi tanpa baris `admins` akan tampak admin di frontend. Sekarang role admin ditentukan hanya oleh relasi `admins`; string role `admin` yang tertinggal diperlakukan sebagai `applicant`.

2. **Turnstile memblokir login saat diaktifkan**
   `verifyTurnstileToken()` memakai `fetch` mentah tanpa header `x-csrf-token`, padahal `/api/turnstile/verify` berada di belakang `requireCsrf`. Sekarang verifikasi lewat `apiClient` sehingga CSRF ikut terkirim.

3. **Cookie lintas situs**
   Cookie sesi dan CSRF memakai `SameSite=Lax`. Ini benar untuk `localhost:5173` → `localhost:3000` (cookie mengabaikan port), tetapi tidak andal bila frontend dan API berada di domain berbeda. Untuk produksi, sajikan frontend dan API pada satu situs (mis. `https://sekolah.example` + `/api`) atau ubah kebijakan cookie secara sadar menjadi `SameSite=None; Secure` beserta CORS origin eksplisit.

4. **Guest mendapat 403, bukan 401, pada endpoint event**
   Route mutasi event memakai `optionalAuth, requireAdmin` sehingga tamu tanpa sesi mendapat `403`. Sekarang memakai `requireAuth, requireAdmin` seperti router konten lain, sehingga tamu mendapat `401`.

## Prosedur recovery admin yang aman

Jangan membuat akun otomatis dari aplikasi. Gunakan prosedur eksplisit berikut pada database lokal yang benar:

1. Pastikan target database lokal:
   ```bash
   cd backend
   npm run db:diagnose-auth
   ```
   Periksa baris `Database` dan pastikan host `127.0.0.1`/`localhost`, bukan VPS.
2. Buat password recovery yang kuat (12-200 karakter) di password manager.
3. Set sementara di `backend/.env`:
   ```dotenv
   ADMIN_RECOVERY_EMAIL=admin@domain-sekolah.sch.id
   ADMIN_RECOVERY_PASSWORD=<password-kuat>
   ADMIN_RECOVERY_NAME=Administrator
   ```
4. Jalankan:
   ```bash
   npm run db:seed
   ```
   Script memvalidasi email dan panjang password, memakai transaksi, dan idempotent:
   - admin sudah ada → dilewati, tidak ada data diubah;
   - email sudah terdaftar sebagai user tanpa profil admin → **berhenti tanpa mengubah apa pun** kecuali `ADMIN_RECOVERY_ALLOW_EXISTING=true` (hanya untuk akun yang memang milik operator);
   - password tidak pernah dicetak.
5. Login, lalu segera ganti password dari UI.
6. Hapus `ADMIN_RECOVERY_*` dari `.env`.

Script tidak membuat, menghapus, atau mengubah akun lain, dan tidak menyentuh data konten.

## Regression test

`backend/tests/auth-events.test.js` (13 test, semua lulus) mencakup:

- login tanpa CSRF ditolak;
- email tidak ditemukan dan password salah menghasilkan pesan generik yang sama;
- login email uppercase berhasil;
- session disimpan sebagai hash, bukan token mentah;
- `/api/auth/me` membaca session;
- admin melihat draft, guest hanya published;
- applicant dan user tanpa relasi admin tidak bisa mutasi;
- logout menghapus session;
- session kedaluwarsa/tidak dikenal ditolak dan dibersihkan;
- guest mendapat 401 pada endpoint admin;
- validasi tanggal, waktu, kategori, dan URL;
- CRUD event dan 404 saat menghapus id yang tidak ada.

## Risiko tersisa

- Database lokal masih belum memiliki admin sampai prosedur di atas dijalankan. Tidak ada admin yang dibuat selama audit.
- `SameSite=Lax` tetap menjadi batas bila deployment memisahkan domain frontend dan API.
- Rate limit login 10 percobaan / 15 menit per IP dapat tercapai saat pengujian manual berulang.