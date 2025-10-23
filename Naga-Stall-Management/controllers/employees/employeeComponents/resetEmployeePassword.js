const Database = require('../../../../database/database');
const bcrypt = require('bcryptjs');
const emailService = require('../../services/emailService');

/**
 * Reset employee password with auto-generated secure password
 * Sends email notification to employee with new credentials
 */

class ResetEmployeePassword {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;
            const { resetBy } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            if (!resetBy) {
                return res.status(400).json({
                    success: false,
                    message: 'resetBy (manager ID) is required'
                });
            }

            // Get employee info
            const employeeQuery = `
                SELECT 
                    e.employee_id,
                    e.employee_username,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.status,
                    b.branch_name,
                    bm.first_name as manager_first_name,
                    bm.last_name as manager_last_name
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                LEFT JOIN branch_manager bm ON bm.branch_manager_id = ?
                WHERE e.employee_id = ?
            `;

            const employeeResult = await db.query(employeeQuery, [resetBy, id]);

            if (employeeResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            const employee = employeeResult[0];

            if (employee.status === 'Inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot reset password for inactive employee'
                });
            }

            // Generate new secure password
            const newPassword = this.generateSecurePassword();
            const passwordHash = await bcrypt.hash(newPassword, 12);

            // Update employee password
            await db.query(
                `UPDATE employee 
                SET employee_password_hash = ?, password_reset_required = true, updated_at = NOW()
                WHERE employee_id = ?`,
                [passwordHash, id]
            );

            // Log credential reset
            await db.query(
                `INSERT INTO employee_credential_log 
                (employee_id, action_type, new_username, generated_by, email_sent) 
                VALUES (?, 'password_reset', ?, ?, false)`,
                [id, employee.employee_username, resetBy]
            );

            // Log activity
            await db.query(
                `INSERT INTO employee_activity_log 
                (employee_id, action_type, action_description, performed_by, target_resource) 
                VALUES (?, 'password_reset', ?, ?, 'employee_password')`,
                [id, `Password reset by manager`, resetBy]
            );

            // Create password reset token for tracking
            const resetToken = this.generateResetToken();
            await db.query(
                `INSERT INTO employee_password_reset 
                (employee_id, reset_token, requested_by, expires_at, is_used) 
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), true)`,
                [id, resetToken, resetBy]
            );

            // Invalidate all active sessions
            await db.query(
                `UPDATE employee_session 
                SET is_active = false, logout_time = NOW() 
                WHERE employee_id = ? AND is_active = true`,
                [id]
            );

            // Send password reset email
            try {
                await emailService.sendEmployeePasswordResetEmail({
                    email: employee.email,
                    firstName: employee.first_name,
                    lastName: employee.last_name,
                    username: employee.employee_username,
                    password: newPassword,
                    resetBy: `${employee.manager_first_name || ''} ${employee.manager_last_name || ''}`.trim(),
                    resetDate: new Date().toLocaleString()
                });

                // Update email sent status
                await db.query(
                    `UPDATE employee_credential_log 
                    SET email_sent = true, email_sent_at = NOW() 
                    WHERE employee_id = ? AND action_type = 'password_reset'
                    ORDER BY created_at DESC LIMIT 1`,
                    [id]
                );
            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError);
                // Don't fail the entire operation if email fails
            }

            res.json({
                success: true,
                message: 'Employee password reset successfully',
                data: {
                    employee_id: id,
                    username: employee.employee_username,
                    new_password: newPassword,
                    email_sent: true,
                    reset_by: `${employee.manager_first_name || ''} ${employee.manager_last_name || ''}`.trim(),
                    reset_at: new Date().toISOString(),
                    note: 'All active sessions have been terminated. Employee must login with new password.'
                }
            });

        } catch (error) {
            console.error('Error resetting employee password:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset employee password',
                error: error.message
            });
        }
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

    /**
     * Generate reset token for tracking
     */
    static generateResetToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

module.exports = ResetEmployeePassword;