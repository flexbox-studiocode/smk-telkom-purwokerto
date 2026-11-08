# Root Cause: Kalender Kegiatan Gagal

Tanggal audit: 2026-11-08

## Gejala

1. Halaman `/kalender` menampilkan **"Halaman Mengalami Gangguan."**
2. DevTools mencatat `GET /api/events?limit=100&page=1` → HTTP 304.

## Akar masalah 1: tanggal ISO dipakai sebagai date key

API mengembalikan kolom MySQL `DATE` melalui Prisma sebagai ISO DateTime penuh. Bukti langsung dari server lokal:

```text
judul        : Libur Tahun Pelajaran (Juli 2026)
tanggalMulai : 2026-07-01T00:00:00.000Z
status       : published
```

Rantai kegagalan:

```text
eventService.normalize()
  → tanggal_mulai = "2026-07-01T00:00:00.000Z"
utils/events.toCalendarEvent()
  → date = "2026-07-01T00:00:00.000Z"        (bukan YYYY-MM-DD)
utils/calendar.dateFromKey()
  → new Date("2026-07-01T00:00:00.000ZT00:00:00Z")  → Invalid Date
CalendarBoard.formatDate()
  → Intl.DateTimeFormat.format(Invalid Date)
  → RangeError: Invalid time value
RouteErrorBoundary
  → ErrorPage kind="application"
  → "Halaman Mengalami Gangguan"
```

Diverifikasi empiris dengan Node:

```text
THROWS: RangeError Invalid time value
valid normalized: 6 Oktober 2030
```

Perbaikan: `frontend/src/utils/calendar.js` menambah `normalizeDateKey()`; `toCalendarEvent()` memakai helper itu untuk `date` dan `endDate`, sehingga seluruh kalender menerima `YYYY-MM-DD`. Data API lain (SPMB) juga sudah menormalisasi tanggal dengan pola yang sama.

Catatan: kalender admin juga memakai `toCalendarEvent()`, sehingga perbaikan yang sama memperbaiki halaman admin. `EventForm` tetap menerima `YYYY-MM-DD` karena input `type="date"`.

## Akar masalah 2: HTTP 304 pada JSON API

Express mengaktifkan ETag lemah secara default untuk `res.json()`. Browser dapat mengirim `If-None-Match`; Express lalu membalas `304 Not Modified` **tanpa body**. Endpoint ini tidak memakai conditional GET secara sengaja, dan responsnya bergantung sesi (admin melihat draft, guest tidak), sehingga validator cache justru berisiko.

`frontend/src/services/apiClient.js` juga mem-parse body kosong sebagai JSON dan memperlakukan `304` sebagai error (`fetch` `ok === false` untuk 304).

Perbaikan dua lapis:

1. **Backend (`backend/src/app.js`)**
   - `app.set('etag', false)` — API tidak lagi menghasilkan ETag.
   - Middleware `/api` menetapkan `Cache-Control: private, no-store, max-age=0` dan `Pragma: no-cache`.
   - Route statis `/uploads/content-images` tetap memakai cache validators miliknya sendiri.
2. **Frontend (`apiClient.js`)**
   - Default `cache: 'no-store'`.
   - Bila tetap menerima `304`, request diulang sekali dengan `cache: 'reload'`.
   - Body non-JSON di-parse aman (`parseBody`) agar HTML/teks dari proxy tidak menjadi `SyntaxError`.
   - `304` tanpa body tidak lagi dianggap error.

Verifikasi langsung terhadap server lokal setelah perbaikan:

```text
STATUS=200
ETAG=
CACHE=private, no-store, max-age=0
BODY={"data":[...]}
```

Request dengan `If-None-Match: W/"stale"` tetap menghasilkan `200`.

## Akar masalah 3: filter `published` diabaikan

`useEvents(true)` bermaksud memuat hanya event published, tetapi `getEvents()` membuang parameter dengan `void published`. Backend mengembalikan draft bila cookie admin ikut terkirim, sehingga halaman publik dapat menampilkan draft.

Perbaikan: `getEvents(published)` menyaring `status === 'published'` di frontend. Backend tetap memfilter `{ status: 'published' }` untuk guest. Pola yang sama diterapkan pada berita, pengumuman, BKK, dan SPMB.

## Akar masalah 4: unggah gambar event tidak pernah dikirim

`EventForm` mengirim `image_file`, tetapi `eventService` mengirim objek `File` di dalam JSON. Backend menolak properti tak dikenal dan file tidak pernah diunggah.

Perbaikan:

- helper baru `frontend/src/services/contentImage.js` → `withUploadedImage(data, field)`;
- jika ada `image_file`, unggah ke `POST /api/uploads/content`, lalu pakai `url` hasilnya sebagai `gambar_url`/`logo_url`;
- `image_file` dihapus dari payload JSON;
- diterapkan pada event, berita, pengumuman, prestasi, dan BKK.

## Perbaikan validasi backend event

`backend/src/routes/events.js` sekarang:

- memvalidasi waktu dengan regex `HH:mm` (sebelumnya hanya `max(8)`);
- menolak URL non-HTTP/HTTPS dan URL dengan kredensial;
- menolak `tanggal_selesai < tanggal_mulai`;
- menolak `waktu_selesai <= waktu_mulai` pada hari yang sama;
- memvalidasi PATCH terhadap nilai gabungan dengan data tersimpan;
- memakai `requireAuth` untuk mutasi (guest → 401);
- mengembalikan 404 saat menghapus id yang tidak ada (sebelumnya Prisma P2025 → 500).

## Regression test

- `backend/tests/auth-events.test.js`: filter draft/published, CRUD, validasi tanggal/waktu/kategori/URL, 401/403, cache header, pagination.
- `frontend/scripts/uji-public-services.mjs`: normalisasi tanggal, filter published, unggah gambar, Turnstile via `apiClient`, penanganan 304.
- `packages`: `frontend/package.json` menambah `publik:uji` (script ini + `uji-events.mjs`).

## Risiko tersisa

- Bila CDN/reverse proxy di depan API tetap memaksa cache sendiri, `no-store` dari origin seharusnya dihormati, tetapi konfigurasi proxy harus diverifikasi saat deployment. Frontend tetap punya fallback retry 304.
- `build:ci` menghasilkan `dist` mode offline (feed publik kosong) dan tidak boleh dipakai untuk deploy. Gunakan `npm run build` untuk artefak deploy.