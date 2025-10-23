const Database = require('../../../../database/database');

/**
 * Update employee information
 * Supports partial updates and permission changes
 */

class UpdateEmployee {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;
            const {
                firstName,
                lastName,
                email,
                phoneNumber,
                permissions,
                status,
                updatedBy
            } = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            // Check if employee exists
            const existingEmployee = await db.query(
                'SELECT employee_id, email, status FROM employee WHERE employee_id = ?',
                [id]
            );

            if (existingEmployee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            // Check for email conflicts (if email is being updated)
            if (email && email !== existingEmployee[0].email) {
                const emailConflict = await db.query(
                    'SELECT employee_id FROM employee WHERE email = ? AND employee_id != ?',
                    [email, id]
                );

                if (emailConflict.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Employee with this email already exists'
                    });
                }
            }

            // Build update query dynamically
            const updates = [];
            const values = [];

            if (firstName !== undefined) {
                updates.push('first_name = ?');
                values.push(firstName);
            }

            if (lastName !== undefined) {
                updates.push('last_name = ?');
                values.push(lastName);
            }

            if (email !== undefined) {
                updates.push('email = ?');
                values.push(email);
            }

            if (phoneNumber !== undefined) {
                updates.push('phone_number = ?');
                values.push(phoneNumber);
            }

            if (permissions !== undefined) {
                updates.push('permissions = ?');
                values.push(JSON.stringify(permissions));
            }

            if (status !== undefined) {
                updates.push('status = ?');
                values.push(status);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update provided'
                });
            }

            // Add updated_at
            updates.push('updated_at = NOW()');
            values.push(id);

            // Execute update
            const updateQuery = `UPDATE employee SET ${updates.join(', ')} WHERE employee_id = ?`;
            await db.query(updateQuery, values);

            // Log activity
            if (updatedBy) {
                const changedFields = [];
                if (firstName !== undefined) changedFields.push('first_name');
                if (lastName !== undefined) changedFields.push('last_name');
                if (email !== undefined) changedFields.push('email');
                if (phoneNumber !== undefined) changedFields.push('phone_number');
                if (permissions !== undefined) changedFields.push('permissions');
                if (status !== undefined) changedFields.push('status');

                await db.query(
                    `INSERT INTO employee_activity_log 
                    (employee_id, action_type, action_description, performed_by, target_resource) 
                    VALUES (?, 'update', ?, ?, 'employee')`,
                    [id, `Updated fields: ${changedFields.join(', ')}`, updatedBy]
                );
            }

            // If status changed to Inactive, terminate all sessions
            if (status === 'Inactive' || status === 'Suspended') {
                await db.query(
                    `UPDATE employee_session 
                    SET is_active = false, logout_time = NOW() 
                    WHERE employee_id = ? AND is_active = true`,
                    [id]
                );
            }

            // Get updated employee data
            const updatedEmployee = await db.query(
                `SELECT 
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
                    e.password_reset_required,
                    e.created_at,
                    e.updated_at,
                    b.branch_name
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                WHERE e.employee_id = ?`,
                [id]
            );

            const formattedEmployee = {
                ...updatedEmployee[0],
                permissions: updatedEmployee[0].permissions ? JSON.parse(updatedEmployee[0].permissions) : {},
                full_name: `${updatedEmployee[0].first_name} ${updatedEmployee[0].last_name}`
            };

            res.json({
                success: true,
                message: 'Employee updated successfully',
                data: formattedEmployee
            });

        } catch (error) {
            console.error('Error updating employee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee',
                error: error.message
            });
        }
    }
}

module.exports = UpdateEmployee;