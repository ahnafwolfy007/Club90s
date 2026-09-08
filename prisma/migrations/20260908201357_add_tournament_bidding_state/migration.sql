-- AlterTable
ALTER TABLE `tournaments` ADD COLUMN `bid_increment` DECIMAL(10, 2) NOT NULL DEFAULT 10,
    ADD COLUMN `bid_timer_seconds` INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN `current_bid_deadline` DATETIME(3) NULL,
    ADD COLUMN `current_player_id` VARCHAR(191) NULL,
    ADD COLUMN `starting_bid` DECIMAL(10, 2) NOT NULL DEFAULT 50;

