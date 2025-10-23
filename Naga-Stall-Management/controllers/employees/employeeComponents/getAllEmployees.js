const Database = require('../../../../database/database');

/**
 * Get all employees with filtering and search capabilities
 * Supports filtering by status, branch, and search terms
 */

class GetAllEmployees {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const {
                status,
                branchId,
                search,
                page = 1,
                limit = 50,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = req.query;

            // Build WHERE clause
            let whereConditions = [];
            let queryParams = [];

            if (status) {
                whereConditions.push('e.status = ?');
                queryParams.push(status);
            }

            if (branchId) {
                whereConditions.push('e.branch_id = ?');
                queryParams.push(branchId);
            }

            if (search) {
                whereConditions.push(`(
                    e.first_name LIKE ? OR 
                    e.last_name LIKE ? OR 
                    e.email LIKE ? OR 
                    e.employee_username LIKE ? OR
                    CONCAT(e.first_name, ' ', e.last_name) LIKE ?
                )`);
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            // Validate sort fields
            const validSortFields = [
                'first_name', 'last_name', 'email', 'employee_username', 
                'status', 'created_at', 'last_login', 'branch_name'
            ];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Calculate offset
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                ${whereClause}
            `;
            
            const countResult = await db.query(countQuery, queryParams);
            const totalEmployees = countResult[0].total;

            // Get employees with pagination
            const employeesQuery = `
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
                    e.password_reset_required,
                    e.created_at,
                    e.updated_at,
                    b.branch_name,
                    b.area as branch_area,
                    bm.first_name as created_by_first_name,
                    bm.last_name as created_by_last_name,
                    (SELECT COUNT(*) FROM employee_session es 
                     WHERE es.employee_id = e.employee_id AND es.is_active = true) as active_sessions
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                LEFT JOIN branch_manager bm ON e.created_by_manager = bm.branch_manager_id
                ${whereClause}
                ORDER BY ${sortField === 'branch_name' ? 'b.branch_name' : 'e.' + sortField} ${order}
                LIMIT ? OFFSET ?
            `;

            queryParams.push(parseInt(limit), offset);
            const employees = await db.query(employeesQuery, queryParams);

            // Parse permissions JSON for each employee
            const formattedEmployees = employees.map(employee => ({
                ...employee,
                permissions: employee.permissions ? JSON.parse(employee.permissions) : {},
                created_by: employee.created_by_first_name && employee.created_by_last_name ? 
                    `${employee.created_by_first_name} ${employee.created_by_last_name}` : null,
                full_name: `${employee.first_name} ${employee.last_name}`,
                active_sessions: parseInt(employee.active_sessions) || 0
            }));

            // Calculate pagination info
            const totalPages = Math.ceil(totalEmployees / parseInt(limit));
            const hasNextPage = parseInt(page) < totalPages;
            const hasPrevPage = parseInt(page) > 1;

            // Get summary statistics
            const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive,
                    COUNT(CASE WHEN status = 'Suspended' THEN 1 END) as suspended,
                    COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recently_active,
                    COUNT(CASE WHEN password_reset_required = true THEN 1 END) as password_reset_required
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                ${whereClause}
            `;

            const stats = await db.query(statsQuery, queryParams.slice(0, queryParams.length - 2));

            res.json({
                success: true,
                data: formattedEmployees,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_employees: totalEmployees,
                    per_page: parseInt(limit),
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage
                },
                statistics: stats[0],
                filters: {
                    status,
                    branchId,
                    search,
                    sortBy: sortField,
                    sortOrder: order
                }
            });

        } catch (error) {
            console.error('Error getting all employees:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employees',
                error: error.message
            });
        }
    }
}

module.exports = GetAllEmployees;