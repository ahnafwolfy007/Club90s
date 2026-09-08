-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `status` ENUM('unactivated', 'active', 'suspended') NOT NULL DEFAULT 'unactivated',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(200) NOT NULL,
    `profile_photo_url` VARCHAR(1000) NULL,
    `dob` DATE NULL,
    `joining_date` DATE NOT NULL,
    `position` VARCHAR(100) NULL,
    `jersey_number` INTEGER NULL,
    `preferred_foot` VARCHAR(20) NULL,
    `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'pending',
    `phone` VARCHAR(30) NULL,
    `emergency_contact` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `members_user_id_key`(`user_id`),
    INDEX `members_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sectors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sectors_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` ENUM('member', 'president', 'admin', 'advisor') NOT NULL,
    `description` VARCHAR(255) NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `sector_id` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended', 'removed') NOT NULL DEFAULT 'active',
    `granted_by` VARCHAR(191) NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ends_at` DATETIME(3) NULL,

    INDEX `role_assignments_member_id_status_idx`(`member_id`, `status`),
    INDEX `role_assignments_role_id_sector_id_status_idx`(`role_id`, `sector_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `match_date` DATE NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `venue_name` VARCHAR(200) NOT NULL,
    `venue_address` VARCHAR(500) NULL,
    `map_link` VARCHAR(1000) NULL,
    `fee` DECIMAL(10, 2) NULL,
    `max_players` INTEGER NOT NULL,
    `rsvp_deadline` DATETIME(3) NOT NULL,
    `organizer_id` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('draft', 'published', 'cancelled', 'completed') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `matches_match_date_idx`(`match_date`),
    INDEX `matches_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match_rsvps` (
    `id` VARCHAR(191) NOT NULL,
    `match_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `response` ENUM('in', 'out', 'maybe') NOT NULL,
    `waitlisted` BOOLEAN NOT NULL DEFAULT false,
    `responded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `match_rsvps_match_id_response_idx`(`match_id`, `response`),
    UNIQUE INDEX `match_rsvps_match_id_member_id_key`(`match_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match_rsvp_history` (
    `id` VARCHAR(191) NOT NULL,
    `match_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `old_response` ENUM('in', 'out', 'maybe') NULL,
    `new_response` ENUM('in', 'out', 'maybe') NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `match_rsvp_history_match_id_idx`(`match_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `match_id` VARCHAR(191) NULL,
    `tournament_id` VARCHAR(191) NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` ENUM('draft', 'published', 'locked') NOT NULL DEFAULT 'draft',
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `teams_match_id_idx`(`match_id`),
    INDEX `teams_tournament_id_idx`(`tournament_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_players` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `is_goalkeeper` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `team_players_team_id_member_id_key`(`team_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournaments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `start_date` DATE NOT NULL,
    `registration_deadline` DATETIME(3) NULL,
    `num_teams` INTEGER NOT NULL,
    `format` VARCHAR(50) NOT NULL,
    `rules` TEXT NULL,
    `venue` VARCHAR(200) NULL,
    `fee` DECIMAL(10, 2) NULL,
    `prize_info` TEXT NULL,
    `status` ENUM('draft', 'open', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    `bidding_enabled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tournaments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_players` (
    `id` VARCHAR(191) NOT NULL,
    `tournament_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pooled', 'sold', 'unsold') NOT NULL DEFAULT 'pooled',
    `auction_order` INTEGER NULL,
    `sold_to_team_id` VARCHAR(191) NULL,
    `sold_amount` DECIMAL(10, 2) NULL,

    INDEX `tournament_players_tournament_id_status_idx`(`tournament_id`, `status`),
    UNIQUE INDEX `tournament_players_tournament_id_member_id_key`(`tournament_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_teams` (
    `id` VARCHAR(191) NOT NULL,
    `tournament_id` VARCHAR(191) NOT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `owner_member_id` VARCHAR(191) NOT NULL,
    `starting_budget` DECIMAL(10, 2) NOT NULL,
    `remaining_budget` DECIMAL(10, 2) NOT NULL,
    `min_squad` INTEGER NOT NULL,
    `max_squad` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tournament_teams_tournament_id_owner_member_id_key`(`tournament_id`, `owner_member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bids` (
    `id` VARCHAR(191) NOT NULL,
    `tournament_player_id` VARCHAR(191) NOT NULL,
    `tournament_team_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `placed_by` VARCHAR(191) NOT NULL,
    `placed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_winning` BOOLEAN NOT NULL DEFAULT false,
    `client_request_id` VARCHAR(100) NULL,

    INDEX `bids_tournament_player_id_amount_idx`(`tournament_player_id`, `amount`),
    UNIQUE INDEX `bids_tournament_player_id_client_request_id_key`(`tournament_player_id`, `client_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('income', 'expense') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `finance_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('income', 'expense') NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(500) NULL,
    `member_id` VARCHAR(191) NULL,
    `match_id` VARCHAR(191) NULL,
    `tournament_id` VARCHAR(191) NULL,
    `payment_method` VARCHAR(30) NULL,
    `recorded_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('posted', 'voided') NOT NULL DEFAULT 'posted',
    `voided_by` VARCHAR(191) NULL,
    `voided_at` DATETIME(3) NULL,
    `void_reason` VARCHAR(500) NULL,
    `reversal_of_transaction_id` VARCHAR(191) NULL,
    `source` ENUM('manual', 'migrated') NOT NULL DEFAULT 'manual',
    `import_batch_id` VARCHAR(191) NULL,
    `attachment_url` VARCHAR(1000) NULL,
    `fee_month` VARCHAR(7) NULL,
    `date_estimated` BOOLEAN NOT NULL DEFAULT false,
    `original_value` VARCHAR(255) NULL,

    INDEX `financial_transactions_member_id_category_id_idx`(`member_id`, `category_id`),
    INDEX `financial_transactions_match_id_idx`(`match_id`),
    INDEX `financial_transactions_tournament_id_idx`(`tournament_id`),
    INDEX `financial_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `club_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` VARCHAR(1000) NOT NULL,
    `updated_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `sector_tag` VARCHAR(191) NULL,
    `image_url` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edited_at` DATETIME(3) NULL,
    `status` ENUM('visible', 'hidden', 'removed') NOT NULL DEFAULT 'visible',

    INDEX `posts_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_reactions` (
    `id` VARCHAR(191) NOT NULL,
    `post_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `reaction_type` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `post_reactions_post_id_member_id_key`(`post_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_comments` (
    `id` VARCHAR(191) NOT NULL,
    `post_id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('visible', 'hidden', 'removed') NOT NULL DEFAULT 'visible',

    INDEX `post_comments_post_id_idx`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievements` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `event_name` VARCHAR(200) NULL,
    `issuing_org` VARCHAR(200) NULL,
    `year` INTEGER NULL,
    `image_url` VARCHAR(1000) NULL,
    `visibility` ENUM('all_members', 'private') NOT NULL DEFAULT 'all_members',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievements_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'normal',
    `target_audience` VARCHAR(50) NOT NULL DEFAULT 'all',
    `attachment_url` VARCHAR(1000) NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,

    INDEX `announcements_published_at_idx`(`published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `payload` JSON NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `elections` (
    `id` VARCHAR(191) NOT NULL,
    `sector_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `status` ENUM('draft', 'open', 'closed', 'cancelled') NOT NULL DEFAULT 'draft',
    `created_by` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_candidates` (
    `id` VARCHAR(191) NOT NULL,
    `election_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `election_candidates_election_id_member_id_key`(`election_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_voters` (
    `id` VARCHAR(191) NOT NULL,
    `election_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `voted_at` DATETIME(3) NULL,

    UNIQUE INDEX `election_voters_election_id_member_id_key`(`election_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_ballots` (
    `id` VARCHAR(191) NOT NULL,
    `election_id` VARCHAR(191) NOT NULL,
    `candidate_id` VARCHAR(191) NOT NULL,
    `cast_date` DATE NOT NULL,

    INDEX `election_ballots_election_id_idx`(`election_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_applications` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(200) NOT NULL,
    `contact_info` VARCHAR(255) NOT NULL,
    `submitted_by` VARCHAR(191) NULL,
    `status` ENUM('submitted', 'in_review', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
    `reviewed_by` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_batches` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('members', 'finance') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `imported_by` VARCHAR(191) NOT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `summary` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activation_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activation_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `before_value` JSON NULL,
    `after_value` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_actor_id_idx`(`actor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sectors` ADD CONSTRAINT `sectors_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_sector_id_fkey` FOREIGN KEY (`sector_id`) REFERENCES `sectors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_granted_by_fkey` FOREIGN KEY (`granted_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_organizer_id_fkey` FOREIGN KEY (`organizer_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_rsvps` ADD CONSTRAINT `match_rsvps_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_rsvps` ADD CONSTRAINT `match_rsvps_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_rsvp_history` ADD CONSTRAINT `match_rsvp_history_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_players` ADD CONSTRAINT `team_players_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_players` ADD CONSTRAINT `team_players_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_players` ADD CONSTRAINT `tournament_players_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_players` ADD CONSTRAINT `tournament_players_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_players` ADD CONSTRAINT `tournament_players_sold_to_team_id_fkey` FOREIGN KEY (`sold_to_team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_teams` ADD CONSTRAINT `tournament_teams_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_teams` ADD CONSTRAINT `tournament_teams_owner_member_id_fkey` FOREIGN KEY (`owner_member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_tournament_player_id_fkey` FOREIGN KEY (`tournament_player_id`) REFERENCES `tournament_players`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_tournament_team_id_fkey` FOREIGN KEY (`tournament_team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_placed_by_fkey` FOREIGN KEY (`placed_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_voided_by_fkey` FOREIGN KEY (`voided_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_import_batch_id_fkey` FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_reversal_of_transaction_id_fkey` FOREIGN KEY (`reversal_of_transaction_id`) REFERENCES `financial_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `club_settings` ADD CONSTRAINT `club_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_reactions` ADD CONSTRAINT `post_reactions_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_reactions` ADD CONSTRAINT `post_reactions_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_comments` ADD CONSTRAINT `post_comments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_comments` ADD CONSTRAINT `post_comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `elections` ADD CONSTRAINT `elections_sector_id_fkey` FOREIGN KEY (`sector_id`) REFERENCES `sectors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `elections` ADD CONSTRAINT `elections_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidates` ADD CONSTRAINT `election_candidates_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `elections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidates` ADD CONSTRAINT `election_candidates_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_voters` ADD CONSTRAINT `election_voters_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `elections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_ballots` ADD CONSTRAINT `election_ballots_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `elections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_ballots` ADD CONSTRAINT `election_ballots_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `election_candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_applications` ADD CONSTRAINT `recruitment_applications_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_applications` ADD CONSTRAINT `recruitment_applications_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_batches` ADD CONSTRAINT `import_batches_imported_by_fkey` FOREIGN KEY (`imported_by`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activation_tokens` ADD CONSTRAINT `activation_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
