# Panduan Migrasi Arsip WordPress

## Status keselamatan

Engine default read-only. `npm run wp:dry-run` tidak menulis database. Jangan menjalankan import sebelum backup tervalidasi dan hasil dry-run direview.

Larangan tetap berlaku:

- jangan menjalankan dump WordPress ke `smk_telkom_purwokerto`;
- jangan gunakan `prisma migrate reset`, `DROP`, `TRUNCATE`, atau reset `_prisma_migrations`;
- jangan commit `.env`, `backend/backups/`, `backend/uploads/`, atau `wordpress-archive/results/`.

## Prasyarat

- Laragon MySQL hidup.
- Node `>=22.12`.
- `backend/.env` tersedia dengan `DATABASE_URL` lokal.
- Jalankan perintah dari `backend/`.
- Dump tetap berada di `backend/wordpress-archive/wordpres_posts.sql`.

```powershell
cd backend
npm run prisma:validate
```

## 1. Backup database utama

Gunakan script backup project. Jangan lanjut jika gagal.

```powershell
npm run db:backup
npm run db:backup:verify
```

Backup disimpan di `backend/backups/` dan sudah ada dalam `.gitignore`.

Catat manifest backup yang berhasil. Sebelum import, catat juga jumlah target:

```powershell
$mysql = 'D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe'
& $mysql '--host=127.0.0.1' '--port=3306' '--user=smk_app' '--password=<password>' 'smk_telkom_purwokerto' -N -e "SELECT 'berita',COUNT(*) FROM berita UNION ALL SELECT 'pengumuman',COUNT(*) FROM pengumuman UNION ALL SELECT 'prestasi',COUNT(*) FROM prestasi UNION ALL SELECT 'events',COUNT(*) FROM events;"
```

Jangan menaruh password nyata pada dokumen, terminal history bersama, atau Git.

## 2. Database staging

Dump menyebut database sumber `smkpurwokerto_profile`; tidak mengandung `CREATE DATABASE` atau `USE`. Import hanya ke staging terpisah bernama `wordpress_archive`.

Gunakan phpMyAdmin/Laragon dengan akun administrator MySQL yang Anda kendalikan:

1. Periksa apakah `wordpress_archive` sudah ada dan catat tabel/recordnya.
2. Jika sudah berisi data, **jangan hapus atau timpa**. Minta persetujuan sebelum tindakan destruktif.
3. Jika belum ada, buat database `wordpress_archive` dengan charset `utf8mb4` dan collation `utf8mb4_unicode_ci`.
4. Import `wordpres_posts.sql` ke `wordpress_archive`, bukan database utama.
5. Verifikasi `ic_posts` dan count `5.578`.

Engine saat ini membaca file dump langsung dan tidak membutuhkan staging untuk dry-run. Staging tetap direkomendasikan untuk inspeksi SQL di phpMyAdmin dan validasi independen.

## 3. Analisis file

```powershell
npm run wp:analyze
```

Output tidak masuk Git:

- `wordpress-archive/results/dry-run.json`

Baca dokumentasi:

- `ANALYSIS.md`
- `CONTENT_INVENTORY.md`
- `MAPPING.md`

## 4. Dry-run konten dan konflik database

Dry-run berikut hanya membaca file SQL dan database target. Tidak melakukan write DB atau download file media.

```powershell
npm run wp:dry-run -- --skip-media
```

Periksa output:

- `wordpress-archive/results/migration-plan.json`
- `categories.*.insert`: kandidat baru;
- `categories.*.update`: record WordPress yang sama pada re-run;
- `skipSlugConflict`: slug sudah dipakai record existing, tidak akan ditimpa;
- `skipDuplicate`: kandidat event berjudul sama, tidak akan ditimpa;
- `review`: konten ambigu, page, atau data tidak cukup;
- `existingCounts`: snapshot jumlah record target sebelum import.

Tidak ada angka dry-run yang boleh dianggap persetujuan otomatis. Review contoh record dan konflik.

## 5. Validasi media

Hanya validasi URL, tanpa menulis file:

```powershell
node wordpress-archive/src/migrate.mjs --media-only --dry-run --skip-db --media-concurrency=6
```

Output `media-map.json` menunjukkan:

- `available`: sumber merespons `image/*`;
- `unresolved`: HTTP 404, HTML, atau koneksi gagal;
- `skip_invalid`: bukan URL gambar yang aman.

Untuk download aktual setelah source/legal review, gunakan perintah eksplisit ini. Hasil masuk `backend/uploads/content-images/wordpress/`, diabaikan Git, tidak menimpa konten berbeda dengan nama sama.

```powershell
node wordpress-archive/src/migrate.mjs --media-only --media-download --skip-db --media-concurrency=4
```

Jangan lakukan download massal jika pemilik situs/asset belum memberi izin atau kapasitas server sumber tidak memadai.

## 6. Import

Import hanya setelah:

1. backup berhasil dan lokasi manifest dicatat;
2. dry-run selesai tanpa konflik yang belum diputuskan;
3. review `needs_review` dilakukan;
4. mapping media yang diperlukan tersedia;
5. approval operator diberikan.

Perintah memiliki guard `--yes`:

```powershell
node wordpress-archive/src/migrate.mjs --import --yes --skip-media --batch=50
```

Jika media telah didownload dan manifest ingin dipakai:

```powershell
node wordpress-archive/src/migrate.mjs --import --yes --skip-media --media-manifest=wordpress-archive/results/media-map.json --batch=50
```

Per batch memakai transaksi. Bila satu batch gagal, batch di-rollback dan error masuk `import-report-*.json`. Engine tidak menjalankan delete, truncate, drop, atau update massal berdasarkan slug.

## 7. Menjalankan ulang

ID target diturunkan dari WordPress ID dan kategori melalui UUID v5 deterministik. Re-run input sama melakukan upsert record engine sendiri; tidak menduplikasi. Record existing yang punya slug sama tetapi ID lain tetap di-skip untuk melindungi edit manual.

Sebelum re-run, ulangi dry-run dan review plan. Jangan menganggap re-run aman bila dump, classifier, atau schema berubah.

## 8. Validasi setelah import

```powershell
npm test
npm run prisma:validate
```

Jalankan juga smoke test API lokal:

```powershell
npm run dev
# Terminal lain:
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/api/berita?limit=5
Invoke-RestMethod http://localhost:3000/api/pengumuman?limit=5
Invoke-RestMethod http://localhost:3000/api/prestasi?limit=5
Invoke-RestMethod http://localhost:3000/api/events?limit=5
```

Bandingkan count tabel sebelum/sesudah dengan `migration-plan.json` atau `import-report-*.json`. Pastikan data existing tetap dapat dibaca.

## 9. Restore

Jika validasi gagal, hentikan proses. Jangan membersihkan tabel dengan delete/truncate. Gunakan prosedur restore project:

```powershell
npm run db:restore
```

Ikuti prompt script restore dan gunakan backup manifest yang dibuat sebelum import.

## 10. Review queue

`review.samples` di report memuat ID WordPress, type, slug/judul sumber, dan alasan. Operator memilih salah satu:

- tetap tidak diimpor;
- buat mapping eksplisit setelah field target diketahui;
- masukkan sebagai konten publik melalui admin API setelah konten/metadata diperiksa;
- perluas classifier + test, lalu jalankan dry-run baru.
