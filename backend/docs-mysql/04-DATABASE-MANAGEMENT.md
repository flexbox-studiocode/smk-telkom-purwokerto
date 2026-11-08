# Manajemen Database

```sql
CREATE DATABASE smk_telkom_purwokerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
USE smk_telkom_purwokerto;
SELECT DATABASE();
```

Database project dibuat melalui migrasi Prisma. Jangan mengubah schema dengan SQL manual tanpa membuat migration yang sesuai.

Operasi berbahaya:

```sql
DROP DATABASE smk_telkom_purwokerto;
```

Jangan menjalankan `DROP DATABASE` pada production. Ambil backup dan konfirmasi nama database minimal dua kali.
