import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  searchApplicants,
  getApplicantsByBranch,
  getApplicantsByStall,
  getApplicantsByBranchManager
} from '../controllers/applicants/applicantsController.js'

const router = express.Router()

// Public routes
router.post('/', createApplicant)                    // POST /api/applicants - Create new applicant (public application)

// Protected routes (authentication required)
router.use(authMiddleware.authenticateToken) // Apply auth middleware to routes below
router.get('/', getAllApplicants)                   // GET /api/applicants - Get all applicants
router.get('/search', searchApplicants)             // GET /api/applicants/search - Search applicants

// Branch and stall specific routes (for admin/branch managers)
router.get('/my-stall-applicants', getApplicantsByBranchManager) // GET /api/applicants/my-stall-applicants - Get authenticated branch manager's stall applicants
router.get('/branch/:branch_id', getApplicantsByBranch)          // GET /api/applicants/branch/:branch_id - Get applicants by branch
router.get('/stall/:stall_id', getApplicantsByStall)             // GET /api/applicants/stall/:stall_id - Get applicants by stall
router.get('/manager/:branch_manager_id', getApplicantsByBranchManager) // GET /api/applicants/manager/:branch_manager_id - Get applicants by branch manager

router.get('/:id', getApplicantById)               // GET /api/applicants/:id - Get applicant by ID
router.put('/:id', updateApplicant)                // PUT /api/applicants/:id - Update applicant
router.delete('/:id', deleteApplicant)             // DELETE /api/applicants/:id - Delete applicant

export default router