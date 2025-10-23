const Database = require('../../../../database/database');

/**
 * Employee logout functionality
 */

class LogoutEmployee {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { sessionToken, employeeId } = req.body;

            if (!sessionToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Session token is required'
                });
            }

            // Deactivate session
            const result = await db.query(
                `UPDATE employee_session 
                SET is_active = false, logout_time = NOW() 
                WHERE session_token = ? AND is_active = true`,
                [sessionToken]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Active session not found'
                });
            }

            // Log logout activity if employee ID provided
            if (employeeId) {
                await db.query(
                    `INSERT INTO employee_activity_log 
                    (employee_id, action_type, action_description) 
                    VALUES (?, 'logout', 'Employee logged out')`,
                    [employeeId]
                );
            }

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Error in employee logout:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
                error: error.message
            });
        }
    }
}

module.exports = LogoutEmployee;