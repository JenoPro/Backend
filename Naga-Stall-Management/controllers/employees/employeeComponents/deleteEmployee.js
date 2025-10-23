const Database = require('../../../../database/database');

/**
 * Delete (deactivate) employee
 * Sets status to Inactive and terminates all sessions
 */

class DeleteEmployee {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            if (!deletedBy) {
                return res.status(400).json({
                    success: false,
                    message: 'deletedBy (manager ID) is required'
                });
            }

            // Check if employee exists
            const employee = await db.query(
                `SELECT employee_id, employee_username, first_name, last_name, email, status 
                FROM employee WHERE employee_id = ?`,
                [id]
            );

            if (employee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            if (employee[0].status === 'Inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'Employee is already inactive'
                });
            }

            // Set employee as inactive
            await db.query(
                `UPDATE employee 
                SET status = 'Inactive', updated_at = NOW() 
                WHERE employee_id = ?`,
                [id]
            );

            // Terminate all active sessions
            await db.query(
                `UPDATE employee_session 
                SET is_active = false, logout_time = NOW() 
                WHERE employee_id = ? AND is_active = true`,
                [id]
            );

            // Log activity
            await db.query(
                `INSERT INTO employee_activity_log 
                (employee_id, action_type, action_description, performed_by, target_resource) 
                VALUES (?, 'delete', ?, ?, 'employee')`,
                [id, `Employee deactivated by manager`, deletedBy]
            );

            res.json({
                success: true,
                message: 'Employee deactivated successfully',
                data: {
                    employee_id: id,
                    username: employee[0].employee_username,
                    full_name: `${employee[0].first_name} ${employee[0].last_name}`,
                    previous_status: employee[0].status,
                    new_status: 'Inactive',
                    deleted_by: deletedBy,
                    deleted_at: new Date().toISOString(),
                    note: 'All active sessions have been terminated'
                }
            });

        } catch (error) {
            console.error('Error deleting employee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete employee',
                error: error.message
            });
        }
    }
}

module.exports = DeleteEmployee;