const Database = require('../../../../database/database');

/**
 * Get employee by ID with detailed information
 */

class GetEmployeeById {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            // Get employee with branch and creator info
            const employeeQuery = `
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
                    b.location as branch_location,
                    b.address as branch_address,
                    bm.first_name as created_by_first_name,
                    bm.last_name as created_by_last_name,
                    bm.email as created_by_email
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                LEFT JOIN branch_manager bm ON e.created_by_manager = bm.branch_manager_id
                WHERE e.employee_id = ?
            `;

            const employeeResult = await db.query(employeeQuery, [id]);

            if (employeeResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            const employee = employeeResult[0];

            // Get active sessions
            const sessionsQuery = `
                SELECT 
                    session_id,
                    session_token,
                    ip_address,
                    user_agent,
                    login_time,
                    last_activity,
                    is_active
                FROM employee_session 
                WHERE employee_id = ? AND is_active = true
                ORDER BY last_activity DESC
            `;

            const activeSessions = await db.query(sessionsQuery, [id]);

            // Get recent activity (last 20 activities)
            const activityQuery = `
                SELECT 
                    log_id,
                    action_type,
                    action_description,
                    ip_address,
                    created_at,
                    bm.first_name as performed_by_first_name,
                    bm.last_name as performed_by_last_name
                FROM employee_activity_log eal
                LEFT JOIN branch_manager bm ON eal.performed_by = bm.branch_manager_id
                WHERE eal.employee_id = ?
                ORDER BY eal.created_at DESC
                LIMIT 20
            `;

            const recentActivity = await db.query(activityQuery, [id]);

            // Get credential log
            const credentialLogQuery = `
                SELECT 
                    log_id,
                    action_type,
                    old_username,
                    new_username,
                    email_sent,
                    email_sent_at,
                    created_at,
                    bm.first_name as generated_by_first_name,
                    bm.last_name as generated_by_last_name
                FROM employee_credential_log ecl
                LEFT JOIN branch_manager bm ON ecl.generated_by = bm.branch_manager_id
                WHERE ecl.employee_id = ?
                ORDER BY ecl.created_at DESC
            `;

            const credentialLog = await db.query(credentialLogQuery, [id]);

            // Format the response
            const formattedEmployee = {
                ...employee,
                permissions: employee.permissions ? JSON.parse(employee.permissions) : {},
                created_by: employee.created_by_first_name && employee.created_by_last_name ? 
                    `${employee.created_by_first_name} ${employee.created_by_last_name}` : null,
                full_name: `${employee.first_name} ${employee.last_name}`,
                branch_info: {
                    branch_id: employee.branch_id,
                    branch_name: employee.branch_name,
                    branch_area: employee.branch_area,
                    branch_location: employee.branch_location,
                    branch_address: employee.branch_address
                },
                creator_info: {
                    name: employee.created_by_first_name && employee.created_by_last_name ? 
                        `${employee.created_by_first_name} ${employee.created_by_last_name}` : null,
                    email: employee.created_by_email
                }
            };

            // Format activity log
            const formattedActivity = recentActivity.map(activity => ({
                ...activity,
                performed_by: activity.performed_by_first_name && activity.performed_by_last_name ?
                    `${activity.performed_by_first_name} ${activity.performed_by_last_name}` : 'System'
            }));

            // Format credential log
            const formattedCredentialLog = credentialLog.map(log => ({
                ...log,
                generated_by: log.generated_by_first_name && log.generated_by_last_name ?
                    `${log.generated_by_first_name} ${log.generated_by_last_name}` : 'System'
            }));

            res.json({
                success: true,
                data: {
                    employee: formattedEmployee,
                    active_sessions: activeSessions,
                    recent_activity: formattedActivity,
                    credential_history: formattedCredentialLog,
                    statistics: {
                        total_logins: recentActivity.filter(a => a.action_type === 'login').length,
                        active_sessions_count: activeSessions.length,
                        days_since_creation: Math.floor((new Date() - new Date(employee.created_at)) / (1000 * 60 * 60 * 24)),
                        last_login_days_ago: employee.last_login ? 
                            Math.floor((new Date() - new Date(employee.last_login)) / (1000 * 60 * 60 * 24)) : null
                    }
                }
            });

        } catch (error) {
            console.error('Error getting employee by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employee',
                error: error.message
            });
        }
    }
}

module.exports = GetEmployeeById;