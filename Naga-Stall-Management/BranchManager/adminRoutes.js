import express from 'express'
import {
  branchManagerLogin,
  adminLogin,
  getBranchManagerInfo, // This import is correct
  verifyToken,
  logout,
  getAreas,
  getBranchesByArea,
  getCurrentUser,
  testDb,
  createPasswordHash,
} from './adminController.js'

const router = express.Router()

// Authentication Routes
router.post('/admin/login', adminLogin)
router.post('/branch_manager/login', branchManagerLogin)

// Branch Manager Information Routes - THIS IS THE KEY ADDITION
router.get('/branch-manager-info', getBranchManagerInfo)

// Location Routes for Login Form
router.get('/areas', getAreas)
router.get('/branches/:area', getBranchesByArea)

// Authentication Utility Routes
router.get('/verify-token', verifyToken)
router.post('/logout', logout)
router.get('/me', getCurrentUser)

// Testing/Debug Routes (remove in production)
router.post('/create-password-hash', createPasswordHash)
router.get('/test-db', testDb)

export default router