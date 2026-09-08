-- AlterTable
ALTER TABLE `elections` ADD COLUMN `first_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `first_confirmed_by` VARCHAR(191) NULL,
    ADD COLUMN `second_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `second_confirmed_by` VARCHAR(191) NULL,
    ADD COLUMN `winning_candidate_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `elections` ADD CONSTRAINT `elections_first_confirmed_by_fkey` FOREIGN KEY (`first_confirmed_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `elections` ADD CONSTRAINT `elections_second_confirmed_by_fkey` FOREIGN KEY (`second_confirmed_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

