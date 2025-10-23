const Database = require('../../../../database/database');

/**
 * Update employee permissions
 */

class UpdateEmployeePermissions {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;
            const { permissions, updatedBy } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            if (!permissions || typeof permissions !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Valid permissions object is required'
                });
            }

            // Update permissions
            await db.query(
                'UPDATE employee SET permissions = ?, updated_at = NOW() WHERE employee_id = ?',
                [JSON.stringify(permissions), id]
            );

            // Log activity
            if (updatedBy) {
                await db.query(
                    `INSERT INTO employee_activity_log 
                    (employee_id, action_type, action_description, performed_by, target_resource) 
                    VALUES (?, 'update_permissions', 'Employee permissions updated', ?, 'employee_permissions')`,
                    [id, updatedBy]
                );
            }

            res.json({
                success: true,
                message: 'Employee permissions updated successfully',
                data: {
                    employee_id: id,
                    permissions
                }
            });

        } catch (error) {
            console.error('Error updating employee permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee permissions',
                error: error.message
            });
        }
    }
}

module.exports = UpdateEmployeePermissions;