-- ========================================
-- MIGRATION: 001_initial_database_setup.sql
-- Description: Initial database and tables creation
-- Version: 1.0.0
-- Created: 2025-10-22
-- ========================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `naga_stall` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

USE `naga_stall`;

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS `migrations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `migration_name` VARCHAR(255) NOT NULL UNIQUE,
    `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `version` VARCHAR(50) NOT NULL
);

-- Check if this migration has already been run
SET @migration_name = '001_initial_database_setup';
SET @migration_exists = (SELECT COUNT(*) FROM `migrations` WHERE `migration_name` = @migration_name);

-- Only execute if migration hasn't been run
SET @sql = IF(@migration_exists = 0, 
    'INSERT INTO migrations (migration_name, version) VALUES (''001_initial_database_setup'', ''1.0.0'')', 
    'SELECT ''Migration already executed'' AS message'
);

-- Admin table
CREATE TABLE IF NOT EXISTS `admin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL UNIQUE,
  `admin_password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL UNIQUE,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Applicant table
CREATE TABLE IF NOT EXISTS `applicant` (
  `applicant_id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_full_name` varchar(255) NOT NULL,
  `applicant_contact_number` varchar(20) DEFAULT NULL,
  `applicant_address` text DEFAULT NULL,
  `applicant_birthdate` date DEFAULT NULL,
  `applicant_civil_status` enum('Single','Married','Divorced','Widowed') DEFAULT NULL,
  `applicant_educational_attainment` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`applicant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Branch table
CREATE TABLE IF NOT EXISTS `branch` (
  `branch_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `area` varchar(100) NOT NULL,
  `location` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('Active','Inactive','Under Construction','Maintenance') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`branch_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `branch_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Branch Manager table
CREATE TABLE IF NOT EXISTS `branch_manager` (
  `branch_manager_id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` int(11) NOT NULL,
  `manager_username` varchar(50) NOT NULL UNIQUE,
  `manager_password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`branch_manager_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `branch_manager_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Floor table
CREATE TABLE IF NOT EXISTS `floor` (
  `floor_id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` int(11) NOT NULL,
  `floor_name` varchar(50) NOT NULL,
  `floor_number` int(11) NOT NULL,
  `status` enum('Active','Inactive','Under Construction','Maintenance') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`floor_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `floor_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Section table
CREATE TABLE IF NOT EXISTS `section` (
  `section_id` int(11) NOT NULL AUTO_INCREMENT,
  `floor_id` int(11) NOT NULL,
  `section_name` varchar(100) NOT NULL,
  `status` enum('Active','Inactive','Under Construction','Maintenance') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`section_id`),
  KEY `floor_id` (`floor_id`),
  CONSTRAINT `section_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `floor` (`floor_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Stall table
CREATE TABLE IF NOT EXISTS `stall` (
  `stall_id` int(11) NOT NULL AUTO_INCREMENT,
  `section_id` int(11) NOT NULL,
  `floor_id` int(11) NOT NULL,
  `stall_no` varchar(20) NOT NULL,
  `stall_location` varchar(100) NOT NULL,
  `size` varchar(50) DEFAULT NULL,
  `rental_price` decimal(10,2) DEFAULT NULL,
  `price_type` enum('Fixed Price','Auction','Raffle') DEFAULT 'Fixed Price',
  `status` enum('Active','Inactive','Maintenance','Occupied') DEFAULT 'Active',
  `stamp` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `stall_image` varchar(500) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `raffle_auction_deadline` datetime DEFAULT NULL,
  `deadline_active` tinyint(1) DEFAULT 0,
  `raffle_auction_status` enum('Not Started','Active','Ended','Cancelled') DEFAULT 'Not Started',
  `raffle_auction_start_time` datetime DEFAULT NULL,
  `raffle_auction_end_time` datetime DEFAULT NULL,
  `created_by_manager` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`stall_id`),
  UNIQUE KEY `unique_stall_per_floor` (`floor_id`,`stall_no`),
  KEY `section_id` (`section_id`),
  KEY `floor_id` (`floor_id`),
  KEY `idx_stall_availability` (`is_available`,`status`),
  KEY `idx_raffle_auction_status` (`price_type`,`raffle_auction_status`,`raffle_auction_end_time`),
  KEY `fk_stall_created_by_manager` (`created_by_manager`),
  CONSTRAINT `stall_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `section` (`section_id`) ON DELETE CASCADE,
  CONSTRAINT `stall_floor_fk` FOREIGN KEY (`floor_id`) REFERENCES `floor` (`floor_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stall_created_by_manager` FOREIGN KEY (`created_by_manager`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Application table
CREATE TABLE IF NOT EXISTS `application` (
  `application_id` int(11) NOT NULL AUTO_INCREMENT,
  `stall_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `application_date` date NOT NULL,
  `application_status` enum('Pending','Under Review','Approved','Rejected','Cancelled') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`application_id`),
  KEY `stall_id` (`stall_id`),
  KEY `applicant_id` (`applicant_id`),
  CONSTRAINT `application_ibfk_1` FOREIGN KEY (`stall_id`) REFERENCES `stall` (`stall_id`) ON DELETE CASCADE,
  CONSTRAINT `application_ibfk_2` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Record migration execution
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;