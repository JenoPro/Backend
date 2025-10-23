-- ========================================
-- MIGRATION: 005_stored_procedures.sql
-- Description: Create all stored procedures for the system
-- Version: 1.0.0
-- Created: 2025-10-22
-- ========================================

USE `naga_stall`;

DELIMITER $$

-- ========================================
-- ADMIN STORED PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `createAdmin`$$
CREATE PROCEDURE `createAdmin`(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_contact_number VARCHAR(20),
    IN p_email VARCHAR(100)
)
BEGIN
    INSERT INTO admin (admin_username, admin_password_hash, first_name, last_name, contact_number, email)
    VALUES (p_username, p_password_hash, p_first_name, p_last_name, p_contact_number, p_email);
    
    SELECT LAST_INSERT_ID() as admin_id;
END$$

DROP PROCEDURE IF EXISTS `getAdminById`$$
CREATE PROCEDURE `getAdminById`(IN p_admin_id INT)
BEGIN
    SELECT * FROM admin WHERE admin_id = p_admin_id;
END$$

DROP PROCEDURE IF EXISTS `getAdminByUsername`$$
CREATE PROCEDURE `getAdminByUsername`(IN p_username VARCHAR(50))
BEGIN
    SELECT * FROM admin WHERE admin_username = p_username;
END$$

-- ========================================
-- APPLICANT STORED PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `createApplicant`$$
CREATE PROCEDURE `createApplicant`(
    IN p_full_name VARCHAR(255),
    IN p_contact_number VARCHAR(20),
    IN p_address TEXT,
    IN p_birthdate DATE,
    IN p_civil_status ENUM('Single','Married','Divorced','Widowed'),
    IN p_educational_attainment VARCHAR(100)
)
BEGIN
    INSERT INTO applicant (applicant_full_name, applicant_contact_number, applicant_address, applicant_birthdate, applicant_civil_status, applicant_educational_attainment)
    VALUES (p_full_name, p_contact_number, p_address, p_birthdate, p_civil_status, p_educational_attainment);
    
    SELECT LAST_INSERT_ID() as applicant_id;
END$$

DROP PROCEDURE IF EXISTS `getAllApplicants`$$
CREATE PROCEDURE `getAllApplicants`()
BEGIN
    SELECT * FROM applicant ORDER BY created_at DESC;
END$$

DROP PROCEDURE IF EXISTS `getApplicantById`$$
CREATE PROCEDURE `getApplicantById`(IN p_applicant_id INT)
BEGIN
    SELECT * FROM applicant WHERE applicant_id = p_applicant_id;
END$$

-- ========================================
-- STALL STORED PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `getAvailableStalls`$$
CREATE PROCEDURE `getAvailableStalls`()
BEGIN
    SELECT 
        s.*,
        sec.section_name,
        f.floor_name,
        b.branch_name,
        b.area
    FROM stall s
    JOIN section sec ON s.section_id = sec.section_id
    JOIN floor f ON s.floor_id = f.floor_id
    JOIN branch b ON f.branch_id = b.branch_id
    WHERE s.is_available = 1 AND s.status = 'Active'
    ORDER BY b.branch_name, f.floor_name, sec.section_name;
END$$

DROP PROCEDURE IF EXISTS `getStallById`$$
CREATE PROCEDURE `getStallById`(IN p_stall_id INT)
BEGIN
    SELECT 
        s.*,
        sec.section_name,
        f.floor_name,
        b.branch_name,
        b.area,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
    FROM stall s
    JOIN section sec ON s.section_id = sec.section_id
    JOIN floor f ON s.floor_id = f.floor_id
    JOIN branch b ON f.branch_id = b.branch_id
    LEFT JOIN branch_manager bm ON s.created_by_manager = bm.branch_manager_id
    WHERE s.stall_id = p_stall_id;
END$$

