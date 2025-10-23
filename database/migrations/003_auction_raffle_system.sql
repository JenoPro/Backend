-- ========================================
-- MIGRATION: 003_auction_raffle_system.sql
-- Description: Create auction and raffle system tables
-- Version: 1.0.0
-- Created: 2025-10-22
-- ========================================

USE `naga_stall`;

-- Auction table
CREATE TABLE IF NOT EXISTS `auction` (
  `auction_id` int(11) NOT NULL AUTO_INCREMENT,
  `stall_id` int(11) NOT NULL,
  `starting_price` decimal(10,2) NOT NULL,
  `current_highest_bid` decimal(10,2) DEFAULT NULL,
  `highest_bidder_id` int(11) DEFAULT NULL,
  `application_deadline` datetime DEFAULT NULL,
  `first_bid_time` datetime DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `auction_status` enum('Waiting for Bidders','Active','Ended','Cancelled') DEFAULT 'Waiting for Bidders',
  `total_bids` int(11) DEFAULT 0,
  `winner_confirmed` tinyint(1) DEFAULT 0,
  `winner_applicant_id` int(11) DEFAULT NULL,
  `winning_bid_amount` decimal(10,2) DEFAULT NULL,
  `winner_selection_date` datetime DEFAULT NULL,
  `created_by_manager` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`auction_id`),
  UNIQUE KEY `unique_stall_auction` (`stall_id`),
  KEY `idx_auction_status_end_time` (`auction_status`,`end_time`),
  KEY `idx_auction_manager` (`created_by_manager`),
  KEY `fk_auction_highest_bidder` (`highest_bidder_id`),
  KEY `fk_auction_winner` (`winner_applicant_id`),
  CONSTRAINT `fk_auction_stall` FOREIGN KEY (`stall_id`) REFERENCES `stall` (`stall_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_manager` FOREIGN KEY (`created_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_highest_bidder` FOREIGN KEY (`highest_bidder_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_auction_winner` FOREIGN KEY (`winner_applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Auction Bids table
CREATE TABLE IF NOT EXISTS `auction_bids` (
  `bid_id` int(11) NOT NULL AUTO_INCREMENT,
  `auction_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `bid_amount` decimal(10,2) NOT NULL,
  `bid_time` datetime NOT NULL DEFAULT current_timestamp(),
  `is_winning_bid` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`bid_id`),
  KEY `idx_auction_bids_auction` (`auction_id`),
  KEY `idx_auction_bids_applicant` (`applicant_id`),
  KEY `idx_auction_bids_amount` (`auction_id`,`bid_amount`),
  KEY `idx_auction_bids_time` (`auction_id`,`bid_time`),
  KEY `fk_auction_bids_application` (`application_id`),
  CONSTRAINT `fk_auction_bids_auction` FOREIGN KEY (`auction_id`) REFERENCES `auction` (`auction_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_bids_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_bids_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Auction Result table
CREATE TABLE IF NOT EXISTS `auction_result` (
  `result_id` int(11) NOT NULL AUTO_INCREMENT,
  `auction_id` int(11) NOT NULL,
  `winner_applicant_id` int(11) NOT NULL,
  `winner_application_id` int(11) NOT NULL,
  `winning_bid_amount` decimal(10,2) NOT NULL,
  `result_date` datetime NOT NULL DEFAULT current_timestamp(),
  `total_bids` int(11) NOT NULL,
  `total_bidders` int(11) NOT NULL,
  `awarded_by_manager` int(11) NOT NULL,
  `result_status` enum('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`result_id`),
  UNIQUE KEY `unique_auction_result` (`auction_id`),
  KEY `fk_auction_result_winner` (`winner_applicant_id`),
  KEY `fk_auction_result_application` (`winner_application_id`),
  KEY `fk_auction_result_manager` (`awarded_by_manager`),
  CONSTRAINT `fk_auction_result_auction` FOREIGN KEY (`auction_id`) REFERENCES `auction` (`auction_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_result_winner` FOREIGN KEY (`winner_applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_result_application` FOREIGN KEY (`winner_application_id`) REFERENCES `application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auction_result_manager` FOREIGN KEY (`awarded_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Raffle table
CREATE TABLE IF NOT EXISTS `raffle` (
  `raffle_id` int(11) NOT NULL AUTO_INCREMENT,
  `stall_id` int(11) NOT NULL,
  `application_deadline` datetime DEFAULT NULL,
  `first_application_time` datetime DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `raffle_status` enum('Waiting for Participants','Active','Ended','Cancelled') DEFAULT 'Waiting for Participants',
  `total_participants` int(11) DEFAULT 0,
  `winner_selected` tinyint(1) DEFAULT 0,
  `winner_applicant_id` int(11) DEFAULT NULL,
  `winner_selection_date` datetime DEFAULT NULL,
  `created_by_manager` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`raffle_id`),
  UNIQUE KEY `unique_stall_raffle` (`stall_id`),
  KEY `idx_raffle_status_end_time` (`raffle_status`,`end_time`),
  KEY `idx_raffle_manager` (`created_by_manager`),
  KEY `fk_raffle_winner` (`winner_applicant_id`),
  CONSTRAINT `fk_raffle_stall` FOREIGN KEY (`stall_id`) REFERENCES `stall` (`stall_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_manager` FOREIGN KEY (`created_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_winner` FOREIGN KEY (`winner_applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Raffle Participants table
CREATE TABLE IF NOT EXISTS `raffle_participants` (
  `participant_id` int(11) NOT NULL AUTO_INCREMENT,
  `raffle_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `participation_time` datetime NOT NULL DEFAULT current_timestamp(),
  `is_winner` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`participant_id`),
  UNIQUE KEY `unique_raffle_applicant` (`raffle_id`,`applicant_id`),
  KEY `idx_raffle_participants_raffle` (`raffle_id`),
  KEY `idx_raffle_participants_applicant` (`applicant_id`),
  KEY `fk_raffle_participants_application` (`application_id`),
  CONSTRAINT `fk_raffle_participants_raffle` FOREIGN KEY (`raffle_id`) REFERENCES `raffle` (`raffle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_participants_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_participants_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Raffle Result table
CREATE TABLE IF NOT EXISTS `raffle_result` (
  `result_id` int(11) NOT NULL AUTO_INCREMENT,
  `raffle_id` int(11) NOT NULL,
  `winner_applicant_id` int(11) NOT NULL,
  `winner_application_id` int(11) NOT NULL,
  `result_date` datetime NOT NULL DEFAULT current_timestamp(),
  `total_participants` int(11) NOT NULL,
  `selection_method` enum('Random','Manual') DEFAULT 'Random',
  `awarded_by_manager` int(11) NOT NULL,
  `result_status` enum('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`result_id`),
  UNIQUE KEY `unique_raffle_result` (`raffle_id`),
  KEY `fk_raffle_result_winner` (`winner_applicant_id`),
  KEY `fk_raffle_result_application` (`winner_application_id`),
  KEY `fk_raffle_result_manager` (`awarded_by_manager`),
  CONSTRAINT `fk_raffle_result_raffle` FOREIGN KEY (`raffle_id`) REFERENCES `raffle` (`raffle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_result_winner` FOREIGN KEY (`winner_applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_result_application` FOREIGN KEY (`winner_application_id`) REFERENCES `application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_raffle_result_manager` FOREIGN KEY (`awarded_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Raffle Auction Log table
CREATE TABLE IF NOT EXISTS `raffle_auction_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `stall_id` int(11) NOT NULL,
  `raffle_id` int(11) DEFAULT NULL,
  `auction_id` int(11) DEFAULT NULL,
  `action_type` enum('Created','Deadline Extended','Deadline Shortened','Status Changed','Cancelled','Winner Selected','Deadline Activated') NOT NULL,
  `old_deadline` datetime DEFAULT NULL,
  `new_deadline` datetime DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `performed_by_manager` int(11) NOT NULL,
  `action_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_log_stall` (`stall_id`),
  KEY `idx_log_raffle` (`raffle_id`),
  KEY `idx_log_auction` (`auction_id`),
  KEY `idx_log_manager` (`performed_by_manager`),
  KEY `idx_log_timestamp` (`action_timestamp`),
  CONSTRAINT `fk_log_stall` FOREIGN KEY (`stall_id`) REFERENCES `stall` (`stall_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_raffle` FOREIGN KEY (`raffle_id`) REFERENCES `raffle` (`raffle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_auction` FOREIGN KEY (`auction_id`) REFERENCES `auction` (`auction_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_manager` FOREIGN KEY (`performed_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Record migration execution
INSERT IGNORE INTO migrations (migration_name, version) VALUES ('003_auction_raffle_system', '1.0.0');