-- Tambah status review `in_audit` untuk antrean Audit Konten.
--
-- Status ini terpisah dari status publikasi CMS (ContentStatus). MySQL/MariaDB
-- mendukung ALTER pada ENUM selama nilai lama dipertahankan urutannya.
ALTER TABLE `wordpress_archive_items`
  MODIFY `review_status` ENUM('pending_review', 'ready', 'in_audit', 'imported', 'skipped', 'failed')
  NOT NULL DEFAULT 'pending_review';

-- Mempercepat daftar antrean audit & filter status.
CREATE INDEX `wordpress_archive_items_review_status_updated_at_idx`
  ON `wordpress_archive_items` (`review_status`, `updated_at`);