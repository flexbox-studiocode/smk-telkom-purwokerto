-- site_settings.revision: BIGINT -> INT
-- Nilai revision dipakai sebagai optimistic-lock counter; INT (2.1 miliar)
-- jauh lebih besar dari kebutuhan dan menghindari error JSON.stringify(BigInt).
ALTER TABLE `site_settings` MODIFY `revision` INTEGER NOT NULL DEFAULT 1;