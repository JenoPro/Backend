import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
  logoutEmployee,
  resetEmployeePassword,
  getEmployeesByBranch
} from '../controllers/employees/employeeController_simple.js';

const router = express.Router();

/**
 * Employee Management Routes
 * All routes for employee CRUD operations, authentication, and management
 */

// ========================================
// EMPLOYEE CRUD OPERATIONS
// ========================================

/**
 * @route   POST /api/employees
 * @desc    Create new employee with auto-generated credentials
 * @access  Manager
 * @body    { firstName, lastName, email, phoneNumber, branchId, permissions, createdByManager }
 */
router.post('/', createEmployee);

/**
 * @route   GET /api/employees
 * @desc    Get all employees with filtering options
 * @access  Manager
 * @query   ?status=active&branchId=1&search=john&page=1&limit=50&sortBy=created_at&sortOrder=DESC
 */
router.get('/', getAllEmployees);

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee by ID with detailed information
 * @access  Manager
 * @params  id - Employee ID
 */
router.get('/:id', getEmployeeById);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee information
 * @access  Manager
 * @params  id - Employee ID
 * @body    { firstName, lastName, email, phoneNumber, permissions, status, updatedBy }
 */
router.put('/:id', updateEmployee);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete (deactivate) employee
 * @access  Manager
 * @params  id - Employee ID
 * @body    { deletedBy }
 */
router.delete('/:id', deleteEmployee);

// ========================================
// BRANCH-SPECIFIC OPERATIONS
// ========================================

/**
 * @route   GET /api/employees/branch/:branchId
 * @desc    Get employees by branch
 * @access  Manager
 * @params  branchId - Branch ID
 * @query   ?status=Active
 */
router.get('/branch/:branchId', getEmployeesByBranch);

// ========================================
// EMPLOYEE AUTHENTICATION
// ========================================

/**
 * @route   POST /api/employees/login
 * @desc    Employee login with username and password
 * @access  Public
 * @body    { username, password }
 */
router.post('/login', loginEmployee);

/**
 * @route   POST /api/employees/logout
 * @desc    Employee logout (invalidate session)
 * @access  Employee  
 * @body    { sessionToken }
 */
router.post('/logout', logoutEmployee);

// ========================================
// EMPLOYEE MANAGEMENT ACTIONS
// ========================================

/**
 * @route   POST /api/employees/:id/reset-password
 * @desc    Reset employee password by manager
 * @access  Manager
 * @params  id - Employee ID
 * @body    { newPassword, resetBy }
 */
router.post('/:id/reset-password', resetEmployeePassword);

// ========================================
// AUTHENTICATION OPERATIONS
// ========================================

/**
 * @route   POST /api/employees/login
 * @desc    Employee login
 * @access  Public
 * @body    { username, password, ipAddress, userAgent }
 */
router.post('/login', loginEmployee);

/**
 * @route   POST /api/employees/logout
 * @desc    Employee logout
 * @access  Employee
 * @body    { sessionToken, employeeId }
 */
router.post('/logout', logoutEmployee);

// ========================================
// PASSWORD MANAGEMENT
// ========================================

/**
 * @route   POST /api/employees/:id/reset-password
 * @desc    Reset employee password with auto-generated password
 * @access  Manager
 * @params  id - Employee ID
 * @body    { resetBy }
 */
router.post('/:id/reset-password', resetEmployeePassword);

// ========================================
// PERMISSION MANAGEMENT
// ========================================

/**
 * @route   PUT /api/employees/:id/permissions
 * @desc    Update employee permissions
 * @access  Manager
 * @params  id - Employee ID
 * @body    { permissions, updatedBy }
 */
router.put('/:id/permissions', updateEmployee);

// ========================================
// ACTIVITY AND SEARCH
// ========================================

/**
 * @route   GET /api/employees/:id/activity
 * @desc    Get employee activity log
 * @access  Manager
 * @params  id - Employee ID
 * @query   ?limit=50&page=1&actionType=login
 */
router.get('/:id/activity', getEmployeeById);

/**
 * @route   GET /api/employees/search
 * @desc    Search employees with advanced filtering
 * @access  Manager
 * @query   ?q=searchterm&status=Active&branchId=1&permissions=dashboard
 */
router.get('/search', getAllEmployees);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

router.use((error, req, res, next) => {
    console.error('Employee route error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error in employee routes',
        error: error.message
    });
});

export default router;
