-- ========================================
-- MIGRATION: 002_remaining_tables.sql
-- Description: Create remaining tables for the system
-- Version: 1.0.0
-- Created: 2025-10-22
-- ========================================

USE `naga_stall`;

-- Check if this migration has already been run
SET @migration_name = '002_remaining_tables';
SET @migration_exists = (SELECT COUNT(*) FROM `migrations` WHERE `migration_name` = @migration_name);

-- Business Information table
CREATE TABLE IF NOT EXISTS `business_information` (
  `business_id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` int(11) NOT NULL,
  `nature_of_business` varchar(255) DEFAULT NULL,
  `capitalization` decimal(15,2) DEFAULT NULL,
  `source_of_capital` varchar(255) DEFAULT NULL,
  `previous_business_experience` text DEFAULT NULL,
  `relative_stall_owner` enum('Yes','No') DEFAULT 'No',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`business_id`),
  KEY `applicant_id` (`applicant_id`),
  CONSTRAINT `business_information_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Spouse table
CREATE TABLE IF NOT EXISTS `spouse` (
  `spouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` int(11) NOT NULL,
  `spouse_full_name` varchar(255) NOT NULL,
  `spouse_birthdate` date DEFAULT NULL,
  `spouse_educational_attainment` varchar(100) DEFAULT NULL,
  `spouse_contact_number` varchar(20) DEFAULT NULL,
  `spouse_occupation` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`spouse_id`),
  KEY `applicant_id` (`applicant_id`),
  CONSTRAINT `spouse_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Other Information table
CREATE TABLE IF NOT EXISTS `other_information` (
  `other_info_id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` int(11) NOT NULL,
  `signature_of_applicant` varchar(500) DEFAULT NULL,
  `house_sketch_location` varchar(500) DEFAULT NULL,
  `valid_id` varchar(500) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`other_info_id`),
  KEY `applicant_id` (`applicant_id`),
  CONSTRAINT `other_information_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Credential table
CREATE TABLE IF NOT EXISTS `credential` (
  `registrationid` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` int(11) NOT NULL,
  `user_name` varchar(50) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`registrationid`),
  KEY `applicant_id` (`applicant_id`),
  CONSTRAINT `credential_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Document table
CREATE TABLE IF NOT EXISTS `document` (
  `document_id` int(11) NOT NULL AUTO_INCREMENT,
  `application_id` int(11) NOT NULL,
  `award_paper` varchar(500) DEFAULT NULL,
  `lease_contract` varchar(500) DEFAULT NULL,
  `market_clearance` varchar(500) DEFAULT NULL,
  `cedula` varchar(500) DEFAULT NULL,
  `health_card` varchar(500) DEFAULT NULL,
  `date_uploaded` timestamp NOT NULL DEFAULT current_timestamp(),
  `verification_status` enum('Pending','Verified','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`document_id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `document_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Payment table
CREATE TABLE IF NOT EXISTS `payment` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('Cash','Check','Bank Transfer','Online Payment') DEFAULT 'Cash',
  `payment_status` enum('Pending','Completed','Failed','Cancelled') DEFAULT 'Pending',
  `transaction_reference` varchar(100) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Branch Employee table
CREATE TABLE IF NOT EXISTS `branch_employee` (
  `employee_id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` int(11) NOT NULL,
  `employee_username` varchar(50) NOT NULL UNIQUE,
  `employee_password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `position` varchar(50) DEFAULT 'Staff',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`employee_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `branch_employee_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Stallholder table
CREATE TABLE IF NOT EXISTS `stallholder` (
  `stallholder_id` int(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` int(11) NOT NULL,
  `stallholder_name` varchar(150) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `contract_start_date` date NOT NULL,
  `contract_end_date` date NOT NULL,
  `contract_status` enum('Active','Expired','Terminated') DEFAULT 'Active',
  `lease_amount` decimal(10,2) NOT NULL,
  `compliance_status` enum('Compliant','Non-Compliant') DEFAULT 'Compliant',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_violation_date` date DEFAULT NULL,
  PRIMARY KEY (`stallholder_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `fk_stallholder_branch` (`branch_id`),
  CONSTRAINT `stallholder_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicant` (`applicant_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stallholder_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Record migration execution if not already executed
INSERT IGNORE INTO migrations (migration_name, version) VALUES ('002_remaining_tables', '1.0.0');