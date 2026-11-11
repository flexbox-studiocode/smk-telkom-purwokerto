# Panduan Database & SQL — SMK Telkom Purwokerto (cPanel)

Panduan membuat database MySQL di cPanel, mengimpor **file SQL schema-only** yang
dikirim developer secara terpisah, memverifikasi tabel, dan menyambungkan riwayat
Prisma migration.

Acuan utama: **[`../CPANEL_DEPLOYMENT_GUIDE.md`](../CPANEL_DEPLOYMENT_GUIDE.md)**
(khususnya §6, §8, §11). Checklist: **[`../CPANEL_DEPLOYMENT_CHECKLIST.md`](../CPANEL_DEPLOYMENT_CHECKLIST.md)**.

> **Tidak ada file SQL di dokumentasi ini dan di GitHub.** File `*.sql` di folder ini
> **diabaikan Git** dan **dikirim terpisah** oleh developer (mis. lewat WhatsApp).
> Folder `sql/` hanya menyimpan panduan.

---

## 1. Apa Isi File SQL

File SQL adalah **schema-only export** (hanya `CREATE TABLE` + foreign key):

- Berisi **15 tabel aplikasi**:
  `users`, `admins`, `sessions`, `auth_tokens`, `berita`, `pengumuman`, `prestasi`,
  `bkk`, `ppdb`, `ppdb_drafts`, `events`, `spmb_information`, `site_settings`,
  `ai_daily_attempts`, `site_visitors`.
- **Tidak** memuat data konten apa pun (berita, prestasi, dsb. kosong).
- **Tidak** memuat akun, password hash, auth token, atau session.
- **Tidak** memuat data pribadi PPDB atau dokumen privat.
- **Tidak** memuat secret (tidak ada API key, service role, atau connection string).
- **Tidak** ada `DROP TABLE` — aman dijalankan pada database kosong.
- Engine `InnoDB`, charset `utf8mb4`, collation `utf8mb4_unicode_ci`.

### Tabel ke-16: `_prisma_migrations`

File SQL membuat 15 tabel aplikasi. **Tabel `_prisma_migrations` sengaja TIDAK dibuat
di file SQL.** Tabel itu milik Prisma dan dibuat **otomatis** oleh perintah resmi
Prisma saat baseline (lihat §6). Setelah baseline selesai, total menjadi **16 tabel**.

> **Jangan membuat atau mengisi `_prisma_migrations` secara manual.** Prisma harus
> menuliskan checksum dan riwayat migration itu sendiri.

---

## 2. Membuat Database MySQL di cPanel

1. Login cPanel.
2. Buka menu **MySQL® Databases**.
3. Pada **Create New Database**, isi nama singkat, mis. `smk`.
   cPanel menambahkan prefix akun, hasilnya mis. `smktelkom_smk`.
4. Pada **Add New User**, buat user, mis. `app` + password kuat.
   Hasilnya mis. `smktelkom_app`.
5. Pada **Add User To Database**, hubungkan user tersebut ke database.
6. Beri privilege (minimal sesuai
   [Panduan Deployment §4.2](../CPANEL_DEPLOYMENT_GUIDE.md), atau `ALL PRIVILEGES`
   bila diizinkan provider).
7. Catat nama database, user, dan password untuk membentuk `DATABASE_URL`.

**Nama database di cPanel memakai prefix akun.** Jangan menulis nama lokal
(`smk_telkom_purwokerto`) ke `DATABASE_URL`; pakai nama yang diberikan cPanel:

```env
DATABASE_URL=mysql://smktelkom_app:PASSWORD_KUAT@127.0.0.1:3306/smktelkom_smk
```

> **Wajib: database harus KOSONG.** Impor SQL hanya ke database yang baru dibuat dan
> belum berisi tabel aplikasi.

---

## 3. Membuka phpMyAdmin

- Dari cPanel: menu **phpMyAdmin** (biasanya di bagian *Databases*).
- Pilih database tujuan di panel kiri (mis. `smktelkom_smk`).
- Bila muncul lebih dari satu database, pastikan yang dipilih adalah database aplikasi
  yang baru dibuat, bukan database lain.

---

## 4. Mengimpor File SQL (Dikirim Terpisah)

Dapat dilakukan sepenuhnya lewat **GUI phpMyAdmin** — **tidak butuh Terminal**.

1. Dapatkan file SQL dari developer (dikirim terpisah, bukan dari GitHub).
2. Simpan file di komputer/HP yang dipakai membuka cPanel.
3. Buka **phpMyAdmin** → pilih database kosong tujuan.
4. Buka tab **Import**.
5. Klik **Choose File** → pilih file `.sql` tersebut.
6. Pastikan **Charset = `utf8mb4`**.
7. Format = **SQL**. Biarkan opsi lain default.
8. Klik **Go / Kirim**.
9. Tunggu sampai muncul pesan sukses.

