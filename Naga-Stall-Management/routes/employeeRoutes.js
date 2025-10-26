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
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * @route   POST /api/employees/login
 * @desc    Employee login with username and password
 * @access  Public
 * @body    { username, password }
 */
router.post('/login', loginEmployee);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

// Apply authentication middleware to all routes below this point
router.use(authMiddleware.authenticateToken);

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
 * @desc    Get all employees with filtering options (filtered by user's branch)
 * @access  Manager
 * @query   ?status=active&search=john&page=1&limit=50&sortBy=created_at&sortOrder=DESC
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
 * @desc    Get employees by branch (specific branch ID)
 * @access  Manager
 * @params  branchId - Branch ID
 * @query   ?status=Active
 */
router.get('/branch/:branchId', getEmployeesByBranch);

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

/**
 * @route   POST /api/employees/logout
 * @desc    Employee logout (invalidate session)
 * @access  Employee  
 * @body    { sessionToken }
 */
router.post('/logout', logoutEmployee);

export default router;
