# Panduan Setup MySQL — SMK Telkom Purwokerto

Dokumen ini menjelaskan cara menyiapkan MySQL 8.4 sebagai database utama aplikasi
SMK Telkom Purwokerto, baik di **Windows + Laragon** maupun di **Linux VPS**.

> Status migrasi: **MySQL sudah menjadi satu-satunya database operasional.**
> Supabase tidak lagi dipakai oleh aplikasi saat runtime — hanya sebagai
> tujuan penyimpanan backup terenkripsi (opsional, lihat `MYSQL_BACKUP_GUIDE.md`).

---

## 1. Kebutuhan Sistem

| Komponen | Versi Minimum | Catatan |
|---|---|---|
| MySQL | 8.4.x | 8.0+ kompatibel; diuji pada 8.4.3 |
| Node.js | 20 LTS | 22 LTS juga berjalan |
| npm | 10+ | ikut Node.js |
| OS | Windows 10/11 atau Debian/Ubuntu 22.04+ | |

Laragon (Windows) sudah membawa MySQL 8.4.3 sehingga tidak perlu instalasi terpisah.

---

## 2. Setup di Windows + Laragon

### 2.1 Aktifkan MySQL

1. Buka Laragon → `Menu` → `MySQL` → `Start`.
2. Pastikan service berjalan di port **3306**.
3. Binaries biasanya berada di:
   `D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\`
   (sesuaikan dengan instalasi Anda — cek folder `D:\laragon\bin\mysql`).

Verifikasi:

```powershell
& 'D:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe' -u root -e "SELECT VERSION();"
```

### 2.2 Buat database dan user aplikasi

Gunakan **user aplikasi terpisah**, bukan `root`:

```sql
CREATE DATABASE smk_telkom_purwokerto
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE smk_telkom_purwokerto_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'smk_app'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';
CREATE USER 'smk_app'@'127.0.0.1' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';

GRANT ALL PRIVILEGES ON smk_telkom_purwokerto.*      TO 'smk_app'@'localhost';
GRANT ALL PRIVILEGES ON smk_telkom_purwokerto.*      TO 'smk_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON smk_telkom_purwokerto_test.* TO 'smk_app'@'localhost';
GRANT ALL PRIVILEGES ON smk_telkom_purwokerto_test.* TO 'smk_app'@'127.0.0.1';

FLUSH PRIVILEGES;
```

> User `smk_app` **tidak** diberi akses ke database lain. Ini membatasi dampak
> ketika kredensial bocor.

### 2.3 Konfigurasi backend

Salin `backend/.env.example` menjadi `backend/.env` (file ini sudah masuk `.gitignore`):

```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://smk_app:PASSWORD@127.0.0.1:3306/smk_telkom_purwokerto
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=<random-minimal-32-karakter>
```

Tambahkan untuk backup:

```ini
BACKUP_DIR=./backups
BACKUP_ENCRYPTION_KEY=<hasil `npm run db:backup:keygen`>
BACKUP_RETENTION_DAYS=30
MYSQLDUMP_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe
MYSQL_PATH=D:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe
```

> `BACKUP_ENCRYPTION_KEY` **wajib 32 byte base64** (44 karakter). Jangan pernah
> commit nilainya dan jangan mengubahnya setelah backup pertama — tanpa key yang
> sama, backup tidak bisa dipulihkan.

### 2.4 Terapkan skema & seed

```powershell
cd backend
npm install
npm run prisma:validate
npm run db:generate
npm run db:migrate      # prisma migrate deploy
npm run db:seed         # site_settings (+ admin recovery bila env recovery di-set)
```

### 2.5 Verifikasi koneksi

```powershell
node scripts/check-db.mjs
```

Output sukses:

```
Prisma connection OK
```

---

## 3. Setup di Linux VPS

### 3.1 Install MySQL 8.4

Pada Ubuntu 22.04+ gunakan MySQL APT Repository resmi:

```bash
# 1. Unduh repo MySQL
wget https://dev.mysql.com/get/mysql-apt-config_0.8.33-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.33-1_all.deb
# pilih "mysql-8.4-lts" saat prompted

# 2. Install
sudo apt update
sudo apt install -y mysql-server

# 3. Amankan
sudo mysql_secure_installation
```

Set root password, dan pastikan `root` **tidak** bisa login remote:

```bash
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'PASSWORD_ROOT_KUAT';"
```

### 3.2 Database dan user

```bash
sudo mysql <<'SQL'
CREATE DATABASE smk_telkom_purwokerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smk_app'@'127.0.0.1' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON smk_telkom_purwokerto.* TO 'smk_app'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

### 3.3 Deploy backend

