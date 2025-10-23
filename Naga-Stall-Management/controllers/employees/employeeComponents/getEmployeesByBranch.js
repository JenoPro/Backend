const Database = require('../../../../database/database');

/**
 * Get employees by branch
 */

class GetEmployeesByBranch {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { branchId } = req.params;
            const { status = 'Active' } = req.query;

            if (!branchId || isNaN(branchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid branch ID is required'
                });
            }

            const query = `
                SELECT 
                    e.employee_id,
                    e.employee_username,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.phone_number,
                    e.permissions,
                    e.status,
                    e.last_login,
                    e.created_at,
                    b.branch_name
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                WHERE e.branch_id = ? ${status ? 'AND e.status = ?' : ''}
                ORDER BY e.first_name, e.last_name
            `;

            const params = status ? [branchId, status] : [branchId];
            const employees = await db.query(query, params);

            const formattedEmployees = employees.map(employee => ({
                ...employee,
                permissions: employee.permissions ? JSON.parse(employee.permissions) : {},
                full_name: `${employee.first_name} ${employee.last_name}`
            }));

            res.json({
                success: true,
                data: formattedEmployees,
                branch_id: branchId,
                filter_status: status,
                total_employees: employees.length
            });

        } catch (error) {
            console.error('Error getting employees by branch:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employees by branch',
                error: error.message
            });
        }
    }
}

module.exports = GetEmployeesByBranch;