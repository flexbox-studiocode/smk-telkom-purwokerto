-- Audit log penghapusan batch SQL WordPress.
--
-- Job dan item arsip memang dihapus permanen, sehingga ringkasan batch harus
-- disimpan di tabel terpisah. Tabel ini TIDAK memiliki foreign key ke tabel CMS
-- (berita/pengumuman/prestasi) sehingga penghapusan batch tidak pernah
-- menyentuh konten yang sudah dipublikasikan.
CREATE TABLE `wordpress_archive_deletions` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `original_file_name` VARCHAR(255) NOT NULL,
  `source_checksum` CHAR(64) NOT NULL,
  `job_status` VARCHAR(32) NOT NULL,
  `deleted_item_count` INTEGER NOT NULL DEFAULT 0,
  `imported_item_count` INTEGER NOT NULL DEFAULT 0,
  `detail` JSON NULL,
  `deleted_by` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `wordpress_archive_deletions_created_at_idx` (`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;