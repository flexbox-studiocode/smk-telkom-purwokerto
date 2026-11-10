-- Sesi tamu NEXA: identitas pra-chat disimpan terpisah dari isi percakapan.
-- Baris hanya hidup selama sesi berlaku; baris kedaluwarsa dihapus saat sesi baru dibuat.
CREATE TABLE `nexa_sessions` (
  `id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `age` TINYINT UNSIGNED NOT NULL,
  `category` ENUM('sekolah','instansi') NOT NULL,
  `organization` VARCHAR(100) NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `nexa_sessions_token_hash_key` (`token_hash`),
  INDEX `nexa_sessions_expires_at_idx` (`expires_at`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
