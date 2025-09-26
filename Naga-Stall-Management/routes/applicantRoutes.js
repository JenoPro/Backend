import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  searchApplicants
} from '../controllers/applicants/applicantsController.js'

const router = express.Router()

// Public routes
router.post('/', createApplicant)                    // POST /api/applicants - Create new applicant (public application)

// Protected routes (authentication required)
router.use(authMiddleware.authenticateToken) // Apply auth middleware to routes below
router.get('/', getAllApplicants)                   // GET /api/applicants - Get all applicants
router.get('/search', searchApplicants)             // GET /api/applicants/search - Search applicants
router.get('/:id', getApplicantById)               // GET /api/applicants/:id - Get applicant by ID
router.put('/:id', updateApplicant)                // PUT /api/applicants/:id - Update applicant
router.delete('/:id', deleteApplicant)             // DELETE /api/applicants/:id - Delete applicant

export default router