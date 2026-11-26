ALTER TABLE `ai_provider_configs`
    ADD COLUMN `display_name` VARCHAR(80) NULL AFTER `feature`,
    ADD COLUMN `last_check_code` VARCHAR(40) NULL AFTER `enabled`,
    ADD COLUMN `last_checked_at` DATETIME(3) NULL AFTER `last_check_code`;
