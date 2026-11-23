-- WordPress archive CMS integration + Prestasi publication status.
-- Additive migration: no DROP/TRUNCATE and no destructive change to existing rows.

-- 1. Prestasi.status (previously all prestasi rows were implicitly public).
--    Backfill existing rows to 'published' so currently visible content stays visible.
ALTER TABLE `prestasi`
  ADD COLUMN `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft';

UPDATE `prestasi` SET `status` = 'published';

CREATE INDEX `prestasi_status_tanggal_idx` ON `prestasi`(`status`, `tanggal`);

-- 2. WordPress import jobs (one row per uploaded SQL dump).
CREATE TABLE `wordpress_import_jobs` (
  `id` CHAR(36) NOT NULL,
  `original_file_name` VARCHAR(255) NOT NULL,
  `source_checksum` CHAR(64) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('uploaded', 'processing', 'completed', 'partially_completed', 'failed', 'cancelled') NOT NULL DEFAULT 'uploaded',
  `total_source_records` INT NOT NULL DEFAULT 0,
  `candidate_count` INT NOT NULL DEFAULT 0,
  `berita_count` INT NOT NULL DEFAULT 0,
  `pengumuman_count` INT NOT NULL DEFAULT 0,
  `prestasi_count` INT NOT NULL DEFAULT 0,
  `review_count` INT NOT NULL DEFAULT 0,
  `skipped_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `progress` INT NOT NULL DEFAULT 0,
  `processed_rows` INT NOT NULL DEFAULT 0,
  `error_summary` TEXT NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `wordpress_import_jobs_checksum_key` (`source_checksum`),
  INDEX `wordpress_import_jobs_status_created_at_idx` (`status`, `created_at`),
  INDEX `wordpress_import_jobs_created_by_created_at_idx` (`created_by`, `created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Adapted archive items. Unique identity = (source checksum, WordPress ID).
CREATE TABLE `wordpress_archive_items` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `source_checksum` CHAR(64) NOT NULL,
  `wordpress_id` BIGINT UNSIGNED NOT NULL,
  `source_post_type` VARCHAR(64) NOT NULL DEFAULT 'post',
  `source_post_status` VARCHAR(32) NOT NULL DEFAULT '',
  `source_slug` VARCHAR(255) NULL,
  `source_url` VARCHAR(2048) NULL,
  `source_date` DATETIME(3) NULL,
  `source_modified` DATETIME(3) NULL,
  `target_type` ENUM('berita', 'pengumuman', 'prestasi', 'needs_review') NOT NULL DEFAULT 'needs_review',
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `summary` TEXT NULL,
  `content` LONGTEXT NULL,
  `image_url` VARCHAR(2048) NULL,
  `metadata` JSON NULL,
  `review_status` ENUM('pending_review', 'ready', 'imported', 'skipped', 'failed') NOT NULL DEFAULT 'pending_review',
  `review_notes` TEXT NULL,
  `import_status` VARCHAR(32) NULL,
  `imported_to_id` CHAR(36) NULL,
  `imported_at` DATETIME(3) NULL,
  `reviewed_by` CHAR(36) NULL,
  `reviewed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `wordpress_archive_items_source_checksum_wordpress_id_key` (`source_checksum`, `wordpress_id`),
  INDEX `wordpress_archive_items_job_id_target_type_idx` (`job_id`, `target_type`),
  INDEX `wordpress_archive_items_review_status_target_type_idx` (`review_status`, `target_type`),
  INDEX `wordpress_archive_items_target_type_source_date_idx` (`target_type`, `source_date`),
  INDEX `wordpress_archive_items_title_idx` (`title`),
  CONSTRAINT `wordpress_archive_items_job_id_fkey`
    FOREIGN KEY (`job_id`) REFERENCES `wordpress_import_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Revision history for archive edits and review actions.
CREATE TABLE `wordpress_archive_revisions` (
  `id` CHAR(36) NOT NULL,
  `item_id` CHAR(36) NOT NULL,
  `actor_id` CHAR(36) NULL,
  `action` VARCHAR(48) NOT NULL,
  `changes` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `wordpress_archive_revisions_item_id_created_at_idx` (`item_id`, `created_at`),
  CONSTRAINT `wordpress_archive_revisions_item_id_fkey`
    FOREIGN KEY (`item_id`) REFERENCES `wordpress_archive_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;