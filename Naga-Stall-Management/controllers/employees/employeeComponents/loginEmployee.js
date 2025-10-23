const Database = require('../../../../database/database');
const bcrypt = require('bcryptjs');

/**
 * Employee login functionality
 */

class LoginEmployee {
    static async execute(req, res) {
        const db = new Database();
        
        try {
            const { username, password, ipAddress, userAgent } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username and password are required'
                });
            }

            // Get employee by username
            const employee = await db.query(
                `SELECT 
                    e.employee_id,
                    e.employee_username,
                    e.employee_password_hash,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.permissions,
                    e.status,
                    e.password_reset_required,
                    b.branch_name,
                    b.branch_id
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                WHERE e.employee_username = ?`,
                [username]
            );

            if (employee.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            const emp = employee[0];

            // Check if employee is active
            if (emp.status !== 'Active') {
                return res.status(401).json({
                    success: false,
                    message: 'Account is not active. Contact your administrator.'
                });
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, emp.employee_password_hash);
            if (!passwordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            // Generate session token
            const sessionToken = this.generateSessionToken();

            // Create session
            await db.query(
                `INSERT INTO employee_session 
                (employee_id, session_token, ip_address, user_agent, is_active) 
                VALUES (?, ?, ?, ?, true)`,
                [emp.employee_id, sessionToken, ipAddress, userAgent]
            );

            // Update last login
            await db.query(
                'UPDATE employee SET last_login = NOW() WHERE employee_id = ?',
                [emp.employee_id]
            );

            // Log login activity
            await db.query(
                `INSERT INTO employee_activity_log 
                (employee_id, action_type, action_description, ip_address, user_agent) 
                VALUES (?, 'login', 'Employee logged in', ?, ?)`,
                [emp.employee_id, ipAddress, userAgent]
            );

            // Remove password hash from response
            const { employee_password_hash, ...employeeData } = emp;

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    employee: {
                        ...employeeData,
                        permissions: employeeData.permissions ? JSON.parse(employeeData.permissions) : {},
                        full_name: `${employeeData.first_name} ${employeeData.last_name}`
                    },
                    session: {
                        token: sessionToken,
                        expires_in: '24h'
                    },
                    requires_password_change: emp.password_reset_required
                }
            });

        } catch (error) {
            console.error('Error in employee login:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: error.message
            });
        }
    }

    static generateSessionToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

module.exports = LoginEmployee;