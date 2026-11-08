# SPMB Internal Feature Flag

## Mengapa Internal SPMB Dinonaktifkan

SMK Telkom Purwokerto sudah menggunakan portal resmi SPMB dari Yayasan Telkom Schools:

**Portal resmi:** https://ppdb.telkomschools.sch.id/welcome

Portal resmi ini dikelola secara terpusat oleh yayasan, memberikan pengalaman pendaftaran
yang konsisten dan terstandarisasi untuk seluruh sekolah di lingkungan Telkom Schools.
Menggunakan dua portal secara bersamaan dapat membingungkan calon peserta didik.

Karena itu, portal SPMB internal dinonaktifkan secara default. Segala bentuk alur
pendaftaran internal (registrasi, login peserta, upload dokumen PPDB, draft formulir)
tidak lagi berfungsi saat fitur ini nonaktif.

## Status Default

```
SPMB_INTERNAL_ENABLED=false   # default — portal internal mati
```

Nilai ini dibaca dari environment variable `SPMB_INTERNAL_ENABLED`. Nilai yang valid
hanya `true` dan `false` (case-insensitive). Nilai lain menyebabkan server gagal
start.

## Cara Mengaktifkan Kembali

1. Buka `backend/.env` (atau set variabel sistem).
2. Ubah atau tambahkan:

```dotenv
SPMB_INTERNAL_ENABLED=true
```

3. Restart backend:

```bash
cd backend
npm run dev    # development
# atau
npm start      # production
```

4. Verifikasi di `GET /api/config`:

```json
{ "spmbInternalEnabled": true, "officialAdmissionsUrl": "https://ppdb.telkomschools.sch.id/welcome" }
```

5. Jalankan test:

```bash
cd backend && npm test          # backend integration tests
cd frontend && npm run spmb:flag  # frontend feature-flag tests
```

## Endpoint yang Terdampak

### Backend

| Route | Perilaku saat nonaktif |
|---|---|
| `POST /api/ppdb` | HTTP 503 `SPMB_DISABLED` |
| `PUT /api/ppdb/draft` | HTTP 503 `SPMB_DISABLED` |
| `DELETE /api/ppdb/draft` | HTTP 503 `SPMB_DISABLED` |
| `POST /api/spmb` | HTTP 503 `SPMB_DISABLED` |
| `PATCH /api/spmb/:id` | HTTP 503 `SPMB_DISABLED` |
| `DELETE /api/spmb/:id` | HTTP 503 `SPMB_DISABLED` |
| `PATCH /api/admin/ppdb/:id/status` | HTTP 503 `SPMB_DISABLED` |
| `POST /api/uploads/ppdb-documents` | HTTP 503 `SPMB_DISABLED` |
| `GET /api/admin/ppdb` | HTTP 200 — baca historis tetap diizinkan |
| `GET /api/spmb` | HTTP 200 — informasi SPMB tetap dapat dibaca |
| `POST /api/uploads/content` | Tidak terdampak — upload berita/prestasi tetap jalan |

### Frontend

| Route / Halaman | Perilaku saat nonaktif |
|---|---|
| `/spmb/masuk` | Dialihkan ke portal resmi |
| `/spmb/daftar` | Dialihkan ke portal resmi |
| `/spmb/formulir` | Dialihkan ke portal resmi |
| `/spmb/berkas` | Dialihkan ke portal resmi |
| `/spmb/status` | Dialihkan ke portal resmi |
| `/dashboard/spmb` | Notifikasi "SPMB internal dinonaktifkan" |
| `/dashboard/informasi-spmb` | Notifikasi + link portal resmi |
| Menu sidebar "Manajemen SPMB" | Tidak ditampilkan |
| Menu sidebar "Informasi SPMB" | Tidak ditampilkan |
| Banner dashboard "Buka Manajemen SPMB" | Tidak ditampilkan |
| Hero CTA "Daftar SPMB" | Langsung ke portal resmi |
| Tombol "Lanjutkan di portal SPMB" | Langsung ke portal resmi |

## Perilaku Frontend dan Backend Saat Dinonaktifkan

