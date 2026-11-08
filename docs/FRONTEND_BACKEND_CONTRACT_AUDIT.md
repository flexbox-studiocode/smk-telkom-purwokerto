# Frontend–Backend Contract Audit

Tanggal: 2026-11-08
Cakupan: Auth/Admin, Kalender Event, Prestasi, BKK, Berita, Pengumuman.
Sumber kebenaran: `backend/prisma/schema.prisma`, `backend/src/routes/*`, `backend/src/validators/*`, `frontend/src/services/*`, dan komponen form terkait.

Status yang dipakai: `MATCH`, `FRONTEND ONLY`, `BACKEND ONLY`, `DATABASE MISSING`, `TYPE MISMATCH`, `VALIDATION MISMATCH`, `BUG FOUND`.

## Ringkasan temuan

| # | Modul | Temuan | Layer yang diperbaiki | Status akhir |
|---|---|---|---|---|
| 1 | Auth | Tidak ada user/admin di database lokal; login selalu 401 | Data/provisioning, bukan kode verifikasi | BUG FOUND → prosedur recovery |
| 2 | Auth | Role admin dibaca dari string `users.role`, bukan relasi `admins` | Backend `authService.publicUser` | BUG FOUND → MATCH |
| 3 | Auth | Turnstile verify tidak mengirim CSRF | Frontend `TurnstileWidget` | BUG FOUND → MATCH |
| 4 | Auth | Guest mutasi event → 403 | Backend `routes/events` | BUG FOUND → MATCH (401) |
| 5 | Event | Tanggal ISO penuh dipakai sebagai date key → RangeError | Frontend `utils/calendar`, `utils/events` | BUG FOUND → MATCH |
| 6 | Event | Parameter `published` diabaikan | Frontend `eventService` | BUG FOUND → MATCH |
| 7 | Event | `image_file` dikirim ke JSON, tidak pernah diunggah | Frontend service + helper upload | BUG FOUND → MATCH |
| 8 | Event | Waktu hanya `max(8)`, tanpa pola/rentang | Backend `routes/events` | VALIDATION MISMATCH → MATCH |
| 9 | Event | URL menerima skema non-web | Backend event/content validator | VALIDATION MISMATCH → MATCH |
| 10 | Event | GET JSON menghasilkan ETag/304 | Backend `app.js`, frontend `apiClient` | BUG FOUND → MATCH |
| 11 | Berita/Pengumuman/BKK/SPMB | Alias "published/active" tidak menyaring saat sesi admin | Frontend services | BUG FOUND → MATCH |
| 12 | Berita/Pengumuman/Prestasi/BKK | `image_file` tidak diunggah | Frontend services | BUG FOUND → MATCH |

## Auth dan Admin

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `email` (login, trim) | `loginSchema.email` → `toLowerCase().trim()` | `users.email` VARCHAR(254) UNIQUE | MATCH |
| `password` | `loginSchema.password` min 8 max 200, Argon2 verify | `users.password_hash` VARCHAR(255) | MATCH |
| `user.id` | `publicUser.id` | `users.id` CHAR(36) | MATCH |
| `user.email` | `publicUser.email` | `users.email` | MATCH |
| `user.role` | `publicUser.role` diturunkan dari relasi `admins` | `admins.user_id` UNIQUE → `users.id` | BUG FOUND → MATCH |
| `user.emailVerified` | boolean dari `emailVerified` | `users.email_verified` DATETIME nullable | MATCH |
| session cookie `session_token` | token acak; DB menyimpan `hashToken(token)` | `sessions.token_hash` CHAR(64) UNIQUE | MATCH |
| `expiresAt` | `now + 7 hari` | `sessions.expires_at` | MATCH |
| CSRF `csrf_token` (cookie non-httpOnly) | `requireCsrf` membandingkan cookie + `x-csrf-token` | — | MATCH |
| Turnstile token | `POST /api/turnstile/verify` | — | BUG FOUND → MATCH |
| — | `Admin.nama` | `admins.nama` VARCHAR(180) | BACKEND ONLY (dipakai profil admin) |

Catatan:
- `ADMIN_RECOVERY_*` bukan field runtime; provisioning divalidasi (email, password 12-200), transaksional, idempotent, dan tidak mencetak password.
- Cookie: `httpOnly`, `SameSite=Lax`, `Secure` saat `NODE_ENV=production`, `path=/`.

