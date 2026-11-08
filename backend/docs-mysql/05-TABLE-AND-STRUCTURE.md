# Tabel dan Struktur

```sql
USE smk_telkom_purwokerto;
SHOW TABLES;
SHOW CREATE TABLE users;
DESCRIBE users;
SHOW INDEX FROM users;
```

Tabel utama: `users`, `admins`, `sessions`, `auth_tokens`, `berita`, `pengumuman`, `prestasi`, `bkk`, `events`, `spmb_information`, `site_settings`, `ppdb`, `ppdb_drafts`, `ai_daily_attempts`, dan `site_visitors`.

Primary key mengidentifikasi baris. Unique index mencegah duplikasi. Foreign key menjaga relasi. Perubahan struktur wajib dilakukan melalui `prisma migrate dev` dan direview sebelum production.
