import express from 'express'
import {
  getAllStalls,
  getStallsByType,
  getStallsByArea,
  getStallById,
  getAvailableAreas,
  searchStalls
} from '../controllers/stall/stallController.js'

const router = express.Router()

// Get all available stalls (restricted to applicant's applied areas)
// GET /api/mobile/stalls?applicant_id=123 (applicant_id REQUIRED)
router.get('/stalls', getAllStalls)

// Get stalls by type (Fixed Price, Raffle, Auction) - restricted to applicant's applied areas
// GET /api/mobile/stalls/type/Auction?applicant_id=123 (applicant_id REQUIRED)
router.get('/stalls/type/:type', getStallsByType)

// Get stalls by area - restricted to applicant's applied areas
// GET /api/mobile/stalls/area/Naga City?applicant_id=123&type=Auction (applicant_id REQUIRED)
router.get('/stalls/area/:area', getStallsByArea)

// Get stall details by ID
// GET /api/mobile/stalls/123?applicant_id=456
router.get('/stalls/:id', getStallById)

// Get available areas (only areas where applicant has applications)
// GET /api/mobile/areas?applicant_id=123 (applicant_id REQUIRED)
router.get('/areas', getAvailableAreas)

// Search stalls with filters - restricted to applicant's applied areas
// GET /api/mobile/stalls/search?applicant_id=123&type=Auction&area=Naga City&min_price=1000&max_price=5000 (applicant_id REQUIRED)
router.get('/stalls/search', searchStalls)

export default router