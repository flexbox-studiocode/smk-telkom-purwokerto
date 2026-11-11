-- ===========================================================================
-- SMK Telkom Purwokerto — MySQL schema-only export
-- ---------------------------------------------------------------------------
-- Isi file  : STRUKTUR database saja (tanpa data). Tidak ada password,
--             hash akun, session/auth token, atau data PPDB di dalam file ini.
-- Engine    : InnoDB
-- Charset   : utf8mb4
-- Collation : utf8mb4_unicode_ci
-- Sumber    : backend/prisma/schema.prisma + 4 migration Prisma di
--             backend/prisma/migrations :
--               1) 20261103000000_init
--               2) 20261103010000_auth_tokens
--               3) 20261104000000_site_settings_revision_int
--               4) 20261104010000_events_category_enum
-- Hasil     : skema FINAL (sudah termasuk perubahan migration 3 & 4).
--
-- PERINGATAN
--   1) File ini HANYA berisi CREATE TABLE. TIDAK ada DROP TABLE, sehingga
--      aman dijalankan pada database kosong. JANGAN dijalankan pada database
--      yang sudah berisi aplikasi.
--   2) Jalankan HANYA pada database yang baru dibuat (kosong).
--   3) Tabel internal `_prisma_migrations` SENGAJA TIDAK dibuat di sini.
--      Tabel itu milik Prisma dan dibuat otomatis oleh perintah
--      `prisma migrate resolve --applied` / `prisma migrate deploy`
--      (lihat docs-cpanel/sql/README.md).
-- ===========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. users  (tabel induk akun; direferensikan banyak tabel)
-- ---------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email_verified` DATETIME(3) NULL,
  `role` VARCHAR(30) NOT NULL DEFAULT 'applicant',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key` (`email`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. admins  (profil admin; relasi 1-1 ke users)
-- ---------------------------------------------------------------------------
CREATE TABLE `admins` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `nama` VARCHAR(180) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `admins_user_id_key` (`user_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. sessions  (sesi login; token disimpan sebagai hash SHA-256)
-- ---------------------------------------------------------------------------
CREATE TABLE `sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sessions_token_hash_key` (`token_hash`),
  INDEX `sessions_user_id_idx` (`user_id`),
  INDEX `sessions_expires_at_idx` (`expires_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. auth_tokens  (verifikasi email + reset password)
-- ---------------------------------------------------------------------------
CREATE TABLE `auth_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `purpose` ENUM('verify_email', 'password_reset') NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `auth_tokens_token_hash_key` (`token_hash`),
  INDEX `auth_tokens_user_id_purpose_idx` (`user_id`, `purpose`),
  INDEX `auth_tokens_expires_at_idx` (`expires_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. berita
-- ---------------------------------------------------------------------------
CREATE TABLE `berita` (
  `id` CHAR(36) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `ringkasan` TEXT NULL,
  `konten` LONGTEXT NOT NULL,
  `gambar_url` VARCHAR(2048) NULL,
  `penulis` VARCHAR(180) NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `berita_slug_key` (`slug`),
  INDEX `berita_status_created_at_idx` (`status`, `created_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. pengumuman
-- ---------------------------------------------------------------------------
CREATE TABLE `pengumuman` (
  `id` CHAR(36) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `ringkasan` TEXT NULL,
  `konten` LONGTEXT NOT NULL,
  `gambar_url` VARCHAR(2048) NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `tanggal` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `pengumuman_slug_key` (`slug`),
  INDEX `pengumuman_status_created_at_idx` (`status`, `created_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. prestasi
-- ---------------------------------------------------------------------------
CREATE TABLE `prestasi` (
  `id` CHAR(36) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `kategori` VARCHAR(120) NULL,
  `deskripsi` TEXT NOT NULL,
  `gambar_url` VARCHAR(2048) NULL,
  `instagram_url` VARCHAR(2048) NULL,
  `tingkat` VARCHAR(120) NULL,
  `tanggal` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `prestasi_slug_key` (`slug`),
  INDEX `prestasi_tanggal_idx` (`tanggal`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. bkk  (Bursa Kerja Khusus)
-- ---------------------------------------------------------------------------
CREATE TABLE `bkk` (
  `id` CHAR(36) NOT NULL,
  `perusahaan` VARCHAR(255) NOT NULL,
  `posisi` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `lokasi` VARCHAR(255) NULL,
  `tipe_pekerjaan` VARCHAR(100) NULL,
  `deadline` DATETIME(3) NULL,
  `status` ENUM('aktif', 'ditutup') NOT NULL DEFAULT 'aktif',
  `link_pendaftaran` VARCHAR(2048) NULL,
  `logo_url` VARCHAR(2048) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `bkk_status_deadline_idx` (`status`, `deadline`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. ppdb  (pendaftaran; dokumen privat TIDAK disimpan di sini)
-- ---------------------------------------------------------------------------
CREATE TABLE `ppdb` (
  `id` CHAR(36) NOT NULL,
  `auth_user_id` CHAR(36) NULL,
  `nama_lengkap` VARCHAR(255) NOT NULL,
  `nisn` VARCHAR(30) NULL,
  `nik` VARCHAR(30) NULL,
  `asal_sekolah` VARCHAR(255) NOT NULL,
  `tempat_lahir` VARCHAR(120) NULL,
  `tanggal_lahir` DATETIME(3) NULL,
  `jenis_kelamin` VARCHAR(30) NULL,
  `agama` VARCHAR(50) NULL,
  `tahun_lulus` VARCHAR(10) NULL,
  `alamat` TEXT NULL,
  `no_hp` VARCHAR(30) NULL,
  `email` VARCHAR(254) NULL,
  `pilihan_jurusan` VARCHAR(120) NOT NULL,
  `nilai_rapor` JSON NULL,
  `dokumen_url` VARCHAR(2048) NULL,
  `status` ENUM('menunggu', 'diproses', 'diterima', 'ditolak') NOT NULL DEFAULT 'menunggu',
  `catatan_admin` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ppdb_auth_user_id_key` (`auth_user_id`),
  INDEX `ppdb_status_created_at_idx` (`status`, `created_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. ppdb_drafts
-- ---------------------------------------------------------------------------
CREATE TABLE `ppdb_drafts` (
  `auth_user_id` CHAR(36) NOT NULL,
  `biodata` JSON NOT NULL,
  `nilai` JSON NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`auth_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11. events  (kategori = enum FINAL dari migration ke-4, 14 nilai)
-- ---------------------------------------------------------------------------
CREATE TABLE `events` (
  `id` CHAR(36) NOT NULL,
  `judul` VARCHAR(180) NOT NULL,
  `ringkasan` VARCHAR(500) NOT NULL DEFAULT '',
  `deskripsi` TEXT NOT NULL,
  `kategori` ENUM(
    'kegiatan', 'akademik', 'lomba', 'karier', 'lainnya',
    'awal-pkl', 'penilaian-siswa', 'libur-akhir-semester', 'cuti-bersama',
    'libur-tahun-pelajaran', 'hari-pertama-sekolah', 'upacara-nasional',
    'hut-smk', 'libur-ramadhan', 'perkiraan-kelulusan'
  ) NOT NULL DEFAULT 'kegiatan',
  `tanggal_mulai` DATE NOT NULL,
  `waktu_mulai` VARCHAR(8) NULL,
  `tanggal_selesai` DATE NULL,
  `waktu_selesai` VARCHAR(8) NULL,
  `lokasi` VARCHAR(240) NOT NULL DEFAULT '',
  `penyelenggara` VARCHAR(160) NOT NULL DEFAULT '',
  `gambar_url` VARCHAR(2048) NULL,
  `link_informasi` VARCHAR(2048) NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `events_status_tanggal_mulai_idx` (`status`, `tanggal_mulai`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 12. spmb_information
-- ---------------------------------------------------------------------------
CREATE TABLE `spmb_information` (
  `id` CHAR(36) NOT NULL,
  `jenis` ENUM('jadwal', 'timeline', 'skema', 'persyaratan', 'syarat', 'statistik') NOT NULL,
  `judul` VARCHAR(180) NOT NULL,
  `deskripsi` TEXT NOT NULL,
  `urutan` INTEGER NOT NULL DEFAULT 1,
  `tanggal_mulai` DATE NULL,
  `tanggal_selesai` DATE NULL,
  `tanggal_seleksi` DATE NULL,
  `tanggal_pengumuman` DATE NULL,
  `ikon` VARCHAR(30) NULL,
  `tautan_url` VARCHAR(2048) NULL,
  `sumber_url` VARCHAR(2048) NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `kuota_total` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `spmb_information_jenis_status_urutan_idx` (`jenis`, `status`, `urutan`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 13. site_settings  (baris tunggal; revision = counter optimistik INT)
-- ---------------------------------------------------------------------------
CREATE TABLE `site_settings` (
  `id` BOOLEAN NOT NULL DEFAULT true,
  `school_name` VARCHAR(150) NOT NULL,
  `npsn` CHAR(8) NOT NULL,
  `address` VARCHAR(1000) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `website` VARCHAR(2048) NOT NULL,
  `logo_url` VARCHAR(2048) NULL,
  `academic_year` CHAR(9) NOT NULL,
  `spmb_open` BOOLEAN NOT NULL DEFAULT true,
  `news_page_size` INTEGER NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 14. ai_daily_attempts  (kuota harian fitur AI)
-- ---------------------------------------------------------------------------
CREATE TABLE `ai_daily_attempts` (
  `feature` ENUM('stela', 'nexttel') NOT NULL,
  `day` DATE NOT NULL,
  `attempts` INTEGER NOT NULL,
  PRIMARY KEY (`feature`, `day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 15. site_visitors  (penghitung kunjungan harian, hash pengunjung)
-- ---------------------------------------------------------------------------
CREATE TABLE `site_visitors` (
  `visitor_hash` VARCHAR(128) NOT NULL,
  `day` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`visitor_hash`, `day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Foreign keys (dibuat setelah semua tabel ada)
-- ---------------------------------------------------------------------------
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `auth_tokens`
  ADD CONSTRAINT `auth_tokens_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ppdb`
  ADD CONSTRAINT `ppdb_auth_user_id_fkey`
  FOREIGN KEY (`auth_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ppdb_drafts`
  ADD CONSTRAINT `ppdb_drafts_auth_user_id_fkey`
  FOREIGN KEY (`auth_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================================================
-- Ringkasan: 15 tabel aplikasi
--   users, admins, sessions, auth_tokens, berita, pengumuman, prestasi, bkk,
--   ppdb, ppdb_drafts, events, spmb_information, site_settings,
--   ai_daily_attempts, site_visitors
-- Tabel ke-16 (`_prisma_migrations`) dibuat otomatis oleh Prisma.
-- Lanjutkan dengan `prisma migrate resolve --applied <migration>` — lihat
-- docs-cpanel/sql/README.md.
-- ===========================================================================
