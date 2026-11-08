# Final Authentication Report

Tanggal: 2026-11-08
Repo: `https://github.com/flexbox-studiocode/smk-telkom-purwokerto`
Backend: Express + Prisma + MySQL (MariaDB adapter)

---

## Root Cause: Login Admin Selalu Gagal

**Gejala:** Halaman `/login` selalu menampilkan `Email atau password salah.` untuk
semua kredensial.

**Bukti diagnostik:**

```bash
cd backend && node scripts/diagnose-auth.mjs --email admin@smktelkom-pwt.sch.id
```

```
Database : 127.0.0.1:3306/smk_telkom_purwokerto (mysql)
Users     : 0
Admins    : 0
Login admin tersedia: tidak (tidak ada profil admin)
Status   : DATABASE_CONNECTED=true USER_FOUND=false ADMIN_PROFILE_FOUND=false
           PASSWORD_HASH_VALID=null ACCOUNT_RECOVERY_REQUIRED=true
```

**Akar masalah:** Database MySQL kosong — tidak ada baris di tabel `users` maupun
`admins`. Kode autentikasi (`authService.js`) hanya mencari user di MySQL, tidak ada
fallback atau akun default. Setiap login mengembalikan HTTP 401 dengan pesan generik
"Email atau password salah." karena tidak ada baris yang cocok.

Bukan bug algoritma. Bukan bug Argon2. Bukan bug session. Semuanya berfungsi dengan
benar — data yang tidak ada.

---

## Perbaikan yang Sudah Diterapkan Sebelumnya

Audit terdahulu (2026-11-08) sudah memperbaiki:

1. **`publicUser()` role derivation**: Role admin sekarang ditentukan oleh relasi
   `admins`, bukan oleh string `users.role` yang bisa tertinggal. User dengan
   `role = 'admin'` tetapi tanpa baris `admins` diperlakukan sebagai applicant.
2. **CSRF via apiClient**: `TurnstileWidget` sekarang menggunakan `api.post()` sehingga
   CSRF token ikut terkirim, bukan `fetch` mentah yang tidak menyertakan cookie CSRF.
3. **Event auth boundary**: Endpoint admin event sekarang mengembalikan 401 (bukan
   403) untuk tamu tanpa sesi.
4. **SameSite cookie**: Cookie sesi dan CSRF menggunakan `SameSite=Lax`. Ini benar
   untuk localhost, tetapi untuk deployment multi-domain perlu `SameSite=None; Secure`
   dengan CORS origin eksplisit.

---

## Perbaikan yang Diterapkan Sekarang

### 1. Diagnostik Akun dengan Lima Status Kunci

`backend/scripts/diagnose-auth.mjs` sekarang menampilkan lima kunci status untuk
konsultasi otomasi dan QA:

- `DATABASE_CONNECTED` — database dapat dijangkau.
- `USER_FOUND` — akun email ditemukan di tabel `users`.
- `ADMIN_PROFILE_FOUND` — akun memiliki relasi `admins` (hak administrator).
- `PASSWORD_HASH_VALID` — password cocok dengan hash Argon2 (null jika tidak diuji).
- `ACCOUNT_RECOVERY_REQUIRED` — true jika tidak ada admin yang dapat login.

Tidak ada hash, token, password, atau credential yang dicetak.

### 2. SPMB Internal Feature Flag (Reversible)

**Default: nonaktif.** SMK Telkom Purwokerto menggunakan portal resmi Yayasan Telkom
Schools (`https://ppdb.telkomschools.sch.id/welcome`).

**Backend:**
- `backend/src/config/features.js` — `isSpmbInternalEnabled()` membaca `SPMB_INTERNAL_ENABLED`.
- `backend/src/middleware/spmbGate.js` — `blockSpmbMutations()` mengembalikan HTTP 503
  `SPMB_DISABLED` untuk semua mutasi PPDB/SPMB ketika flag false.
- `backend/src/routes/config.js` — `GET /api/config` mengembalikan status fitur
  publik `{spmbInternalEnabled, officialAdmissionsUrl}`.
- Mount di `app.js`: gate di `/api/ppdb`, `/api/spmb`, `/api/admin/ppdb`,
  `/api/uploads/ppdb-documents`. Pembacaan historis tetap tersedia.
- `backend/.env.example` dan `backend/src/config/env.js` mendokumentasikan variabel.

**Frontend:**
- `frontend/src/context/AppConfigContext.jsx` — provider yang fetch `/api/config`
  dan menyediakan `spmbInternalEnabled` ke seluruh komponen.
- `frontend/src/services/appConfigService.js` — fetch dengan fallback aman
  (nonaktif) bila endpoint tidak tersedia.
- `frontend/src/main.jsx` — `AppConfigProvider` membungkus aplikasi.
- `frontend/src/utils/admissions.js` — `isHiddenAdmissionsPath()` sekarang
  menerima opsi `{spmbInternalEnabled}`.
