-- Alias URL berita lama -> berita.
-- Migrasi aditif: hanya menambah tabel baru, tidak mengubah/menghapus data
-- berita yang sudah ada. Skema mengikuti permintaan format slug berita
-- `judul-berita-kode-3-8-digit`; tabel ini menjaga tautan lama tetap hidup.

CREATE TABLE `berita_slug_alias` (
  `id` CHAR(36) NOT NULL,
  `berita_id` CHAR(36) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `berita_slug_alias_slug_key` (`slug`),
  INDEX `berita_slug_alias_berita_id_idx` (`berita_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `berita_slug_alias`
  ADD CONSTRAINT `berita_slug_alias_berita_id_fkey`
  FOREIGN KEY (`berita_id`) REFERENCES `berita`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
