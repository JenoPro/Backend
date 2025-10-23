-- ========================================
-- NAGA STALL MANAGEMENT SYSTEM
-- Complete Database Setup with Migration Support
-- ========================================
-- This file sets up the complete database with automatic migration tracking
-- Compatible with XAMPP, WAMP, LAMP, MAMP and all MySQL environments
-- Executes migrations in correct order with duplicate prevention
-- ========================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `naga_stall` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_general_ci;

USE `naga_stall`;

-- Set SQL mode for compatibility
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ========================================
-- EXECUTE MIGRATIONS IN ORDER
-- ========================================

-- Migration 1: Initial database setup with core tables
SOURCE migrations/001_initial_database_setup.sql;

-- Migration 2: Remaining supporting tables
SOURCE migrations/002_remaining_tables.sql;

-- Migration 3: Auction and raffle system
SOURCE migrations/003_auction_raffle_system.sql;

-- Migration 4: Inspector and violation system
SOURCE migrations/004_inspector_violation_system.sql;

-- Migration 5: All stored procedures
SOURCE migrations/005_stored_procedures.sql;

-- Migration 6: Employee management system
SOURCE migrations/006_employee_management_system.sql;
-- ========================================
-- COMPLETION MESSAGE
-- ========================================

SELECT CONCAT(
    '✅ Database setup complete! ',
    'Total migrations executed: ', COUNT(*), 
    ' | Last executed: ', MAX(executed_at)
) as setup_status 
FROM migrations;

COMMIT;

-- Display final status
SELECT 
    'naga_stall' as database_name,
    COUNT(DISTINCT table_name) as total_tables,
    'Complete with migrations' as status
FROM information_schema.tables 
WHERE table_schema = 'naga_stall';

SELECT '🎉 Naga Stall Management System database is ready for use!' as message;
(3, 1, 3, 1000.00, NULL),
(4, 1, 4, 0.00, 'Cancellation of Permit'),
(5, 2, 1, 500.00, NULL),
(6, 2, 2, 1000.00, NULL),
(7, 2, 3, 1500.00, NULL),
(8, 3, 1, 1500.00, NULL),
(9, 3, 2, 2500.00, NULL),
(10, 3, 3, 3500.00, NULL),
(11, 3, 4, 5000.00, 'Imprisonment of not less than 6 months');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;