- `frontend/src/App.jsx` — gate menggunakan flag runtime; tunggu config load
  sebelum redirect; `SpmbInternalGate` membungkus halaman admin SPMB.
- `frontend/src/components/dashboard/DashboardSidebar.jsx` — menu SPMB
  internal disembunyikan saat flag false.
- `frontend/src/pages/dashboard/DashboardHomePage.jsx` — ringkasan SPMB
  dan tombol manajemen disembunyikan saat flag false.
- `frontend/src/pages/SpmbPage.jsx` — CTA pendaftaran mengikuti flag.
- `frontend/src/pages/dashboard/SpmbInternalGate.jsx` — notifikasi + link
  portal resmi saat fitur nonaktif.
- `frontend/scripts/uji-spmb-feature-flag.mjs` + npm script `spmb:flag`.

### 3. Endpoint Non-PPDB Upload Tidak Terdampak

`POST /api/uploads/content` (upload gambar berita/prestasi) tidak di-gate.
Validasi magic bytes, MIME type, dan batas 10 MB tetap berjalan. Tidak ada
data atau modul yang dihapus.

### 4. Dokumentasi

- `docs/ADMIN_ACCOUNT_RECOVERY.md` — struktur akun, cara memeriksa, prosedur
  provisioning admin, keamanan, cleanup.
- `docs/SPMB_INTERNAL_FEATURE_FLAG.md` — alasan, default, cara mengaktifkan,
  endpoint terdampak, perilaku frontend/backend, testing dua kondisi.
- `docs/FINAL_AUTHENTICATION_REPORT.md` — laporan ini.

---

## Regression Test Coverage

### Auth (`backend/tests/auth-events.test.js`, 13 test)
- CSRF token required → 400
- Unknown email = wrong password → 401, pesan generik sama
- Admin login normalize uppercase, hashed session stored
- `/api/auth/me` returns correct role
- Admin sees drafts, guest only published
- Applicant login, cannot mutate
- User without admin relation → role=applicant
- Logout clears session and DB row
- Expired/unknown session → 401 + cleanup
- Guest cannot POST/DELETE event endpoints → 401
- Event validation rejects bad dates/times/categories/URLs
- Event CRUD: create draft → publish → visible to guests → delete → 404
- Pagination consistency

### SPMB Feature Flag (`backend/tests/spmb-feature-flag.test.js`, 4 test)
- Config reports `spmbInternalEnabled: false` by default
- Disabled: POST/DELETE mutations return 503 `SPMB_DISABLED`
- Disabled: historical reads and non-PPDB uploads stay functional
- Enabled: config flips, mutations unblocked

### Frontend Feature Flag (`frontend/scripts/uji-spmb-feature-flag.mjs`)
- Disabled: internal paths hidden
- Enabled: internal paths visible, `/spmb` stays public
- Config service: enabled/disabled/fallback
- Source files contain gate wiring tokens

---

## Batas Testing

- Test auth menjalankan di database lokal yang dikonfigurasi di `backend/.env`
  (`127.0.0.1`). Guard mencegah running terhadap host non-local kecuali
  `ALLOW_REMOTE_TEST_DB=true`.
- Frontend test tidak memodifikasi database; hanya membaca modul dan mocking fetch.
- Tidak ada testing terhadap credential produksi.
- Tidak ada deployment ke VPS. Semua berjalan di environment lokal/repository.

---

## Kondisi sebelum perbaikan ini

| Metric | Sebelum | Sesudah |
|---|---|---|
| Admin dapat login | Tidak (0 akun) | Ya (sesuai prosedur recovery) |
| Session hashed | ✓ | ✓ |
| CSRF required | ✓ | ✓ |
| Role dari relasi | N/A | ✓ |
| SPMB feature flag | Tidak ada | Nonaktif default, reversible |
| Admin provisioning script | seed.mjs | seed.mjs + diagnostik |
| Dokumentasi admin | Tidak ada | ADMIN_ACCOUNT_RECOVERY.md |
| Dokumentasi SPMB | Tidak ada | SPMB_INTERNAL_FEATURE_FLAG.md |

---

## Checklist Sebelum Mengklaim Selesai

- [x] `node scripts/diagnose-auth.mjs` menampilkan status 5 kunci.
- [ ] Login admin berhasil setelah provisioning operator. Database lokal masih 0 user / 0 admin.
- [x] `npm test` backend PASS (63/63).
- [x] `npm run spmb:flag` frontend PASS.
- [x] `npm run lint` frontend PASS.
- [x] `npm run typecheck` frontend PASS.
- [x] `CI=true npm run build:ci` frontend PASS (offline; ada warning WebSocket port 24678 sudah digunakan).
- [x] `npm run prisma:validate` backend PASS.
- [x] `npm run db:status` backend PASS.
- [x] `.env` dan `.env.*` di-ignore Git; hanya `.env.example` dilacak.
- [x] Dokumentasi tersedia: ADMIN_ACCOUNT_RECOVERY.md, SPMB_INTERNAL_FEATURE_FLAG.md, FINAL_AUTHENTICATION_REPORT.md.
