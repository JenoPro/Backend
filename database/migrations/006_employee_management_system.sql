-- ========================================
-- MIGRATION: 006_employee_management_system.sql
-- Description: Employee management system with auto-generated credentials
-- Version: 1.0.0
-- Created: 2025-10-23
-- ========================================

USE `naga_stall`;

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS `migrations` (
    `migration_id` INT AUTO_INCREMENT PRIMARY KEY,
    `migration_name` VARCHAR(255) NOT NULL UNIQUE,
    `version` VARCHAR(50) NOT NULL,
    `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_migration_name` (`migration_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- EMPLOYEE MANAGEMENT TABLES
-- ========================================

-- Main employee table
CREATE TABLE IF NOT EXISTS `employee` (
    `employee_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_username` VARCHAR(20) UNIQUE NOT NULL COMMENT 'Auto-generated: EMP + 4 digits',
    `employee_password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `phone_number` VARCHAR(20),
    `branch_id` INT,
    `created_by_manager` INT,
    `permissions` JSON COMMENT 'Employee permissions object',
    `status` ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    `last_login` TIMESTAMP NULL,
    `password_reset_required` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`branch_id`) REFERENCES `branch`(`branch_id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by_manager`) REFERENCES `branch_manager`(`branch_manager_id`) ON DELETE SET NULL,
    
    INDEX `idx_employee_branch` (`branch_id`),
    INDEX `idx_employee_status` (`status`),
    INDEX `idx_employee_username` (`employee_username`),
    INDEX `idx_employee_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Employee session tracking
CREATE TABLE IF NOT EXISTS `employee_session` (
    `session_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `session_token` VARCHAR(255) UNIQUE NOT NULL,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `login_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_active` BOOLEAN DEFAULT TRUE,
    `logout_time` TIMESTAMP NULL,
    
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`employee_id`) ON DELETE CASCADE,
    INDEX `idx_session_employee` (`employee_id`),
    INDEX `idx_session_token` (`session_token`),
    INDEX `idx_session_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS `employee_password_reset` (
    `reset_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `reset_token` VARCHAR(255) UNIQUE NOT NULL,
    `requested_by` INT COMMENT 'Manager who requested reset',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL,
    `used_at` TIMESTAMP NULL,
    `is_used` BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`employee_id`) ON DELETE CASCADE,
    FOREIGN KEY (`requested_by`) REFERENCES `branch_manager`(`branch_manager_id`) ON DELETE SET NULL,
    INDEX `idx_reset_employee` (`employee_id`),
    INDEX `idx_reset_token` (`reset_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Employee activity log
CREATE TABLE IF NOT EXISTS `employee_activity_log` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT,
    `action_type` VARCHAR(100) NOT NULL COMMENT 'login, logout, create, update, delete, etc.',
    `action_description` TEXT,
    `performed_by` INT COMMENT 'Manager who performed action',
    `target_resource` VARCHAR(100) COMMENT 'What was affected',
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`employee_id`) ON DELETE SET NULL,
    FOREIGN KEY (`performed_by`) REFERENCES `branch_manager`(`branch_manager_id`) ON DELETE SET NULL,
    INDEX `idx_activity_employee` (`employee_id`),
    INDEX `idx_activity_action` (`action_type`),
    INDEX `idx_activity_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Email templates for employee notifications
CREATE TABLE IF NOT EXISTS `employee_email_template` (
    `template_id` INT AUTO_INCREMENT PRIMARY KEY,
    `template_name` VARCHAR(100) UNIQUE NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `html_content` TEXT NOT NULL,
    `text_content` TEXT NOT NULL,
    `variables` JSON COMMENT 'Available template variables',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_template_name` (`template_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Employee credentials log (for audit purposes)
CREATE TABLE IF NOT EXISTS `employee_credential_log` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `action_type` ENUM('created', 'password_reset', 'username_changed') NOT NULL,
    `old_username` VARCHAR(20),
    `new_username` VARCHAR(20),
    `generated_by` INT COMMENT 'Manager who triggered the action',
    `email_sent` BOOLEAN DEFAULT FALSE,
    `email_sent_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`employee_id`) REFERENCES `employee`(`employee_id`) ON DELETE CASCADE,
    FOREIGN KEY (`generated_by`) REFERENCES `branch_manager`(`branch_manager_id`) ON DELETE SET NULL,
    INDEX `idx_credential_employee` (`employee_id`),
    INDEX `idx_credential_action` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- INSERT DEFAULT EMAIL TEMPLATES
-- ========================================

INSERT IGNORE INTO `employee_email_template` (`template_name`, `subject`, `html_content`, `text_content`, `variables`) VALUES
('welcome_employee', 
 'Welcome to Naga Stall Management - Your Account Details',
 '<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Naga Stall Management</h1>
            <p>Your employee account has been created</p>
        </div>
        <div class="content">
            <p>Hello {{firstName}} {{lastName}},</p>
            <p>Your employee account has been successfully created in the Naga Stall Management System. Below are your login credentials:</p>
            
            <div class="credentials">
                <h3>Your Login Credentials</h3>
                <p><strong>Username:</strong> {{username}}</p>
                <p><strong>Password:</strong> {{password}}</p>
                <p><strong>Login URL:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p>
            </div>
            
            <p><strong>Important Security Notes:</strong></p>
            <ul>
                <li>Please change your password after your first login</li>
                <li>Keep your credentials secure and do not share them</li>
                <li>Contact your manager if you have any login issues</li>
            </ul>
            
            <a href="{{loginUrl}}" class="button">Login to Your Account</a>
            
            <p>If you have any questions, please contact your branch manager or the system administrator.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from Naga Stall Management System</p>
            <p>Branch: {{branchName}} | Created by: {{createdBy}}</p>
        </div>
    </div>
</body>
</html>',
'Welcome to Naga Stall Management System

Hello {{firstName}} {{lastName}},

Your employee account has been successfully created. Here are your login credentials:

Username: {{username}}
Password: {{password}}
Login URL: {{loginUrl}}

IMPORTANT SECURITY NOTES:
- Please change your password after your first login
- Keep your credentials secure and do not share them
- Contact your manager if you have any login issues

If you have any questions, please contact your branch manager or system administrator.

Branch: {{branchName}}
Created by: {{createdBy}}

This is an automated message from Naga Stall Management System.',
'["firstName", "lastName", "username", "password", "loginUrl", "branchName", "createdBy"]'),

('password_reset', 
 'Password Reset - Naga Stall Management',
 '<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff6b6b; }
        .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
            <p>Your password has been reset</p>
        </div>
        <div class="content">
            <p>Hello {{firstName}} {{lastName}},</p>
            <p>Your password has been reset by your manager. Below are your new login credentials:</p>
            
            <div class="credentials">
                <h3>Your New Login Credentials</h3>
                <p><strong>Username:</strong> {{username}}</p>
                <p><strong>New Password:</strong> {{password}}</p>
                <p><strong>Login URL:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p>
            </div>
            
            <p><strong>What to do next:</strong></p>
            <ul>
                <li>Login with your new password immediately</li>
                <li>Change your password to something secure</li>
                <li>Contact your manager if you did not request this reset</li>
            </ul>
            
            <a href="{{loginUrl}}" class="button">Login with New Password</a>
            
            <p>Reset performed by: {{resetBy}} on {{resetDate}}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from Naga Stall Management System</p>
            <p>If you did not request this reset, please contact your manager immediately.</p>
        </div>
    </div>
</body>
</html>',
'Password Reset - Naga Stall Management System

Hello {{firstName}} {{lastName}},

Your password has been reset by your manager. Here are your new login credentials:

Username: {{username}}
New Password: {{password}}
Login URL: {{loginUrl}}

WHAT TO DO NEXT:
- Login with your new password immediately
- Change your password to something secure
- Contact your manager if you did not request this reset

Reset performed by: {{resetBy}} on {{resetDate}}

If you did not request this reset, please contact your manager immediately.

This is an automated message from Naga Stall Management System.',
'["firstName", "lastName", "username", "password", "loginUrl", "resetBy", "resetDate"]');

-- Record migration execution
INSERT IGNORE INTO migrations (migration_name, version) VALUES ('006_employee_management_system', '1.0.0');