## Kalender Event

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `judul` | `judul` | `events.judul` VARCHAR(180) | MATCH |
| `ringkasan` | `ringkasan` default `''` | `events.ringkasan` VARCHAR(500) | MATCH |
| `deskripsi` | `deskripsi` | `events.deskripsi` TEXT | MATCH |
| `kategori` | `EVENT_CATEGORIES` / enum | `events.kategori` ENUM `EventCategory` | MATCH |
| `tanggal_mulai` | `z.coerce.date()` | `events.tanggal_mulai` DATE | TYPE MISMATCH (DATE → ISO saat dibaca) → dinormalisasi di frontend |
| `waktu_mulai` | regex `HH:mm`, nullable | `events.waktu_mulai` VARCHAR(8) | VALIDATION MISMATCH → MATCH |
| `tanggal_selesai` | `z.coerce.date().nullable()` | `events.tanggal_selesai` DATE nullable | TYPE MISMATCH → dinormalisasi di frontend |
| `waktu_selesai` | regex `HH:mm`, nullable | `events.waktu_selesai` VARCHAR(8) | VALIDATION MISMATCH → MATCH |
| `lokasi` | `lokasi` default `''` | `events.lokasi` VARCHAR(240) | MATCH |
| `penyelenggara` | `penyelenggara` default `''` | `events.penyelenggara` VARCHAR(160) | MATCH |
| `gambar_url` | URL HTTP/HTTPS | `events.gambar_url` VARCHAR(2048) | MATCH |
| `link_informasi` | URL HTTP/HTTPS | `events.link_informasi` VARCHAR(2048) | MATCH |
| `status` | enum `draft`/`published` | `events.status` ENUM `ContentStatus` | MATCH |
| `created_at`, `updated_at` | `createdAt`, `updatedAt` | kolom `created_at`, `updated_at` | MATCH |
| `image_file` | **tidak ada** (dihapus sebelum request) | — | FRONTEND ONLY → diunggah lebih dulu ke `/api/uploads/content` |

Perilaku akses:
- Guest: list/detail hanya `published`.
- Admin: list/detail semua status.
- Mutasi: `requireAuth` + `requireAdmin`.
- Pagination: `page`, `limit` (maks 100), `total`, `pages`.

Bug yang diperbaiki: normalisasi tanggal, filter published, unggah gambar, ETag/304, validasi waktu/rentang/URL, status 401/404.

## Prestasi

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `judul` | `judul` | `prestasi.judul` VARCHAR(255) | MATCH |
| `slug` | `slug` | `prestasi.slug` VARCHAR(255) UNIQUE | MATCH |
| `kategori` | `kategori` nullable | `prestasi.kategori` VARCHAR(120) | MATCH |
| `deskripsi` | `deskripsi` | `prestasi.deskripsi` TEXT | MATCH |
| `gambar_url` | `gambar_url` URL | `prestasi.gambar_url` VARCHAR(2048) | MATCH |
| `instagram_url` | `instagram_url` URL | `prestasi.instagram_url` VARCHAR(2048) | MATCH |
| `tingkat` | `tingkat` nullable | `prestasi.tingkat` VARCHAR(120) | MATCH |
| `tanggal` | `z.coerce.date().nullable()` | `prestasi.tanggal` DATETIME nullable | TYPE MISMATCH (ISO) → form/detail memakai `slice(0,10)` |
| `created_at`, `updated_at` | `createdAt`, `updatedAt` | kolom terkait | MATCH |
| `image_file` | — | — | FRONTEND ONLY → diunggah ke `/api/uploads/content` |

Detail memakai `id` atau `slug`; backend memakai `findFirst({ OR: [...] })`. Prestasi tidak memiliki status draft/published, sehingga publik melihat semua baris — sesuai model.

## BKK

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `perusahaan` | `perusahaan` | `bkk.perusahaan` VARCHAR(255) | MATCH |
| `posisi` | `posisi` | `bkk.posisi` VARCHAR(255) | MATCH |
| `deskripsi` | `deskripsi` nullable | `bkk.deskripsi` TEXT | MATCH |
| `lokasi` | `lokasi` nullable | `bkk.lokasi` VARCHAR(255) | MATCH |
| `tipe_pekerjaan` | `tipe_pekerjaan` | `bkk.tipe_pekerjaan` VARCHAR(100) | MATCH |
| `deadline` | `z.coerce.date().nullable()` | `bkk.deadline` DATETIME nullable | MATCH |
| `status` | enum `aktif`/`ditutup` | `bkk.status` ENUM `BkkStatus` | MATCH |
| `link_pendaftaran` | URL HTTP/HTTPS | `bkk.link_pendaftaran` VARCHAR(2048) | MATCH |
| `logo_url` | URL HTTP/HTTPS | `bkk.logo_url` VARCHAR(2048) | MATCH |
| `created_at`, `updated_at` | `createdAt`, `updatedAt` | kolom terkait | MATCH |
| `image_file` | — | — | FRONTEND ONLY → diunggah sebagai `logo_url` |