Bila muncul peringatan hak akses atau DDL ditolak: minta provider mengizinkan
`CREATE/ALTER/INDEX/DROP/REFERENCES` pada database akun **[KONFIRMASI PROVIDER]**.

---

## 5. Verifikasi Tabel

Setelah impor, verifikasi di phpMyAdmin:

1. Panel kiri → pilih database → daftar tabel harus memuat **15 tabel aplikasi**
   (lihat daftar di §1).
2. Jalankan query berikut pada tab **SQL**:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = DATABASE();
```

Hasil harus **15** tabel sebelum baseline. Setelah baseline Prisma, jumlahnya
menjadi **16** (bertambah `_prisma_migrations`).

Cek juga tipe kolom hasil migrasi final:

```sql
SELECT COLUMN_NAME, DATA_TYPE
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'site_settings' AND COLUMN_NAME = 'revision';
-- harus INT
```

---

## 6. Prisma Baseline (4 Migration)

Impor SQL membuat tabel, tetapi **riwayat Prisma belum tercatat**. Karena itu, setelah
impor, developer/administrator menjalankan **perintah baseline resmi Prisma** dari
folder `backend/` (Application Root) agar Prisma mengenali 4 migration sebagai sudah
diterapkan.

Daftar 4 migration di `backend/prisma/migrations/`:

1. `20261103000000_init`
2. `20261103010000_auth_tokens`
3. `20261104000000_site_settings_revision_int`
4. `20261104010000_events_category_enum`

Prisma harus **7.10.1** (cek `npx prisma -v`). Perintah baseline:

```bash
# dari folder backend/
npm run prisma:generate
npx prisma migrate resolve --applied 20261103000000_init
npx prisma migrate resolve --applied 20261103010000_auth_tokens
npx prisma migrate resolve --applied 20261104000000_site_settings_revision_int
npx prisma migrate resolve --applied 20261104010000_events_category_enum
```

`npx prisma migrate resolve --applied <nama>` adalah **mekanisme resmi Prisma** untuk
menandai sebuah migration sudah diterapkan. Prisma sendiri yang membuat tabel
`_prisma_migrations` dan menulis checksum, timestamp, status, dan riwayatnya.

> Baseline **hanya menandai** migration sebagai sudah diterapkan, **tidak menjalankan
> ulang isi SQL-nya**. Karena itu file SQL harus sudah sesuai dengan hasil akhir semua
> migration (`site_settings.revision` = INT, `events.kategori` = enum final).

---

## 7. Memeriksa Status Migration

```bash
# dari folder backend/
npm run db:status      # = prisma migrate status
```

Setelah keempat `resolve` sukses, output harus menyatakan schema **up to date / semua
migration applied**. Bila masih ada yang pending, jangan lanjut — periksa kembali.

Opsional, cek drift schema terhadap file Prisma:

```bash
npx prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --exit-code
```

Exit code `0` / `No difference detected` berarti cocok.

---

## 8. Peringatan Penting

- **Jangan menjalankan `npm run db:migrate` (`prisma migrate deploy`) sebelum baseline
  selesai.** Tabel sudah dibuat oleh impor SQL; `migrate deploy` akan mencoba
  membuatnya lagi dan gagal (`already exists` / P3005).
- **Jangan import SQL ke database yang sudah berisi data atau tabel aplikasi.**
  File SQL ini tanpa `DROP TABLE` — impor ke database yang sudah terisi akan bentrok.
- **Jangan membuat/isi `_prisma_migrations` manual.**
- **Jangan `prisma migrate dev`** di production.
- **Jangan** menghapus folder `backend/prisma/migrations/`.
- Bila ragu, hentikan dan tanyakan developer. Jangan mengulang impor atau migrate
  sebagai percobaan.

---

## 9. Tanpa Terminal cPanel

Impor SQL dapat dilakukan **100% lewat phpMyAdmin (GUI)**. Namun langkah berikut
**tidak** bisa dilakukan phpMyAdmin:

- `npm ci`
- `prisma generate`
- `prisma migrate resolve --applied ...` (baseline)
- `npm run db:status`
- `npm run db:seed` (admin awal)

Langkah-langkah itu butuh **Terminal/SSH**, fitur **Run JS Script / Run NPM Install**
pada Node.js Application Manager, atau **bantuan provider**. phpMyAdmin **tidak**
dapat menjalankan npm atau Prisma. Lihat
[Panduan Deployment §8.13](../CPANEL_DEPLOYMENT_GUIDE.md#813-kondisi-tanpa-terminalssh).

> **Jangan** menganggap phpMyAdmin dapat menjalankan npm atau Prisma, dan **jangan**
> memakai workaround tidak aman (mis. mengunggah `node_modules` dari Windows ke server
> Linux, atau mengisi `_prisma_migrations` manual).
