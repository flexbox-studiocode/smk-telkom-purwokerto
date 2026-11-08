# Audit: Auth State, Public Content, and Safe Fixes — 2026-11-08

## Fakta terverifikasi dari database lokal

| Metric | Nilai |
|---|---:|
| `users` | 0 |
| `admins` | 0 |
| `sessions` | 0 |
| `auth_tokens` | 0 |
| `events` | 52 |
| `events` dengan `status = published` | 52 |
| Target database | `127.0.0.1:3306/smk_telkom_purwokerto` |

Kredensial database terkonfigurasi tetapi tidak dicetak.

Kesimpulan: tidak ada akun atau profil admin yang dapat login pada database lokal ini. Tidak ada admin dibuat selama audit. Semua event yang ada sudah published.

## Diagnostik read-only

`backend/scripts/diagnose-auth.mjs` hanya menjalankan pembacaan (`count`/`findUnique`). Script tidak melakukan `INSERT`, `UPDATE`, atau `DELETE`.

```bash
cd backend
npm run db:diagnose-auth
node scripts/diagnose-auth.mjs --email admin@example.com
node scripts/diagnose-auth.mjs --json
```

Script melaporkan target database tanpa password/URL lengkap, jumlah user/admin/event, ketersediaan login admin, dan untuk satu email: keberadaan akun, relasi admin, status verifikasi, serta klasifikasi prefix hash Argon2/bcrypt. Email disamarkan; hash, token, password, dan kredensial tidak dicetak.

## Perbaikan yang diterapkan

### Turnstile dan CSRF

`frontend/src/components/TurnstileWidget.jsx` sekarang memakai `api.post('/api/turnstile/verify', { token })`, bukan `fetch` mentah. Ini memastikan `apiClient` terlebih dahulu mengambil token CSRF dan mengirim `x-csrf-token`, sesuai `requireCsrf` backend.

### Filter publik yang defensif

Backend sudah memfilter data publik. Frontend kini juga menyaring hasil agar draft tidak muncul jika sesi admin/cookie membuat endpoint mengembalikan seluruh data:

- `getEvents(true)` hanya mengembalikan event published.
- `getSpmbInformation(true)` hanya mengembalikan baris published.
- `getPublishedBerita()` dan `getPublishedPengumuman()` hanya mengembalikan published.
- `getActiveBkk()` hanya mengembalikan BKK aktif.

### Kalender dan normalisasi tanggal

API MySQL mengirim tanggal event sebagai ISO DateTime. Kalender membandingkan `YYYY-MM-DD`; DateTime sebelumnya dapat gagal cocok pada sel kalender. `toCalendarEvent()` sekarang menormalisasi tanggal mulai dan selesai ke `YYYY-MM-DD` sebelum filtering dan rendering.

### Upload gambar event

`EventForm` telah mengirim `image_file`, tetapi service event sebelumnya mengirim objek `File` dalam JSON dan tidak memanggil endpoint upload. `eventService` sekarang mengunggah file ke `POST /api/uploads/content`, memakai URL hasil upload sebagai `gambar_url`, lalu mengirim payload JSON tanpa `image_file`.

Helper yang sama juga melengkapi service berita, pengumuman, prestasi, dan BKK. Endpoint upload tetap memerlukan sesi admin, CSRF, MIME image, magic bytes, dan batas backend 10 MB. Validasi browser tetap membatasi file pada 5 MB.

URL upload lokal (`http://localhost` atau `http://127.0.0.1`) diterima oleh validasi event untuk development. URL HTTP non-loopback tetap ditolak; URL HTTPS tetap diterima.

### Respons HTTP 304

`apiClient` sekarang menangani respons `304 Not Modified` tanpa body: request diulang sekali dengan `cache: 'reload'`. Jika proxy masih mengembalikan 304, service menerima `null` daripada gagal mem-parse body kosong sebagai JSON.

### Guard database test

`backend/tests/setup.js` kini menolak menjalankan suite yang melakukan cleanup fixture pada host database non-local. Host yang diizinkan: `localhost`, `127.0.0.1`, dan IPv6 loopback. Override `ALLOW_REMOTE_TEST_DB=true` hanya untuk database test disposable yang memang dipilih operator.

## Validasi yang dijalankan

| Perintah | Hasil |
|---|---|
| `cd backend && npm test` | PASS: 59/59 (serial, `--test-concurrency=1`) |
| `cd frontend && npm run lint` | PASS |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run publik:uji` | PASS |
| `cd frontend && node scripts/uji-content-image.mjs` | PASS |
| `cd frontend && node scripts/uji-bkk-filter.mjs` | PASS |
| `cd frontend && CI=true npm run build:ci` | PASS (Vite build + prerender 101 route, output offline bukan artefak deploy) |
| `cd backend && npm run prisma:validate` | PASS |

`frontend/scripts/uji-tautan-konten-publik.mjs` gagal pada assertion yang mengharapkan markup Berita tidak mengandung teks `Lihat Prestasi`. Pencarian repository menunjukkan teks tersebut berasal dari data/translasi existing, bukan perubahan audit ini. Script tersebut tidak terdaftar dalam npm scripts dan tidak diubah.

## Batas audit

- Pemeriksaan hanya terhadap database MySQL lokal yang dikonfigurasi saat audit.
- Tidak ada kredensial, hash, token, password, atau URL database lengkap dicatat.
- Tidak ada admin, user, event, atau konten dibuat/diubah oleh diagnostik.
- `backend/package-lock.json` adalah perubahan pengguna yang sudah ada dan tidak disentuh.
