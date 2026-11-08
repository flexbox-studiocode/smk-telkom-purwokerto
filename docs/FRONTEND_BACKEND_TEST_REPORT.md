# Frontend–Backend Integration Test Report

Tanggal: 2026-11-08
Database uji: MySQL lokal `127.0.0.1:3306/smk_telkom_purwokerto` (bukan produksi).

## Keselamatan lingkungan uji

- `DATABASE_URL` divalidasi: host `127.0.0.1`, database `smk_telkom_purwokerto`.
- `backend/tests/setup.js` menolak menjalankan suite yang melakukan cleanup fixture pada host non-local (`localhost`, `127.0.0.1`, `::1`). Override hanya lewat `ALLOW_REMOTE_TEST_DB=true` untuk database test disposable.
- Fixture memakai prefix unik: `authtest-` (auth/event), `test-`, `test-spmb-` (SPMB). Cleanup hanya menghapus baris ber-prefix tersebut dan tidak menyentuh akun/data asli.
- Tidak ada password, hash, token, cookie, atau kredensial yang dicetak dalam log pengujian.

## Backend

| Perintah | Hasil |
|---|---|
| `npm test` (`node --test --test-concurrency=1`) | **PASS 59/59** (duration ~10.3 s) |
| `npm run prisma:validate` | PASS (schema valid) |
| `npm run prisma:generate` | PASS (Prisma Client v7.10.1) |
| `npm run db:status` | PASS (4 migrasi, "Database schema is up to date!") |
| `npm run db:diagnose-auth` | PASS (read-only, 0 user/admin, target lokal) |

Test baru: `backend/tests/auth-events.test.js` (13 test).

Cakupan:

- login tanpa CSRF → 400;
- email tidak ditemukan dan password salah → pesan generik sama;
- login email uppercase → 200, session disimpan sebagai hash, `/api/auth/me` benar;
- admin melihat draft, guest hanya published, detail draft guest → 404;
- header `Cache-Control: no-store` dan tanpa `ETag`; `If-None-Match` → tetap 200;
- applicant dan user tanpa relasi admin → 403 pada mutasi;
- logout → 204, session terhapus, `/api/auth/me` → 401;
- session kedaluwarsa/tidak dikenal → 401 dan dibersihkan;
- guest → 401 pada mutasi event;
- validasi tanggal, waktu (`HH:mm`), kategori, dan URL (`ftp:` ditolak) → 400;
- CRUD event + 404 saat hapus id tidak ada;
- pagination konsisten.

Catatan konfigurasi: test suite kini berjalan serial (`--test-concurrency=1`) karena beberapa file test berbagi satu database MySQL lokal. Sebelumnya, menjalankan file-file test secara paralel membuat proses runner tidak keluar setelah semua test lulus.

## Frontend

| Perintah | Hasil |
|---|---|
| `npm run lint` | PASS (tanpa temuan) |
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm run build:ci` (dengan `CI=true`) | PASS (Vite build 4.23 s, prerender 101 route) |
| `npm run publik:uji` | PASS |
| `node scripts/uji-public-services.mjs` | PASS |
| `node scripts/uji-events.mjs` | PASS |
| `node scripts/uji-content-image.mjs` | PASS |
| `node scripts/uji-bkk-filter.mjs` | PASS (17 pemeriksaan) |

`uji-public-services.mjs` (baru) memverifikasi: filter published event, unggah `image_file` ke `/api/uploads/content`, normalisasi tanggal ISO → `YYYY-MM-DD`, validasi URL loopback, Turnstile lewat `apiClient`, dan penanganan `304` (retry `cache: 'reload'`).

Catatan `build:ci`: mode `--offline` sengaja menghasilkan feed publik kosong dan mencetak `SEO: OFFLINE CI TEST OUTPUT ONLY ... Do not deploy dist.` Script menolak berjalan tanpa `CI=true` di luar lingkungan Vercel. Perintah ini adalah gate build, bukan artefak deploy; gunakan `npm run build` untuk artefak deploy.

## Test yang gagal

| Perintah | Status | Keterangan |
|---|---|---|
| `node scripts/uji-tautan-konten-publik.mjs` | FAIL (pre-existing) | `assert.ok(!berita.includes('Lihat Prestasi'))` di baris 44. Teks berasal dari `frontend/src/data/dummyData.js` (`ctaText`/`linkText`) dan `translationsPublic.js`, bukan dari perubahan audit ini. Komponen `BeritaHeroSection`, `dummyData.js`, dan `translationsPublic.js` tidak diubah. Script ini juga tidak terdaftar di `npm test`. |

Tidak ada test baru dari perubahan ini yang gagal.

## Reproduksi sebelum/sesudah

| Masalah | Sebelum | Sesudah |
|---|---|---|
| Login admin | `users=0`, `admins=0` → selalu 401 | Prosedur recovery env-driven + 13 regression test login |
| Kalender | `Intl.format(Invalid Date)` → RangeError → "Halaman Mengalami Gangguan" | `toCalendarEvent` menormalisasi ke `YYYY-MM-DD`; kalender render |
| `GET /api/events` | ETag aktif, 304 mungkin | `ETag=` kosong, `Cache-Control: private, no-store, max-age=0`, selalu 200 |
| Guest mutasi event | 403 | 401 |
| `image_file` | dikirim di JSON, gagal | diunggah ke `/api/uploads/content` lalu diganti URL |

## Risiko tersisa

- **Admin belum ada di database lokal.** Perbaikan kode tidak membuat admin. Jalankan prosedur di `docs/LOGIN_ADMIN_ROOT_CAUSE.md` pada database yang benar sebelum mengklaim login selesai secara end-to-end.
- **Cookie lintas domain.** `SameSite=Lax` benar untuk localhost, tetapi deployment multi-domain memerlukan satu situs atau `SameSite=None; Secure` yang dikonfigurasi sadar.
- **Edge/CDN.** `no-store` dari origin mengatasi 304 pada origin dan Express, tetapi kebijakan cache proxy harus diverifikasi saat deployment. Frontend masih punya fallback retry 304.
- **Test UI browser (Playwright) tidak dijalankan** dalam audit ini; verifikasi terbatas pada SSR/unit script, lint, typecheck, build, dan HTTP integration test.
- **Utang teknis**: beberapa halaman admin masih memeriksa kode error era Supabase (`23505`, `PGRST205`, `42P01`) yang tidak lagi dihasilkan backend; tidak memblokir alur utama.
