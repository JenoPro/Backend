-- ========================================
-- MIGRATION: 004_inspector_violation_system.sql
-- Description: Create inspector and violation system tables
-- Version: 1.0.0
-- Created: 2025-10-22
-- ========================================

USE `naga_stall`;

-- Inspector table
CREATE TABLE IF NOT EXISTS `inspector` (
  `inspector_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `date_created` datetime DEFAULT current_timestamp(),
  `status` enum('active','inactive') DEFAULT 'active',
  `date_hired` date DEFAULT curdate(),
  `contact_no` varchar(20) DEFAULT NULL,
  `termination_date` date DEFAULT NULL,
  `termination_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`inspector_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Inspector Assignment table
CREATE TABLE IF NOT EXISTS `inspector_assignment` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `inspector_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `remarks` varchar(255) DEFAULT NULL,
  `date_assigned` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `inspector_assignment_ibfk_1` FOREIGN KEY (`inspector_id`) REFERENCES `inspector` (`inspector_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inspector_assignment_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Inspector Action Log table
CREATE TABLE IF NOT EXISTS `inspector_action_log` (
  `action_id` int(11) NOT NULL AUTO_INCREMENT,
  `inspector_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `branch_manager_id` int(11) DEFAULT NULL,
  `action_type` enum('New Hire','Termination','Rehire','Transfer') NOT NULL,
  `action_date` datetime DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`action_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `branch_id` (`branch_id`),
  KEY `branch_manager_id` (`branch_manager_id`),
  CONSTRAINT `inspector_action_log_ibfk_1` FOREIGN KEY (`inspector_id`) REFERENCES `inspector` (`inspector_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inspector_action_log_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inspector_action_log_ibfk_3` FOREIGN KEY (`branch_manager_id`) REFERENCES `branch_manager` (`branch_manager_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Violation table
CREATE TABLE IF NOT EXISTS `violation` (
  `violation_id` int(11) NOT NULL AUTO_INCREMENT,
  `ordinance_no` varchar(50) NOT NULL,
  `violation_type` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`violation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Violation Penalty table
CREATE TABLE IF NOT EXISTS `violation_penalty` (
  `penalty_id` int(11) NOT NULL AUTO_INCREMENT,
  `violation_id` int(11) NOT NULL,
  `offense_no` int(11) NOT NULL,
  `penalty_amount` decimal(10,2) DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`penalty_id`),
  KEY `violation_id` (`violation_id`),
  CONSTRAINT `violation_penalty_ibfk_1` FOREIGN KEY (`violation_id`) REFERENCES `violation` (`violation_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Violation Report table
CREATE TABLE IF NOT EXISTS `violation_report` (
  `report_id` int(11) NOT NULL AUTO_INCREMENT,
  `inspector_id` int(11) DEFAULT NULL,
  `stallholder_id` int(11) DEFAULT NULL,
  `violator_name` varchar(255) DEFAULT NULL,
  `violation_id` int(11) NOT NULL,
  `stall_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `evidence` blob DEFAULT NULL,
  `date_reported` datetime DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL,
  `offense_no` int(11) DEFAULT NULL,
  `penalty_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `violation_id` (`violation_id`),
  KEY `stallholder_id` (`stallholder_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `stall_id` (`stall_id`),
  KEY `branch_id` (`branch_id`),
  KEY `fk_report_penalty` (`penalty_id`),
  CONSTRAINT `fk_report_violation` FOREIGN KEY (`violation_id`) REFERENCES `violation` (`violation_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_report_stallholder` FOREIGN KEY (`stallholder_id`) REFERENCES `stallholder` (`stallholder_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_report_inspector` FOREIGN KEY (`inspector_id`) REFERENCES `inspector` (`inspector_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_report_stall` FOREIGN KEY (`stall_id`) REFERENCES `stall` (`stall_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_report_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_report_penalty` FOREIGN KEY (`penalty_id`) REFERENCES `violation_penalty` (`penalty_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Record migration execution
INSERT IGNORE INTO migrations (migration_name, version) VALUES ('004_inspector_violation_system', '1.0.0');