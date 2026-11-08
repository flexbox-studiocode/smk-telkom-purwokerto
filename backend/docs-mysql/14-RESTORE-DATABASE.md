# Restore Database

## Prinsip

- Restore **tidak otomatis** menimpa production.
- Wajib menggunakan `--apply`.
- Restore ke production juga wajib `--allow-production` dan `--confirm`.
- Database tujuan test harus kosong (baru) kecuali `--allow-existing`.

## Restore dari file lokal

```powershell
npm run db:restore -- backups/mysql/2026/11/mysql-backup-2026-11-04.sql.gz.enc --db=smk_restore_test --apply
```

## Restore dari Supabase Storage

```powershell
npm run db:restore -- --remote-date=2026-11-04 --target=mysql --db=smk_restore_test --apply
```

Script mengunduh manifest, memverifikasi checksum setiap objek remote, mendekripsi, dan menjalankan SQL.

## Restore uploads

```powershell
npm run db:restore -- backups/uploads/uploads-backup-2026-11-04.tar.gz.enc uploads --uploads-root=./restore-uploads --apply
```

## Validasi setelah restore

Script memvalidasi:

1. Header `SMKBACK1` (minimal 36 byte: 8 magic + 12 IV + 16 tag).
2. AES-256-GCM auth tag (key salah/ data rusak → gagal).
3. Fingerprint key manifest cocok dengan `BACKUP_ENCRYPTION_KEY` aktif (dicek
   sebelum dekripsi).
4. Format SQL (`CREATE TABLE`/`INSERT INTO`).
5. Jumlah baris per tabel dibandingkan manifest.

Jangan menyatakan restore berhasil hanya karena `mysql` exit code 0.

## Proteksi

- Key salah → fingerprint manifest tidak cocok → error; jika fingerprint
  dilewati, GCM auth tag gagal → error.
- File rusak/tidak lengkap → panjang buffer < 36 → error.
- Checksum mismatch → error.
- Manifest hilang / status bukan `REMOTE_VERIFIED` (restore remote) → error.
- Database tujuan sudah berisi tabel → error tanpa `--allow-existing`.
- Database tujuan bernama sama dengan production → butuh `--allow-production`
  **dan** `--confirm`.
- Archive mengandung path traversal (absolut, `..`, drive letter) → error
  sebelum ekstraksi.
- Menimpa `UPLOAD_ROOT` aktif → butuh `--uploads-root` lain atau
  `--allow-production --confirm`.