-- ========================================
-- INSPECTOR MANAGEMENT PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `addInspector`$$
CREATE PROCEDURE `addInspector` (
    IN `p_first_name` VARCHAR(100), 
    IN `p_last_name` VARCHAR(100), 
    IN `p_email` VARCHAR(255), 
    IN `p_contact_no` VARCHAR(20), 
    IN `p_password_plain` VARCHAR(255), 
    IN `p_branch_id` INT, 
    IN `p_date_hired` DATE, 
    IN `p_branch_manager_id` INT
)
BEGIN
    DECLARE new_inspector_id INT;

    INSERT INTO inspector (first_name, last_name, email, contact_no, password, date_hired, status)
    VALUES (p_first_name, p_last_name, p_email, p_contact_no, SHA2(p_password_plain, 256), IFNULL(p_date_hired, CURRENT_DATE), 'active');

    SET new_inspector_id = LAST_INSERT_ID();

    INSERT INTO inspector_assignment (inspector_id, branch_id, start_date, status, remarks)
    VALUES (new_inspector_id, p_branch_id, CURRENT_DATE, 'Active', 'Newly hired inspector');

    INSERT INTO inspector_action_log (inspector_id, branch_id, branch_manager_id, action_type, action_date, remarks)
    VALUES (new_inspector_id, p_branch_id, p_branch_manager_id, 'New Hire', NOW(),
            CONCAT('Inspector ', p_first_name, ' ', p_last_name, ' was hired and assigned to branch ID ', p_branch_id));

    SELECT CONCAT('✅ Inspector ', p_first_name, ' ', p_last_name, ' successfully added and logged as New Hire under branch ID ', p_branch_id) AS message;
END$$

DROP PROCEDURE IF EXISTS `terminateInspector`$$
CREATE PROCEDURE `terminateInspector` (
    IN `p_inspector_id` INT, 
    IN `p_reason` VARCHAR(255), 
    IN `p_branch_manager_id` INT
)
BEGIN
    DECLARE v_branch_id INT DEFAULT NULL;

    SELECT branch_id INTO v_branch_id FROM inspector_assignment
    WHERE inspector_id = p_inspector_id AND status = 'Active' LIMIT 1;

    UPDATE inspector SET status = 'inactive', termination_date = CURRENT_DATE, termination_reason = p_reason
    WHERE inspector_id = p_inspector_id;

    UPDATE inspector_assignment SET status = 'Inactive', end_date = CURRENT_DATE, remarks = CONCAT('Terminated: ', p_reason)
    WHERE inspector_id = p_inspector_id AND status = 'Active';

    INSERT INTO inspector_action_log (inspector_id, branch_id, branch_manager_id, action_type, action_date, remarks)
    VALUES (p_inspector_id, v_branch_id, p_branch_manager_id, 'Termination', NOW(),
            CONCAT('Inspector ID ', p_inspector_id, ' terminated. Reason: ', p_reason));

    SELECT CONCAT('Inspector ID ', p_inspector_id, ' has been terminated for reason: ', p_reason) AS message;
END$$

