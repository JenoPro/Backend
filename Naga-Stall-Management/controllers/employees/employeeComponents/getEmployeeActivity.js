const Database = require('../../../../database/database');

/**
 * Get employee activity log
 */

class GetEmployeeActivity {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { id } = req.params;
            const { limit = 50, page = 1, actionType } = req.query;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid employee ID is required'
                });
            }

            let whereClause = 'WHERE eal.employee_id = ?';
            let params = [id];

            if (actionType) {
                whereClause += ' AND eal.action_type = ?';
                params.push(actionType);
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const query = `
                SELECT 
                    eal.log_id,
                    eal.action_type,
                    eal.action_description,
                    eal.target_resource,
                    eal.ip_address,
                    eal.user_agent,
                    eal.created_at,
                    bm.first_name as performed_by_first_name,
                    bm.last_name as performed_by_last_name
                FROM employee_activity_log eal
                LEFT JOIN branch_manager bm ON eal.performed_by = bm.branch_manager_id
                ${whereClause}
                ORDER BY eal.created_at DESC
                LIMIT ? OFFSET ?
            `;

            params.push(parseInt(limit), offset);
            const activities = await db.query(query, params);

            const formattedActivities = activities.map(activity => ({
                ...activity,
                performed_by: activity.performed_by_first_name && activity.performed_by_last_name ?
                    `${activity.performed_by_first_name} ${activity.performed_by_last_name}` : 'System'
            }));

            res.json({
                success: true,
                data: formattedActivities,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_activities: activities.length
                }
            });

        } catch (error) {
            console.error('Error getting employee activity:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employee activity',
                error: error.message
            });
        }
    }
}

module.exports = GetEmployeeActivity;