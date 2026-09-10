-- AlterTable
ALTER TABLE `members` ADD COLUMN `address` VARCHAR(500) NULL,
    ADD COLUMN `educational_institution` VARCHAR(200) NULL,
    ADD COLUMN `emergency_contact_name` VARCHAR(200) NULL,
    ADD COLUMN `emergency_contact_phone` VARCHAR(30) NULL,
    ADD COLUMN `fathers_name` VARCHAR(200) NULL,
    ADD COLUMN `interests` VARCHAR(500) NULL,
    ADD COLUMN `is_founding_member` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `membership_class` ENUM('senior', 'junior') NOT NULL DEFAULT 'senior',
    ADD COLUMN `mothers_name` VARCHAR(200) NULL,
    ADD COLUMN `nid_number` VARCHAR(50) NULL,
    ADD COLUMN `nid_photo_url` VARCHAR(1000) NULL,
    ADD COLUMN `occupation` VARCHAR(200) NULL,
    ADD COLUMN `profile_completed_at` DATETIME(3) NULL,
    ADD COLUMN `spouse_name` VARCHAR(200) NULL,
    ADD COLUMN `squad_type` ENUM('core', 'general') NOT NULL DEFAULT 'general',
    ADD COLUMN `workplace` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `role_assignments` ADD COLUMN `president_tier` ENUM('senior', 'junior') NULL;

-- AlterTable
ALTER TABLE `match_rsvps` ADD COLUMN `attended` BOOLEAN NULL,
    ADD COLUMN `excuse_note` VARCHAR(500) NULL,
    ADD COLUMN `excused` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `disciplinary_records` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `type` ENUM('warning', 'match_suspension', 'fine', 'membership_revoked') NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `clause` VARCHAR(20) NULL,
    `matches_suspended` INTEGER NULL,
    `served_match_id` VARCHAR(191) NULL,
    `fine_amount` DECIMAL(10, 2) NULL,
    `source_match_id` VARCHAR(191) NULL,
    `status` ENUM('active', 'served', 'rescinded') NOT NULL DEFAULT 'active',
    `issued_by` VARCHAR(191) NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rescinded_by` VARCHAR(191) NULL,
    `rescinded_at` DATETIME(3) NULL,
    `rescind_reason` VARCHAR(500) NULL,

    INDEX `disciplinary_records_member_id_status_idx`(`member_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_match_fee_choices` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `fee_month` VARCHAR(7) NOT NULL,
    `option` ENUM('monthly_pass', 'per_match') NOT NULL,
    `chosen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `member_match_fee_choices_member_id_fee_month_key`(`member_id`, `fee_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL DEFAULT 'registration',
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_verifications_email_purpose_idx`(`email`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `members_membership_class_idx` ON `members`(`membership_class`);

-- AddForeignKey
ALTER TABLE `disciplinary_records` ADD CONSTRAINT `disciplinary_records_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disciplinary_records` ADD CONSTRAINT `disciplinary_records_issued_by_fkey` FOREIGN KEY (`issued_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_match_fee_choices` ADD CONSTRAINT `member_match_fee_choices_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

