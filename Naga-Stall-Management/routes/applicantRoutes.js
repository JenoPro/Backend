import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getAllApplicants,
  getApplicantById,
  getApplicantsByBranchManager,
  approveApplicant,
  updateApplicantStatus,
  declineApplicant,
  searchApplicants
} from '../controllers/applicants/applicantsController.js'

const router = express.Router()

// Protected routes (authentication required)
router.use(authMiddleware.authenticateToken)

// Get all applicants (for admin)
router.get('/', getAllApplicants)

// Search applicants
router.get('/search', searchApplicants)

// Get applicants for the authenticated branch manager (Management System Vue.js)
router.get('/my-stall-applicants', getApplicantsByBranchManager)

// Get individual applicant by ID
router.get('/:id', getApplicantById)

// Update applicant status (for Vue.js management system)
router.put('/:id/status', updateApplicantStatus)

// Approval route - this creates credentials in the credential table for mobile app
router.put('/:id/approve', approveApplicant)

// Decline applicant
router.put('/:id/decline', declineApplicant)

export default router
