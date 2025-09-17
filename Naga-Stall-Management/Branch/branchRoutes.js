import express from 'express'
import {
  getAllBranches,
  createBranch,
  assignManager,
  deleteBranch,
  createBranchManager
} from './branchController.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

// All routes require admin authentication
router.use(authMiddleware.authenticateAdmin)

// GET /api/admin/branches - Get all branches
router.get('/', getAllBranches)

// POST /api/admin/branches - Create new branch
router.post('/', createBranch)

// PUT /api/admin/branches/:id/assign-manager - Assign manager to branch
router.put('/:id/assign-manager', assignManager)

// DELETE /api/admin/branches/:id - Delete branch
router.delete('/:id', deleteBranch)

export default router