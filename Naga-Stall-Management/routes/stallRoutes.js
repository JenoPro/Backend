import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  addStall,
  getAllStalls,
  getAvailableStalls,
  getStallById,
  getStallsByFilter,
  updateStall,
  deleteStall
} from '../controllers/stalls/stallController.js'

const router = express.Router()

// Apply authentication middleware to all stall routes
router.use(authMiddleware.authenticateToken)

// Stall routes
router.post('/', addStall)                    // POST /api/stalls - Add new stall
router.get('/', getAllStalls)                 // GET /api/stalls - Get all stalls for branch manager
router.get('/available', getAvailableStalls)  // GET /api/stalls/available - Get available stalls
router.get('/filter', getStallsByFilter)     // GET /api/stalls/filter - Get stalls by filter
router.get('/:id', getStallById)             // GET /api/stalls/:id - Get stall by ID
router.put('/:id', updateStall)              // PUT /api/stalls/:id - Update stall
router.delete('/:id', deleteStall)           // DELETE /api/stalls/:id - Delete stall

export default router