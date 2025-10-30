import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getAllApplicants,
  getApplicantById,
  getApplicantsByBranchManager,
  approveApplicant,
  updateApplicantStatus,
  declineApplicant,
  searchApplicants,
  // New participant functions
  getAllParticipants,
  getParticipantsByBranch,
  getParticipantsByStall
} from '../controllers/applicants/applicantsController.js'

const router = express.Router()

// Protected routes (authentication required)
router.use(authMiddleware.authenticateToken)

// Get all applicants (for admin)
router.get('/', getAllApplicants)

// Search applicants
router.get('/search', searchApplicants)

// NEW: Participant endpoints (approved applicants with active stalls) - MUST be before /:id route
router.get('/participants', getAllParticipants)                    // GET /api/applicants/participants
router.get('/participants/branch/:branch_name', getParticipantsByBranch)  // GET /api/applicants/participants/branch/Naga%20City%20Peoples%20Mall
router.get('/participants/stall/:stall_id', getParticipantsByStall)       // GET /api/applicants/participants/stall/123

// Get applicants for the authenticated branch manager (Management System Vue.js)
router.get('/my-stall-applicants', getApplicantsByBranchManager)

// Get individual applicant by ID (MUST be after specific routes)
router.get('/:id', getApplicantById)

// Update applicant status (for Vue.js management system)
router.put('/:id/status', updateApplicantStatus)

// Approval route - this creates credentials in the credential table for mobile app
router.put('/:id/approve', approveApplicant)

// Decline applicant
router.put('/:id/decline', declineApplicant)

export default router
