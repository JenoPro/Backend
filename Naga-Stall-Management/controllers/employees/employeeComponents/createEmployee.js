const Database = require('../../../../database/database');
const bcrypt = require('bcryptjs');
const emailService = require('../../services/emailService');

/**
 * Create new employee with auto-generated credentials
 * Generates username (EMP + 4 digits) and secure password
 * Sends welcome email with credentials
 */

class CreateEmployee {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const {
                firstName,
                lastName,
                email,
                phoneNumber,
                branchId,
                permissions,
                createdByManager
            } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !email || !branchId || !createdByManager) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: firstName, lastName, email, branchId, createdByManager'
                });
            }

            // Check if email already exists
            const existingEmployee = await db.query(
                'SELECT employee_id FROM employee WHERE email = ?',
                [email]
            );

            if (existingEmployee.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee with this email already exists'
                });
            }

            // Generate unique username (EMP + 4 digits)
            const username = await this.generateUniqueUsername(db);
            
            // Generate secure password (8 characters)
            const generatedPassword = this.generateSecurePassword();
            
            // Hash password
            const passwordHash = await bcrypt.hash(generatedPassword, 12);

            // Create employee record
            const result = await db.query(
                `INSERT INTO employee 
                (employee_username, employee_password_hash, first_name, last_name, email, 
                 phone_number, branch_id, created_by_manager, permissions, status, password_reset_required) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', true)`,
                [username, passwordHash, firstName, lastName, email, phoneNumber, branchId, createdByManager, JSON.stringify(permissions || {})]
            );

            const employeeId = result.insertId;

            // Log credential creation
            await db.query(
                `INSERT INTO employee_credential_log 
                (employee_id, action_type, new_username, generated_by, email_sent) 
                VALUES (?, 'created', ?, ?, false)`,
                [employeeId, username, createdByManager]
            );

            // Log activity
            await db.query(
                `INSERT INTO employee_activity_log 
                (employee_id, action_type, action_description, performed_by, target_resource) 
                VALUES (?, 'create', ?, ?, 'employee')`,
                [employeeId, `Employee created with username: ${username}`, createdByManager]
            );

            // Get branch and manager info for email
            const branchInfo = await db.query(
                `SELECT b.branch_name, bm.first_name as manager_first_name, bm.last_name as manager_last_name
                FROM branch b 
                LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id 
                WHERE b.branch_id = ?`,
                [branchId]
            );

            // Send welcome email
            try {
                await emailService.sendEmployeeWelcomeEmail({
                    email,
                    firstName,
                    lastName,
                    username,
                    password: generatedPassword,
                    branchName: branchInfo[0]?.branch_name || 'Unknown Branch',
                    createdBy: `${branchInfo[0]?.manager_first_name || ''} ${branchInfo[0]?.manager_last_name || ''}`.trim()
                });

                // Update email sent status
                await db.query(
                    `UPDATE employee_credential_log 
                    SET email_sent = true, email_sent_at = NOW() 
                    WHERE employee_id = ? AND action_type = 'created'`,
                    [employeeId]
                );
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't fail the entire operation if email fails
            }

            // Get the created employee with branch info
            const createdEmployee = await db.query(
                `SELECT e.*, b.branch_name, bm.first_name as created_by_first_name, bm.last_name as created_by_last_name
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                LEFT JOIN branch_manager bm ON e.created_by_manager = bm.branch_manager_id
                WHERE e.employee_id = ?`,
                [employeeId]
            );

            res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                data: {
                    employee: createdEmployee[0],
                    credentials: {
                        username,
                        password: generatedPassword,
                        note: 'Password shown only once. Employee will be asked to change it on first login.'
                    }
                }
            });

        } catch (error) {
            console.error('Error creating employee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create employee',
                error: error.message
            });
        }
    }

    /**
     * Generate unique username in format EMP + 4 digits
     */
    static async generateUniqueUsername(db) {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
            const username = `EMP${randomDigits}`;

            // Check if username exists
            const existing = await db.query(
                'SELECT employee_id FROM employee WHERE employee_username = ?',
                [username]
            );

            if (existing.length === 0) {
                return username;
            }

            attempts++;
        }

        throw new Error('Unable to generate unique username after multiple attempts');
    }

    /**
     * Generate secure 8-character password
     */
    static generateSecurePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }
}

module.exports = CreateEmployee;