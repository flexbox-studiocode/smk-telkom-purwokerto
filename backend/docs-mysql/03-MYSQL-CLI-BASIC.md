# MySQL CLI Dasar

Buka Terminal Laragon atau PowerShell:

```powershell
mysql -h 127.0.0.1 -P 3306 -u root -p
```

Masukkan password saat diminta. Jangan menulis password langsung pada command karena dapat tersimpan di history/process list.

```sql
SELECT VERSION();
SHOW DATABASES;
USE smk_telkom_purwokerto;
SHOW TABLES;
SOURCE C:/path/file.sql;
EXIT;
```

Gunakan `Ctrl+C` untuk membatalkan query yang belum selesai. Akhiri statement SQL dengan `;`.
