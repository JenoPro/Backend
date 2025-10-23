const Database = require('../../../../database/database');

/**
 * Search employees with advanced filtering
 */

class SearchEmployees {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { q, status, branchId, permissions } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters long'
                });
            }

            let whereConditions = [`(
                e.first_name LIKE ? OR 
                e.last_name LIKE ? OR 
                e.email LIKE ? OR 
                e.employee_username LIKE ? OR
                CONCAT(e.first_name, ' ', e.last_name) LIKE ?
            )`];

            const searchTerm = `%${q.trim()}%`;
            let params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

            if (status) {
                whereConditions.push('e.status = ?');
                params.push(status);
            }

            if (branchId) {
                whereConditions.push('e.branch_id = ?');
                params.push(branchId);
            }

            if (permissions) {
                whereConditions.push('JSON_EXTRACT(e.permissions, ?) IS NOT NULL');
                params.push(`$.${permissions}`);
            }

            const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

            const query = `
                SELECT 
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
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                ${whereClause}
                ORDER BY e.first_name, e.last_name
                LIMIT 20
            `;

            const employees = await db.query(query, params);

            const formattedEmployees = employees.map(employee => ({
                ...employee,
                permissions: employee.permissions ? JSON.parse(employee.permissions) : {},
                full_name: `${employee.first_name} ${employee.last_name}`
            }));

            res.json({
                success: true,
                data: formattedEmployees,
                search_query: q,
                filters: { status, branchId, permissions },
                total_results: employees.length
            });

        } catch (error) {
            console.error('Error searching employees:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search employees',
                error: error.message
            });
        }
    }
}

module.exports = SearchEmployees;