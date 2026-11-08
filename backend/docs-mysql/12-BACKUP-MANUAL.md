# Backup Manual

## Generate encryption key (sekali saja)

```powershell
npm run db:backup:keygen
```

Simpan hasil base64 di `BACKUP_ENCRYPTION_KEY` pada `.env`. **Jangan kehilangan key ini.** Tanpa key, backup tidak dapat dipulihkan.

## Backup lokal tanpa upload

```powershell
npm run db:backup -- --no-upload
```

Menghasilkan:

```text
backups/mysql/<tahun>/<bulan>/mysql-backup-<tanggal>.sql.gz.enc
backups/uploads/uploads-backup-<tanggal>.tar.gz.enc
backups/manifests/backup-<tanggal>.json
```

## Verifikasi

```powershell
npm run db:backup:verify
```

Memeriksa checksum SHA-256, ukuran, dan header `SMKBACK1` setiap objek.

## Backup ke Supabase Storage

Pastikan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_BACKUP_BUCKET` terisi.

```powershell
npm run db:backup
```

Alur: `mysqldump → gzip → AES-256-GCM → upload → verify remote → manifest REMOTE_VERIFIED`.

## Backup file upload

Backup otomatis menyertakan `uploads/`. File penting tidak boleh hanya berada pada storage lokal tanpa ikut backup.

## Manifest

Manifest berisi: tanggal, nama database, schema version, table counts, nama objek, ukuran, SHA-256, format enkripsi, key fingerprint, status backup, dan timestamp.

Jangan menyatakan backup sukses hanya karena file lokal dibuat. Status `REMOTE_VERIFIED` berarti objek remote diunduh ulang dan checksum cocok.