- **Semua CTA pendaftaran** mengarah ke `https://ppdb.telkomschools.sch.id/welcome`.
- **Route internal** (`/spmb/masuk`, dll.) dialihkan ke portal resmi.
- **Admin panel:** halaman manajemen SPMB menampilkan notifikasi bahwa fitur nonaktif
  dan link ke portal resmi. Menu sidebar SPMB tidak ditampilkan.
- **Mutation API** (registrasi, draft, upload dokumen) mengembalikan HTTP 503
  dengan kode `SPMB_DISABLED`.
- **Data historis PPDB** tetap tersimpan di database dan tetap dapat dibaca oleh
  administrator melalui API `/api/admin/ppdb` (GET). Data tidak dihapus.
- **Informasi SPMB** tetap dapat dibaca publik melalui `/api/spmb` (GET). Ini
  tidak memerlukan flag karena hanya data informasi, bukan alur pendaftaran.
- **Upload konten berita/prestasi** (`POST /api/uploads/content`) tetap berfungsi
  normal. Pembatasan hanya pada endpoint dan alur dokumen PPDB.
- **Email reset/verifikasi** dari backend tetap mengarah ke route internal
  (`/auth/confirm`, `/spmb/atur-sandi`). Saat fitur diaktifkan, route tersebut
  dapat dirender. Saat nonaktif, route tersebut dialihkan — peserta seharusnya
  menggunakan portal resmi untuk alur autentikasi.

## Prosedur Testing Dua Kondisi

### Kondisi A: SPMB_INTERNAL_ENABLED=false (default)

```bash
# Backend
cd backend && npm test

# Frontend feature flag
cd frontend && npm run spmb:flag

# Verifikasi tidak ada menu SPMB internal
cd frontend && npm run lint
```

Assertion yang harus terpenuhi:
- Navigasi SPMB internal tidak tersedia.
- CTA "Masuk SPMB" mengarah ke portal resmi.
- Registrasi internal (`POST /api/ppdb`) ditolak 503.
- Draft ditolak 503.
- Upload dokumen PPDB ditolak 503.
- API admin internal baca historis tetap 200.
- SPMB information read tetap 200.
- Upload konten berita/prestasi tetap berjalan.
- `/dashboard/spmb` menampilkan notifikasi.

### Kondisi B: SPMB_INTERNAL_ENABLED=true

```bash
# Set di backend/.env: SPMB_INTERNAL_ENABLED=true
# Restart backend
cd backend && npm test

# Frontend
cd frontend && npm run spmb:flag
```

Assertion tambahan:
- Halaman internal `/spmb/masuk` dapat dirender (bukan redirect).
- Menu sidebar "Manajemen SPMB" dan "Informasi SPMB" terlihat.
- Pendaftaran draft (`PUT /api/ppdb/draft`) tidak ditolak 503.
- Admin dapat membuat informasi SPMB (`POST /api/spmb`).
- Banner dashboard "Buka Manajemen SPMB" muncul.

## Data Historis yang Tetap Dipertahankan

Berikut data yang **tidak pernah dihapus** ketika fitur dinonaktifkan:

- Tabel `users` (akun peserta)
- Tabel `admins` (profil admin)
- Tabel `ppdb` (pendaftaran submitted)
- Tabel `ppdb_drafts` (draf biodata/nilai)
- Tabel `spmb_information` (informasi yang pernah dipublikasikan)
- Tabel `sessions` dan `auth_tokens`
- Dokumen upload (`uploads/ppdb-documents/`)
- Upload gambar berita/prestasi/konten (`uploads/content-images/`)

Dilarang menghapus migration, model Prisma, atau tabel data untuk memastikan
fitur dapat diaktifkan kembali kapan saja tanpa rekayasa ulang.

## Catatan Deployment

- Feature flag berlaku per proses backend. Load balancer multi-instance harus
  menggunakan nilai yang sama di seluruh instance.
- Frontend `AppConfigContext` melakukan fetch ke `/api/config` setiap load.
  Jika endpoint tersebut tidak tersedia (misalnya prerender offline), context
  fallback default ke nonaktif — ini adalah fallback yang aman.
- Perubahan flag tidak memerlukan re-deploy frontend (selama flag di-set di
  environment backend yang sudah serving request tersebut).
