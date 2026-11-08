# Troubleshooting MySQL

## MySQL tidak mau start

Periksa port 3306:

```powershell
Get-NetTCPConnection -LocalPort 3306
```

Hentikan service lama atau ubah port di `my.ini`.

## Access denied

```text
ERROR 1045 (28000): Access denied for user 'smk_app'@'localhost'
```

Periksa user/password di `.env` `DATABASE_URL`. Reset password root melalui `--skip-grant-tables` jika perlu.

## Unknown database

```text
ERROR 1049 (42000): Unknown database 'smk_telkom_purwokerto'
```

Buat database atau jalankan `npm run db:migrate`.

## Connection refused

MySQL tidak berjalan atau port salah. Jalankan service dan periksa `DATABASE_URL`.

## Prisma migration error

```powershell
npx prisma migrate status
npx prisma migrate resolve --rolled-back <nama_migration>
```

Jangan menghapus baris dari `_prisma_migrations` tanpa memahami dampaknya.

## Foreign key error

Tidak bisa menghapus user yang memiliki ppdb (RESTRICT). Hapus atau reassign ppdb terlebih dahulu.

## Encoding/collation

Database wajib `utf8mb4_unicode_ci`. Jangan menggunakan `utf8` (alias `utf8mb3`).

## mysqldump not found

Set `MYSQLDUMP_PATH` dan `MYSQL_PATH` di `.env`:

```text
MYSQLDUMP_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe
MYSQL_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe
```

## Backup gagal

Periksa `BACKUP_ENCRYPTION_KEY` (base64 32 byte), `DATABASE_URL`, dan path `mysqldump`. Lihat log JSON pada stdout.

## Restore gagal

Periksa key, checksum, dan format file. Restore test pada database baru, bukan production.