```bash
sudo mkdir -p /opt/smk-telkom-purwokerto
sudo chown -R $USER:$USER /opt/smk-telkom-purwokerto
cd /opt/smk-telkom-purwokerto
git clone <URL_REPO> .

cd backend
npm ci --omit=dev
cp .env.example .env
chmod 600 .env
# edit .env: DATABASE_URL, SESSION_SECRET, BACKUP_ENCRYPTION_KEY, dll.
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

> `npm run db:migrate` memakai `prisma migrate deploy` — aman untuk produksi
> (tidak interaktif, tidak pernah menghapus data).

### 3.4 Service systemd untuk backend

`/etc/systemd/system/smk-backend.service`:

```ini
[Unit]
Description=SMK Telkom Purwokerto Backend
After=network-online.target mysql.service
Wants=network-online.target

[Service]
Type=simple
User=smk
WorkingDirectory=/opt/smk-telkom-purwokerto/backend
EnvironmentFile=/opt/smk-telkom-purwokerto/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /usr/sbin/nologin smk
sudo chown -R smk:smk /opt/smk-telkom-purwokerto
sudo systemctl enable --now smk-backend
sudo systemctl status smk-backend
```

---

## 4. Konfigurasi MySQL yang Direkomendasikan

`/etc/mysql/mysql.conf.d/smk.cnf` (Linux) atau edit `my.ini` Laragon:

```ini
[mysqld]
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci
max_connections      = 200
innodb_buffer_pool_size = 512M
innodb_file_per_table = 1
default-time-zone    = '+07:00'
```

> `default-time-zone = '+07:00'` memastikan timestamp MySQL konsisten dengan WIB.
> Aplikasi tetap menyimpan tanggal dalam UTC di layer bisnis.

Restart:

```bash
sudo systemctl restart mysql
```

---

## 5. Pengujian Awal (Smoke Test)

```bash
cd backend
node scripts/check-db.mjs     # koneksi Prisma
node scripts/smoke-db.mjs     # CRUD + transaksi + FK
npm test                      # test suite API (14 test)
curl http://127.0.0.1:3000/health
```

`/health` harus mengembalikan:

```json
{ "ok": true, "database": "up", "version": "8.4.3" }
```

---

## 6. Struktur Database

16 tabel operasional + `_prisma_migrations`:

| Tabel | Isi | Sumber ETL |
|---|---|---|
| `users` | akun siswa/calon siswa | Supabase (0 record) |
| `admins` | akun admin | Supabase (0 record) |
| `sessions` | sesi login | — |
| `auth_tokens` | token verifikasi/reset | — |
| `berita` | berita | ✅ 13 record |
| `pengumuman` | pengumuman | ✅ 11 record |
| `prestasi` | prestasi | ✅ 21 record |
| `bkk` | lowongan BKK | ✅ 12 record |
| `events` | agenda kegiatan | ✅ 52 record |
| `spmb_information` | informasi SPMB | ✅ 21 record |
| `site_settings` | pengaturan situs | ✅ 1 record |
| `site_visitors` | log visitor | ✅ 1 record |
| `ppdb` | pendaftaran PPDB | (0 record) |
| `ppdb_drafts` | draft PPDB | (0 record) |
| `ai_daily_attempts` | kuota AI harian | ⚠️ RLS-blocked di sumber |

Enum `EventCategory` diperlebar ke 14 nilai (5 bawaan + 9 nilai bebas dari sumber)
agar seluruh 52 event dapat dimuat tanpa memaksa/rekode data asli.

---

## 7. Troubleshooting Singkat

| Gejala | Penyebab | Solusi |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL mati | Start MySQL di Laragon / `systemctl start mysql` |
| `Access denied for user 'smk_app'` | Password/host tidak cocok | Cek `DATABASE_URL`, ensure user dibuat untuk host `127.0.0.1` |
| `Unknown database` | Database belum dibuat | Jalankan SQL pada Bagian 2.2 |
| `Table doesn't exist` | Migrasi belum jalan | `npm run db:migrate` |
| `ERROR 1045 (28000)` saat restore | `MYSQL_PWD` tidak terbaca | Restore memakai env `MYSQL_PWD` otomatis; pastikan `MYSQL_PATH` benar |
| Prisma `Can't reach database server` | Adapter butuh pool eksplisit | `backend/src/db.js` sudah memakai pool `mariadb` |

Lihat `MYSQL_TROUBLESHOOTING.md` untuk detail panjang.

---

## 8. Referensi Cepat

```bash
# Koneksi
node scripts/check-db.mjs

# Migrasi
npm run db:migrate
npm run db:status

# Backup & restore
npm run db:backup
npm run db:backup:verify
npm run db:restore -- <file.enc> --db=smk_telkom_purwokerto_restore_test --apply

# ETL (idempotent)
npm run db:etl:dry-run
node scripts/etl/migrate.mjs
```
