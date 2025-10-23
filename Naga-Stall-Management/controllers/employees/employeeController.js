// Import employee components
import createEmployeeComponent from './employeeComponents/createEmployee.js';
import getAllEmployeesComponent from './employeeComponents/getAllEmployees.js';
import getEmployeeByIdComponent from './employeeComponents/getEmployeeById.js';
import getEmployeesByBranchComponent from './employeeComponents/getEmployeesByBranch.js';
import updateEmployeeComponent from './employeeComponents/updateEmployee.js';
import deleteEmployeeComponent from './employeeComponents/deleteEmployee.js';
import resetEmployeePasswordComponent from './employeeComponents/resetEmployeePassword.js';
import loginEmployeeComponent from './employeeComponents/loginEmployee.js';
import logoutEmployeeComponent from './employeeComponents/logoutEmployee.js';

/**
 * Employee Management Controller
 * Handles all employee-related operations including:
 * - Employee CRUD operations
 * - Auto-generated credentials
 * - Permission management
 * - Activity tracking
 * - Email notifications
 */

class EmployeeController {
    /**
     * Create new employee with auto-generated credentials
     * POST /api/employees
     */
    static async createEmployee(req, res) {
        try {
            await createEmployee.execute(req, res);
        } catch (error) {
            console.error('Error in createEmployee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create employee',
                error: error.message
            });
        }
    }

    /**
     * Get all employees with filtering options
     * GET /api/employees?status=active&branchId=1&search=john
     */
    static async getAllEmployees(req, res) {
        try {
            await getAllEmployees.execute(req, res);
        } catch (error) {
            console.error('Error in getAllEmployees:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employees',
                error: error.message
            });
        }
    }

    /**
     * Get employee by ID
     * GET /api/employees/:id
     */
    static async getEmployeeById(req, res) {
        try {
            await getEmployeeById.execute(req, res);
        } catch (error) {
            console.error('Error in getEmployeeById:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employee',
                error: error.message
            });
        }
    }

    /**
     * Get employees by branch
     * GET /api/employees/branch/:branchId
     */
    static async getEmployeesByBranch(req, res) {
        try {
            await getEmployeesByBranch.execute(req, res);
        } catch (error) {
            console.error('Error in getEmployeesByBranch:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employees by branch',
                error: error.message
            });
        }
    }

    /**
     * Update employee information
     * PUT /api/employees/:id
     */
    static async updateEmployee(req, res) {
        try {
            await updateEmployee.execute(req, res);
        } catch (error) {
            console.error('Error in updateEmployee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee',
                error: error.message
            });
        }
    }

    /**
     * Delete (deactivate) employee
     * DELETE /api/employees/:id
     */
    static async deleteEmployee(req, res) {
        try {
            await deleteEmployee.execute(req, res);
        } catch (error) {
            console.error('Error in deleteEmployee:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete employee',
                error: error.message
            });
        }
    }

    /**
     * Reset employee password
     * POST /api/employees/:id/reset-password
     */
    static async resetEmployeePassword(req, res) {
        try {
            await resetEmployeePassword.execute(req, res);
        } catch (error) {
            console.error('Error in resetEmployeePassword:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset employee password',
                error: error.message
            });
        }
    }

    /**
     * Employee login
     * POST /api/employees/login
     */
    static async loginEmployee(req, res) {
        try {
            await loginEmployee.execute(req, res);
        } catch (error) {
            console.error('Error in loginEmployee:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: error.message
            });
        }
    }

    /**
     * Employee logout
     * POST /api/employees/logout
     */
    static async logoutEmployee(req, res) {
        try {
            await logoutEmployee.execute(req, res);
        } catch (error) {
            console.error('Error in logoutEmployee:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
                error: error.message
            });
        }
    }

    /**
     * Update employee permissions
     * PUT /api/employees/:id/permissions
     */
    static async updateEmployeePermissions(req, res) {
        try {
            await updateEmployeePermissions.execute(req, res);
        } catch (error) {
            console.error('Error in updateEmployeePermissions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee permissions',
                error: error.message
            });
        }
    }

    /**
     * Get employee activity log
     * GET /api/employees/:id/activity
     */
    static async getEmployeeActivity(req, res) {
        try {
            await getEmployeeActivity.execute(req, res);
        } catch (error) {
            console.error('Error in getEmployeeActivity:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get employee activity',
                error: error.message
            });
        }
    }

    /**
     * Search employees
     * GET /api/employees/search?q=searchterm
     */
    static async searchEmployees(req, res) {
        try {
            await searchEmployees.execute(req, res);
        } catch (error) {
            console.error('Error in searchEmployees:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search employees',
                error: error.message
            });
        }
    }
}

module.exports = EmployeeController;