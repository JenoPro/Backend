/**
 * Employee Management Controller
 * Handles all employee-related operations using stored procedures
 */

import { createConnection } from '../../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random password
 */
function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Generate username from name
 */
function generateUsername(firstName, lastName) {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
    const randomSuffix = Math.floor(Math.random() * 999) + 1;
    return `${baseUsername}${randomSuffix}`;
}

/**
 * Create new employee with auto-generated credentials
 */
export const createEmployee = async (req, res) => {
    let connection;
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            branchId,
            permissions,
            createdByManager
        } = req.body;

        console.log('📥 Received employee data:', req.body);

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: firstName, lastName, email'
            });
        }

        // Default branchId to 1 if not provided (for testing)
        const finalBranchId = branchId || 1;

        connection = await createConnection();

        // Generate credentials
        const username = generateUsername(firstName, lastName);
        const plainPassword = generatePassword();
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        // Prepare permissions JSON
        const permissionsJSON = JSON.stringify(permissions || []);

        // Call stored procedure to create employee
        const [result] = await connection.execute(
            'CALL createEmployee(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                username,
                passwordHash,
                firstName,
                lastName,
                email,
                phoneNumber || null,
                finalBranchId,
                createdByManager || null,
                permissionsJSON
            ]
        );

        const employeeId = result[0]?.[0]?.employee_id;

        if (!employeeId) {
            throw new Error('Failed to create employee - no ID returned');
        }

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: {
                employeeId: employeeId,
                credentials: {
                    username: username,
                    password: plainPassword
                },
                employee: {
                    employee_id: employeeId,
                    employee_username: username,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: phoneNumber,
                    branch_id: finalBranchId,
                    permissions: permissions || [],
                    status: 'Active'
                }
            }
        });

    } catch (error) {
        console.error('Error in createEmployee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Get all employees with filtering options
 */
export const getAllEmployees = async (req, res) => {
    let connection;
    try {
        const {
            status,
            branchId,
            limit = 50,
            offset = 0
        } = req.query;

        connection = await createConnection();

        // Call stored procedure to get all employees
        const [rows] = await connection.execute(
            'CALL getAllEmployees(?, ?, ?, ?)',
            [
                status || null,
                branchId ? parseInt(branchId) : null,
                limit ? parseInt(limit) : null,
                offset ? parseInt(offset) : null
            ]
        );

        const employees = rows[0] || [];

        // Parse permissions JSON for each employee
        const formattedEmployees = employees.map(emp => ({
            ...emp,
            permissions: emp.permissions ? JSON.parse(emp.permissions) : []
        }));

        res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            data: formattedEmployees,
            count: formattedEmployees.length
        });

    } catch (error) {
        console.error('Error in getAllEmployees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employees',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        connection = await createConnection();

        // Call stored procedure to get employee by ID
        const [rows] = await connection.execute(
            'CALL getEmployeeById(?)',
            [parseInt(id)]
        );

        const employee = rows[0]?.[0];

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Parse permissions JSON
        const formattedEmployee = {
            ...employee,
            permissions: employee.permissions ? JSON.parse(employee.permissions) : []
        };

        res.status(200).json({
            success: true,
            message: 'Employee retrieved successfully',
            data: formattedEmployee
        });

    } catch (error) {
        console.error('Error in getEmployeeById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employee',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Get employees by branch
 */
export const getEmployeesByBranch = async (req, res) => {
    let connection;
    try {
        const { branchId } = req.params;
        const { status } = req.query;

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: 'Branch ID is required'
            });
        }

        connection = await createConnection();

        // Call stored procedure to get employees by branch
        const [rows] = await connection.execute(
            'CALL getEmployeesByBranch(?, ?)',
            [parseInt(branchId), status || null]
        );

        const employees = rows[0] || [];

        // Parse permissions JSON for each employee
        const formattedEmployees = employees.map(emp => ({
            ...emp,
            permissions: emp.permissions ? JSON.parse(emp.permissions) : []
        }));

        res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            data: formattedEmployees
        });

    } catch (error) {
        console.error('Error in getEmployeesByBranch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employees by branch',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Update employee
 */
export const updateEmployee = async (req, res) => {
    let connection;
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

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        connection = await createConnection();

        // Prepare permissions JSON
        const permissionsJSON = permissions ? JSON.stringify(permissions) : null;

        // Call stored procedure to update employee
        const [result] = await connection.execute(
            'CALL updateEmployee(?, ?, ?, ?, ?, ?, ?)',
            [
                parseInt(id),
                firstName || null,
                lastName || null,
                email || null,
                phoneNumber || null,
                permissionsJSON,
                status || null
            ]
        );

        const affectedRows = result[0]?.[0]?.affected_rows || 0;

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found or no changes made'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: {
                employeeId: parseInt(id),
                affectedRows
            }
        });

    } catch (error) {
        console.error('Error in updateEmployee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Delete employee (soft delete)
 */
export const deleteEmployee = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        connection = await createConnection();

        // Call stored procedure to delete employee
        const [result] = await connection.execute(
            'CALL deleteEmployee(?)',
            [parseInt(id)]
        );

        const affectedRows = result[0]?.[0]?.affected_rows || 0;

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            data: {
                employeeId: parseInt(id),
                affectedRows
            }
        });

    } catch (error) {
        console.error('Error in deleteEmployee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Reset employee password
 */
export const resetEmployeePassword = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { resetBy } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        connection = await createConnection();

        // Generate new password
        const newPassword = generatePassword();
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Call stored procedure to reset password
        const [result] = await connection.execute(
            'CALL resetEmployeePassword(?, ?, ?)',
            [parseInt(id), passwordHash, resetBy || null]
        );

        const affectedRows = result[0]?.[0]?.affected_rows || 0;

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            data: {
                employeeId: parseInt(id),
                newPassword: newPassword,
                affectedRows
            }
        });

    } catch (error) {
        console.error('Error in resetEmployeePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Employee login
 */
export const loginEmployee = async (req, res) => {
    let connection;
    try {
        const { username, password, ipAddress, userAgent } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        connection = await createConnection();

        // Get employee by username
        const [rows] = await connection.execute(
            'CALL getEmployeeByUsername(?)',
            [username]
        );

        const employee = rows[0]?.[0];

        if (!employee) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, employee.employee_password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate session token
        const sessionToken = uuidv4();

        // Call stored procedure to log in employee
        const [loginResult] = await connection.execute(
            'CALL loginEmployee(?, ?, ?, ?)',
            [username, sessionToken, ipAddress || null, userAgent || null]
        );

        const loginStatus = loginResult[0]?.[0]?.status;

        if (loginStatus !== 'success') {
            return res.status(401).json({
                success: false,
                message: 'Login failed'
            });
        }

        // Parse permissions
        const formattedEmployee = {
            ...employee,
            permissions: employee.permissions ? JSON.parse(employee.permissions) : []
        };

        delete formattedEmployee.employee_password_hash; // Don't send password hash

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: sessionToken,
                employee: formattedEmployee
            }
        });

    } catch (error) {
        console.error('Error in loginEmployee:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

/**
 * Employee logout
 */
export const logoutEmployee = async (req, res) => {
    let connection;
    try {
        const { sessionToken } = req.body;

        if (!sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Session token is required'
            });
        }

        connection = await createConnection();

        // Call stored procedure to log out employee
        const [result] = await connection.execute(
            'CALL logoutEmployee(?)',
            [sessionToken]
        );

        const affectedRows = result[0]?.[0]?.affected_rows || 0;

        res.status(200).json({
            success: true,
            message: 'Logout successful',
            data: {
                affectedRows
            }
        });

    } catch (error) {
        console.error('Error in logoutEmployee:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};