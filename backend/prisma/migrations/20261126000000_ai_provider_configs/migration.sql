CREATE TABLE `ai_provider_configs` (
    `id` CHAR(36) NOT NULL,
    `feature` ENUM('stela', 'nexttel') NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `endpoint` VARCHAR(2048) NULL,
    `model` VARCHAR(180) NOT NULL,
    `encrypted_api_key` TEXT NULL,
    `encryption_version` VARCHAR(20) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `updated_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ai_provider_configs_feature_key`(`feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ai_provider_configs_updated_by_idx` ON `ai_provider_configs`(`updated_by`);
