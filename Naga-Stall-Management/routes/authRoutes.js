import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  adminLogin,
  branchManagerLogin,
  verifyToken as verifyTokenHandler,
  logout,
  getCurrentUser,
  createAdminUser,
  createPasswordHash,
  testDb
} from '../controllers/login/loginController.js'

const router = express.Router()

// Public routes (no authentication required)
router.post('/admin/login', adminLogin)                    // POST /api/auth/admin/login - Admin login
router.post('/branch_manager/login', branchManagerLogin)   // POST /api/auth/branch_manager/login - Branch manager login
router.get('/verify-token', verifyTokenHandler)           // GET /api/auth/verify-token - Verify JWT token
router.post('/create-admin', createAdminUser)             // POST /api/auth/create-admin - Create admin user
router.post('/hash-password', createPasswordHash)         // POST /api/auth/hash-password - Create password hash
router.get('/test-db', testDb)                           // GET /api/auth/test-db - Test database connection

// Protected routes (authentication required)
router.use(authMiddleware.authenticateToken) // Apply auth middleware to routes below
router.post('/logout', logout)                           // POST /api/auth/logout - Logout
router.get('/me', getCurrentUser)                        // GET /api/auth/me - Get current user info
router.get('/branch-manager-info', getCurrentUser)       // GET /api/auth/branch-manager-info - Get branch manager info (alias)
router.get('/admin-info', getCurrentUser)                // GET /api/auth/admin-info - Get admin info (alias)

export default router