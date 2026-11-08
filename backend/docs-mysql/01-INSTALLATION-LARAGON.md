# Instalasi Laragon dan MySQL 8.4

1. Install Laragon dari sumber resmi ke direktori tanpa spasi, misalnya `D:\laragon`.
2. Tambahkan MySQL 8.4 melalui `Menu > Tools > Quick add > MySQL` atau ekstrak paket MySQL 8.4 ke `D:\laragon\bin\mysql\`.
3. Pilih versi melalui `Menu > MySQL > Version`.
4. Buka Terminal Laragon. Periksa:

```powershell
mysql --version
mysqldump --version
```

Lokasi executable project saat ini:

```text
D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe
D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe
```

5. Pastikan port 3306 tersedia:

```powershell
Get-NetTCPConnection -LocalPort 3306
```

Jika phpMyAdmin tersedia, buka melalui menu Laragon. Buat database hanya bila belum ada:

```sql
CREATE DATABASE IF NOT EXISTS smk_telkom_purwokerto
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Laragon hanya membantu service lokal. Data production tidak boleh disimpan pada direktori project yang tidak persistent.
