# Admin Account Recovery

## Struktur User / Admin

Sistem autentikasi menggunakan dua tabel yang saling berelasi:

```
users (id, email, passwordHash, role, emailVerified)
  └── admins (userId, nama)  ← relasi 1-1 via userId
```

`role` di tabel `users` hanya bernilai `applicant` secara default. Hak administrator
ditentukan oleh keberadaan relasi `admins`, bukan oleh string `role`. Ini berarti:

- User dengan `role = 'admin'` tetapi tanpa baris `admins` akan diperlakukan sebagai
  `applicant` di sistem ini.
- User dengan `role = 'applicant'` tetapi memiliki baris `admins` akan memiliki akses
  penuh sebagai administrator.

## Cara Memeriksa Akun

Jalankan diagnostik read-only:

```bash
cd backend
node scripts/diagnose-auth.mjs
node scripts/diagnose-auth.mjs --email admin@smktelkom-pwt.sch.id
```

Output menampilkan (tanpa memunculkan hash/password/token):

```
Database : 127.0.0.1:3306/smk_telkom_purwokerto (mysql)
Users     : 0
Admins    : 0
Login admin tersedia: tidak (tidak ada profil admin)
Status   : DATABASE_CONNECTED=true USER_FOUND=false ADMIN_PROFILE_FOUND=false
           PASSWORD_HASH_VALID=null ACCOUNT_RECOVERY_REQUIRED=true
```

Untuk memverifikasi password yang sudah ada, set variabel lingkungan DIAGNOSE_PASSWORD
(prioritas lebih tinggi dari ADMIN_RECOVERY_PASSWORD):

```bash
DIAGNOSE_PASSWORD=PasswordYangDiCoba node scripts/diagnose-auth.mjs --email admin@smktelkom-pwt.sch.id
```

## Cara Membuat Akun Admin

**Prasyarat:** database MySQL lokal berjalan. Cek dengan `npm run db:status`.

**Langkah:**

1. Buat password yang kuat (12–200 karakter). Gunakan password manager.
2. Set variabel di `backend/.env` (sementara):

```dotenv
ADMIN_RECOVERY_EMAIL=admin@smktelkom-pwt.sch.id
ADMIN_RECOVERY_PASSWORD=PasswordYangKuatDanUnikDisini123456
ADMIN_RECOVERY_NAME=Administrator
ADMIN_RECOVERY_ALLOW_EXISTING=false
```

3. Jalankan provisioning:

```bash
cd backend
npm run db:seed
```

Output bila berhasil:
```
Admin recovery dibuat: admin@smktelkom-pwt.sch.id
PENTING: Hapus ADMIN_RECOVERY_* dari .env dan ganti password segera setelah login pertama.
```

4. Login di `/login` dengan email dan password tersebut.
5. **Segera ubah password dari UI Admin Panel → Pengaturan → Akun.**
6. Hapus baris `ADMIN_RECOVERY_*` dari `backend/.env`.

## Persyaratan Password

- Minimum 12 karakter, maksimum 200 karakter.
- Di-hash menggunakan Argon2id sebelum disimpan.
- Tidak pernah dicetak ke konsol atau log.

## Prosedur Keamanan

1. **Hapus variabel recovery setelah provisioning.** Menyimpan `ADMIN_RECOVERY_*` di `.env`
   membuat akun dapat dipulihkan ulang tanpa otentikasi — sengaja untuk satu waktu.
2. **Tidak ada akun default yang di-seed secara otomatis.** Tidak ada akun hardcoded di kode
   atau migration. Setiap admin harus di-provision melalui prosedur ini.
3. **Idempotent:** menjalankan `npm run db:seed` ketika admin sudah ada tidak mengubah
   data apapun. Jika email sudah ada sebagai user tanpa profil admin, provisioning berhenti
   dan menampilkan instruksi untuk `ADMIN_RECOVERY_ALLOW_EXISTING=true` — hanya jika akun
   tersebut memang milik operator.
4. **Transaksional:** user dan admin dibuat/diupdate dalam satu transaksi database.
   Gagal di tengah tidak meninggalkan data paruh.

## Membersihkan Environment Variables Recovery

Setelah akun admin dibuat dan password diganti:

```bash
# Verifikasi akun sudah ada
node scripts/diagnose-auth.mjs --email admin@smktelkom-pwt.sch.id
# Output harus: ADMIN_PROFILE_FOUND=true

# Hapus variabel recovery dari .env
# (secara manual hapus tiga baris ADMIN_RECOVERY_* dari backend/.env)
```

Tidak ada script otomatis untuk menghapus variabel karena modifikasi `.env` manual
lebih aman (menjamin operator menyadari perubahan).

## Troubleshooting

**"Email ... sudah terdaftar sebagai user tanpa profil admin"**
Email tersebut sudah ada di tabel `users` tetapi bukan administrator. Jika Anda yakin
akun tersebut milik Anda, set `ADMIN_RECOVERY_ALLOW_EXISTING=true` di `.env` lalu
jalankan `npm run db:seed`.

**Login tetap gagal setelah provisioning**
1. Pastikan email yang digunakan persis sama (case-insensitive, spasi di-trim).
2. Pastikan `DATABASE_URL` di `.env` menunjuk ke database yang sama dengan yang
   di-provision. Cek `node scripts/diagnose-auth.mjs`.
3. Pastikan tidak ada typo di password.

**Tidak ada akses ke MySQL lokal**
Ikuti `docs/MYSQL_SETUP_GUIDE.md` untuk memulai MySQL via Laragon atau layanan lain.