-- ========================================
-- VIOLATION PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `reportStallholder`$$
CREATE PROCEDURE `reportStallholder` (
    IN `p_inspector_id` INT, IN `p_stallholder_id` INT, IN `p_violation_id` INT, 
    IN `p_branch_id` INT, IN `p_stall_id` INT, IN `p_evidence` TEXT, IN `p_remarks` TEXT
)
BEGIN
    DECLARE v_offense_no INT;
    DECLARE v_penalty_amount DECIMAL(10,2);
    DECLARE v_penalty_remarks VARCHAR(255);
    DECLARE v_penalty_id INT DEFAULT NULL;

    IF NOT EXISTS (SELECT 1 FROM violation WHERE violation_id = p_violation_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Invalid violation_id provided';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM stallholder WHERE stallholder_id = p_stallholder_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Invalid stallholder_id provided';
    END IF;

    SELECT COUNT(*) + 1 INTO v_offense_no FROM violation_report
    WHERE stallholder_id = p_stallholder_id AND violation_id = p_violation_id;

    SELECT vp.penalty_id, vp.penalty_amount, vp.remarks INTO v_penalty_id, v_penalty_amount, v_penalty_remarks
    FROM violation_penalty vp
    WHERE vp.violation_id = p_violation_id
      AND vp.offense_no = (SELECT MAX(offense_no) FROM violation_penalty
                           WHERE violation_id = p_violation_id AND offense_no <= v_offense_no);

    IF v_penalty_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: No penalty defined for this violation type';
    END IF;

    INSERT INTO violation_report (inspector_id, stallholder_id, violator_name, violation_id, branch_id, stall_id, 
                                  evidence, date_reported, offense_no, penalty_id, remarks)
    VALUES (p_inspector_id, p_stallholder_id, NULL, p_violation_id, p_branch_id, p_stall_id, p_evidence, NOW(),
            v_offense_no, v_penalty_id,
            CONCAT_WS(' | ', p_remarks, CONCAT('Offense #', v_offense_no), 
                      CONCAT('Fine: ₱', IFNULL(v_penalty_amount, '0.00')), IFNULL(v_penalty_remarks, '')));

    UPDATE stallholder SET compliance_status = 'Non-Compliant', last_violation_date = NOW()
    WHERE stallholder_id = p_stallholder_id;
END$$

-- ========================================
-- EMPLOYEE MANAGEMENT PROCEDURES
-- ========================================

DROP PROCEDURE IF EXISTS `createEmployee`$$
CREATE PROCEDURE `createEmployee`(
    IN p_username VARCHAR(20),
    IN p_password_hash VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_phone_number VARCHAR(20),
    IN p_branch_id INT,
    IN p_created_by_manager INT,
    IN p_permissions JSON
)
BEGIN
    INSERT INTO employee (employee_username, employee_password_hash, first_name, last_name, email, 
                         phone_number, branch_id, created_by_manager, permissions, status, password_reset_required)
    VALUES (p_username, p_password_hash, p_first_name, p_last_name, p_email, 
            p_phone_number, p_branch_id, p_created_by_manager, p_permissions, 'Active', true);
    
    SELECT LAST_INSERT_ID() as employee_id;
END$$

DROP PROCEDURE IF EXISTS `getEmployeeById`$$
CREATE PROCEDURE `getEmployeeById`(IN p_employee_id INT)
BEGIN
    SELECT 
        e.*,
        b.branch_name,
        bm.first_name as created_by_first_name,
        bm.last_name as created_by_last_name
    FROM employee e
    LEFT JOIN branch b ON e.branch_id = b.branch_id
    LEFT JOIN branch_manager bm ON e.created_by_manager = bm.branch_manager_id
    WHERE e.employee_id = p_employee_id;
END$$

DROP PROCEDURE IF EXISTS `getEmployeeByUsername`$$
CREATE PROCEDURE `getEmployeeByUsername`(IN p_username VARCHAR(20))
BEGIN
    SELECT 
        e.*,
        b.branch_name
    FROM employee e
    LEFT JOIN branch b ON e.branch_id = b.branch_id
    WHERE e.employee_username = p_username;
END$$

DROP PROCEDURE IF EXISTS `getAllEmployees`$$
CREATE PROCEDURE `getAllEmployees`(
    IN p_status VARCHAR(20),
    IN p_branch_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET @sql = 'SELECT 
        e.employee_id,
        e.employee_username,
        e.first_name,
        e.last_name,
        e.email,
        e.phone_number,
        e.branch_id,
        e.permissions,
        e.status,
        e.last_login,
        e.created_at,
        b.branch_name
    FROM employee e
    LEFT JOIN branch b ON e.branch_id = b.branch_id';
    
    SET @where_conditions = '';
    
    IF p_status IS NOT NULL THEN
        SET @where_conditions = CONCAT(@where_conditions, ' AND e.status = "', p_status, '"');
    END IF;
    
    IF p_branch_id IS NOT NULL THEN
        SET @where_conditions = CONCAT(@where_conditions, ' AND e.branch_id = ', p_branch_id);
    END IF;
    
    IF LENGTH(@where_conditions) > 0 THEN
        SET @sql = CONCAT(@sql, ' WHERE ', SUBSTRING(@where_conditions, 6));
    END IF;
    
    SET @sql = CONCAT(@sql, ' ORDER BY e.created_at DESC');
    
    IF p_limit IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' LIMIT ', p_limit);
        IF p_offset IS NOT NULL THEN
            SET @sql = CONCAT(@sql, ' OFFSET ', p_offset);
        END IF;
    END IF;
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DROP PROCEDURE IF EXISTS `updateEmployee`$$
CREATE PROCEDURE `updateEmployee`(
    IN p_employee_id INT,
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_phone_number VARCHAR(20),
    IN p_permissions JSON,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE employee 
    SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        email = COALESCE(p_email, email),
        phone_number = COALESCE(p_phone_number, phone_number),
        permissions = COALESCE(p_permissions, permissions),
        status = COALESCE(p_status, status),
        updated_at = NOW()
    WHERE employee_id = p_employee_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

DROP PROCEDURE IF EXISTS `deleteEmployee`$$
CREATE PROCEDURE `deleteEmployee`(IN p_employee_id INT)
BEGIN
    UPDATE employee 
    SET status = 'Inactive', updated_at = NOW()
    WHERE employee_id = p_employee_id;
    
    -- Terminate all active sessions
    UPDATE employee_session 
    SET is_active = false, logout_time = NOW()
    WHERE employee_id = p_employee_id AND is_active = true;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

DROP PROCEDURE IF EXISTS `resetEmployeePassword`$$
CREATE PROCEDURE `resetEmployeePassword`(
    IN p_employee_id INT,
    IN p_new_password_hash VARCHAR(255),
    IN p_reset_by INT
)
BEGIN
    UPDATE employee 
    SET 
        employee_password_hash = p_new_password_hash,
        password_reset_required = true,
        updated_at = NOW()
    WHERE employee_id = p_employee_id;
    
    -- Terminate all active sessions
    UPDATE employee_session 
    SET is_active = false, logout_time = NOW()
    WHERE employee_id = p_employee_id AND is_active = true;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

DROP PROCEDURE IF EXISTS `loginEmployee`$$
CREATE PROCEDURE `loginEmployee`(
    IN p_username VARCHAR(20),
    IN p_session_token VARCHAR(255),
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    DECLARE v_employee_id INT DEFAULT NULL;
    
    -- Get employee ID
    SELECT employee_id INTO v_employee_id 
    FROM employee 
    WHERE employee_username = p_username AND status = 'Active';
    
    IF v_employee_id IS NOT NULL THEN
        -- Create session
        INSERT INTO employee_session (employee_id, session_token, ip_address, user_agent, is_active)
        VALUES (v_employee_id, p_session_token, p_ip_address, p_user_agent, true);
        
        -- Update last login
        UPDATE employee SET last_login = NOW() WHERE employee_id = v_employee_id;
        
        SELECT v_employee_id as employee_id, 'success' as status;
    ELSE
        SELECT NULL as employee_id, 'failed' as status;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `logoutEmployee`$$
CREATE PROCEDURE `logoutEmployee`(IN p_session_token VARCHAR(255))
BEGIN
    UPDATE employee_session 
    SET is_active = false, logout_time = NOW()
    WHERE session_token = p_session_token AND is_active = true;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

DROP PROCEDURE IF EXISTS `getEmployeesByBranch`$$
CREATE PROCEDURE `getEmployeesByBranch`(
    IN p_branch_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    IF p_status IS NOT NULL THEN
        SELECT 
            e.employee_id,
            e.employee_username,
            e.first_name,
            e.last_name,
            e.email,
            e.permissions,
            e.status,
            e.last_login,
            e.created_at
        FROM employee e
        WHERE e.branch_id = p_branch_id AND e.status = p_status
        ORDER BY e.first_name, e.last_name;
    ELSE
        SELECT 
            e.employee_id,
            e.employee_username,
            e.first_name,
            e.last_name,
            e.email,
            e.permissions,
            e.status,
            e.last_login,
            e.created_at
        FROM employee e
        WHERE e.branch_id = p_branch_id
        ORDER BY e.first_name, e.last_name;
    END IF;
END$$

DELIMITER ;

-- Record migration execution
INSERT IGNORE INTO migrations (migration_name, version) VALUES ('005_stored_procedures', '1.0.0');