# Dokumentasi Deployment cPanel — SMK Telkom Purwokerto

Halaman awal dokumentasi pemindahan aplikasi **SMK Telkom Purwokerto** ke hosting
**cPanel**. Mulai dari sini, lalu ikuti urutan membaca di bawah.

> **Status: deployment BELUM dilaksanakan.** Belum ada unggahan file, impor database,
> perubahan DNS, atau perubahan database production. Seluruh dokumen ini adalah
> prosedur siap-pakai, bukan laporan bahwa aplikasi sudah berjalan di hosting.

> Dokumentasi ini dirancang agar nyaman dibaca dari **HP**: kalimat pendek, daftar,
> dan bagian bertanda **[KONFIRMASI PROVIDER]** untuk hal yang bergantung pada paket
> hosting.

---

## 1. Tujuan Dokumentasi

- Menjadi acuan tunggal pemindahan aplikasi dari lingkungan development lokal ke
  hosting cPanel.
- Dapat diikuti **developer** maupun **administrator hosting/guru pembimbing**.
- Jujur soal batas: mana yang bisa lewat GUI cPanel, mana yang butuh Terminal/provider.
- Tidak memuat satu pun nilai rahasia (password, secret, service role key).

---

## 2. Urutan Membaca

1. **Halaman ini** — gambaran besar dan pembagian tugas.
2. **[Panduan Deployment](./CPANEL_DEPLOYMENT_GUIDE.md)** — langkah lengkap, arsitektur,
   environment variable, migrasi, backup.
3. **[Panduan Database & SQL](./sql/README.md)** — cara membuat database, impor SQL,
   dan menyambung riwayat Prisma.
4. **[Checklist Deployment](./CPANEL_DEPLOYMENT_CHECKLIST.md)** — daftar centang saat
   eksekusi.
5. **[Troubleshooting](./CPANEL_TROUBLESHOOTING.md)** — dipakai saat muncul error.

---

## 3. Daftar Dokumen

### Panduan Deployment

- **[`CPANEL_DEPLOYMENT_GUIDE.md`](./CPANEL_DEPLOYMENT_GUIDE.md)** — dokumen utama:
  arsitektur, persyaratan hosting, deployment frontend, deployment backend, environment
  variable, Prisma migration, upload, backup/restore, cron, security, SSL, testing,
  rollback.

### Checklist

- **[`CPANEL_DEPLOYMENT_CHECKLIST.md`](./CPANEL_DEPLOYMENT_CHECKLIST.md)** — checklist
  yang dapat dicentang (sebelum deployment sampai serah terima).

### Troubleshooting

- **[`CPANEL_TROUBLESHOOTING.md`](./CPANEL_TROUBLESHOOTING.md)** — tabel gejala →
  penyebab → diagnosis → solusi aman, spesifik source code repository ini.

### Panduan Database

- **[`sql/README.md`](./sql/README.md)** — skema 15 tabel aplikasi, impor SQL lewat
  phpMyAdmin, verifikasi tabel, dan Prisma baseline 4 migration.

---

## 4. File SQL Dikirim Terpisah (Tidak di GitHub)

Atas permintaan guru pembimbing, **file SQL tidak disimpan di repository GitHub**.

- File SQL schema-only berisi struktur database dan **tidak** memuat data konten,
  akun, password, session, data pribadi PPDB, atau dokumen privat.
- File SQL diserahkan **secara terpisah oleh developer** (misalnya lewat WhatsApp),
  bukan lewat tautan GitHub.
- Di repository hanya tersisa **folder** `docs-cpanel/sql/` beserta **panduan**
  impornya. File `*.sql` di folder itu **diabaikan Git** (lihat `.gitignore`).
- Panduan lengkap impor: **[`sql/README.md`](./sql/README.md)**.

> Jangan menempel isi file SQL ke GitHub, issue, atau chat publik. Serahkan hanya
> kepada pihak yang berwenang menyiapkan database.

---

## 5. Pembagian Tugas

### Developer

- Menyiapkan **build frontend** (`frontend/dist/`) dan mengemasnya menjadi ZIP.
- Menjalankan perintah yang butuh Node.js/Terminal: `npm ci`, `prisma generate`,
  Prisma baseline migration, seed admin, backup.
- Menyerahkan **file SQL** dan **file build** secara terpisah (bukan lewat Git).
- Menyediakan nilai environment variable (tanpa secret mentah di repo).

### Administrator Hosting / Guru Pembimbing

- Membuat **database MySQL** dan **user database** di cPanel.
- Mengimpor **file SQL** melalui **phpMyAdmin** (GUI, tanpa Terminal).
- Mengunggah **isi folder `dist`** ke document root lewat **File Manager**.
- Mengisi environment variable aplikasi Node bila panel menyediakannya.
- Membuat **subdomain** dan mengaktifkan **SSL**.
- Mengonfirmasi fitur paket hosting ke provider **[KONFIRMASI PROVIDER]**.

### Bersama / Perlu Bantuan Provider

- `npm ci`, `prisma generate`, baseline migration, seed admin, dan cron backup
  umumnya butuh **Terminal**, **Run JS Script**, atau bantuan provider hosting.
  phpMyAdmin **tidak** dapat menjalankan perintah npm atau Prisma.
- Detail jalur tanpa Terminal ada di
  [Panduan Deployment §8.13](./CPANEL_DEPLOYMENT_GUIDE.md#813-kondisi-tanpa-terminalssh).

---

## 6. Ringkasan Alur

```
1. Siapkan database (cPanel MySQL)         -> administrator hosting
2. Impor SQL / jalankan Prisma migration   -> administrator + developer
3. Build frontend (npm run build)          -> developer
4. Unggah isi frontend/dist -> document root -> administrator hosting
5. Deploy backend Node + env               -> administrator + developer
6. Seed admin, uji /health, uji halaman     -> bersama
7. Backup terjadwal                        -> butuh Terminal/provider
```

---

## 7. Yang Belum Diverifikasi

Dokumentasi ini disusun dari pembacaan source code, **bukan** dari deployment nyata.
Hal yang belum dapat diverifikasi dan wajib dikonfirmasi:

- Fitur paket cPanel (Node.js Application Manager, versi Node 22, Terminal, Cron,
  `mod_proxy`, binary `mysqldump`/`tar`, outbound HTTPS).
- Keberhasilan `npm ci` untuk modul native (`argon2`, `bcrypt`) di server.
- Kredensial live (SMTP, provider AI, Turnstile, Supabase backup).

Semua dianggap berstatus **belum dikonfirmasi / belum dijalankan** sampai dibuktikan.
