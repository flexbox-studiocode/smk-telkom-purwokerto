# Laporan Pengujian CRUD Admin

Tanggal: 9 November 2026

## Hasil otomatis

| Perintah | Hasil |
|---|---|
| `npm run prisma:validate` | Lulus |
| `npm run prisma:generate` | Lulus |
| `npm run db:status` | Skema up to date |
| `npm test` | **72 pass, 0 fail** |
| `npm run lint` | Lulus |
| `npm run typecheck` | Lulus |
| `CI=true npm run build:ci` | Lulus; 101 route diprerender |

Backend test suite memakai MySQL lokal pada `127.0.0.1:3306` dan berjalan serial. Tidak ada secret, cookie, token, atau password yang dicatat dalam laporan.

## Cakupan regresi

`backend/tests/content-crud.test.js` memverifikasi:

- Create, read, update, delete untuk Berita, Pengumuman, Prestasi, dan BKK.
- Duplicate slug menjadi HTTP 409 dengan `duplicate`.
- Payload invalid menjadi HTTP 400 dengan `validation_error`.
- Guest mutation menjadi HTTP 401.
- Applicant mutation menjadi HTTP 403.
- CSRF invalid/missing menjadi HTTP 400 dengan `csrf_failed`.
- Update/delete ID yang tidak ada menjadi HTTP 404 dengan `not_found`.
- Event category hyphen (`cuti-bersama`, `awal-pkl`) tetap hyphen pada respons.
- Event dengan data lama yang memakai enum mapped Prisma tetap diserialisasi ke kontrak HTTP hyphen.
- Validasi rentang tanggal event memakai `invalid_date_range`.

Suite existing juga tetap lulus, termasuk auth, settings publik, SPMB disabled behavior, upload boundary, backup utilities, dan event access control.

## Catatan build

`build:ci` dijalankan dengan `CI=true` karena skrip prerender SEO hanya mengizinkan mode offline pada CI test. Tidak ada hasil build yang dideploy.