Perilaku publik: backend memfilter `{ status: 'aktif' }`; frontend `getActiveBkk()` juga menyaring `aktif`. Admin tetap melihat semua status. Deadline lampau tidak otomatis dianggap ditutup; status adalah sumber kebenaran.

## Berita

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `judul` | `judul` | `berita.judul` VARCHAR(255) | MATCH |
| `slug` | `slug` | `berita.slug` VARCHAR(255) UNIQUE | MATCH |
| `ringkasan` | `ringkasan` nullable | `berita.ringkasan` TEXT | MATCH |
| `konten` | `konten` | `berita.konten` LONGTEXT | MATCH |
| `gambar_url` | URL HTTP/HTTPS | `berita.gambar_url` VARCHAR(2048) | MATCH |
| `penulis` | `penulis` nullable | `berita.penulis` VARCHAR(180) | MATCH |
| `status` | enum `draft`/`published` | `berita.status` ENUM `ContentStatus` | MATCH |
| `created_at`, `updated_at` | `createdAt`, `updatedAt` | kolom terkait | MATCH |
| `image_file` | — | — | FRONTEND ONLY → diunggah ke `/api/uploads/content` |

Publik hanya `published` (backend + frontend). Detail memakai slug. Pagination `limit=100` di service; endpoint mendukung `page`/`limit`.

## Pengumuman

| Field Frontend | Field Backend | Field Database | Status |
|---|---|---|---|
| `judul` | `judul` | `pengumuman.judul` VARCHAR(255) | MATCH |
| `slug` | `slug` | `pengumuman.slug` VARCHAR(255) UNIQUE | MATCH |
| `ringkasan` | `ringkasan` nullable | `pengumuman.ringkasan` TEXT | MATCH |
| `konten` | `konten` | `pengumuman.konten` LONGTEXT | MATCH |
| `gambar_url` | URL HTTP/HTTPS | `pengumuman.gambar_url` VARCHAR(2048) | MATCH |
| `status` | enum `draft`/`published` | `pengumuman.status` ENUM `ContentStatus` | MATCH |
| `tanggal` | `z.coerce.date().nullable()` | `pengumuman.tanggal` DATETIME nullable | MATCH (bisa ISO; UI memakai slice tanggal) |
| `created_at`, `updated_at` | `createdAt`, `updatedAt` | kolom terkait | MATCH |
| `image_file` | — | — | FRONTEND ONLY → diunggah ke `/api/uploads/content` |

Publik hanya `published` (backend + frontend). CRUD admin memakai endpoint yang sama.

## Catatan kontrak lintas modul

- Semua endpoint konten memakai `optionalAuth` untuk GET list/detail dan `requireAuth + requireAdmin` untuk mutasi. Tidak ada endpoint baru yang dibuat.
- `mapContentInput` menerjemahkan snake_case frontend ke camelCase Prisma untuk: `gambar_url`, `instagram_url`, `tipe_pekerjaan`, `link_pendaftaran`, `logo_url`.
- Frontend mengirim sebagian field camelCase tambahan pada event/SPMB; Zod mengabaikan key tak dikenal, tetapi payload event sudah dirapikan ke bentuk snake_case sebelum dikirim.
- Error backend memakai `{ error, code, details }` (`validation_error`, `duplicate`, `not_found`, `unauthorized`, `forbidden`, `bad_request`). Beberapa halaman admin masih memeriksa kode era Supabase (`23505`, `PGRST205`, `42P01`); ini tidak lagi aktif dan tidak memblokir alur utama, tetapi kode mati tersebut tercatat sebagai utang teknis.
- Validasi URL backend menerima HTTP dan HTTPS tanpa kredensial. Frontend event membatasi ke HTTPS, dengan pengecualian HTTP loopback (`localhost`/`127.0.0.1`) untuk media hasil unggahan lokal.

## Regression test yang menutup kontrak

| Area | Test |
|---|---|
| Auth/session/CSRF | `backend/tests/auth-events.test.js` |
| Event CRUD/validasi/filter/cache | `backend/tests/auth-events.test.js` |
| SPMB admin CRUD & publikasi | `backend/tests/spmb.test.js` |
| Filter published/active + upload + 304 | `frontend/scripts/uji-public-services.mjs` |
| Normalisasi tanggal & kategori | `frontend/scripts/uji-events.mjs` |
| Filter BKK | `frontend/scripts/uji-bkk-filter.mjs` |
| Unggah gambar konten | `frontend/scripts/uji-content-image.mjs` |