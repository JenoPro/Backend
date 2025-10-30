import express from 'express'
import {
  getAllStalls,
  getStallById,
  getAvailableAreas,
  getBranches,
  getStallsByArea,
  getLocationsByArea,
  getFilteredStalls,
  // Legacy routes for backward compatibility
  getStallsByLocation,
  getAvailableMarkets
} from '../stallcontrollers/stallController.js'

const router = express.Router()

// NEW Branch-based routes (Primary)
router.get('/branches', getBranches)               // GET /api/stalls/branches
router.get('/by-branch', getStallsByArea)          // GET /api/stalls/by-branch?branch=Naga%20City%20People's%20Mall

// Main stall routes (UPDATED to support branch parameter)
router.get('/', getAllStalls)                      // GET /api/stalls
router.get('/locations', getLocationsByArea)       // GET /api/stalls/locations?branch=Naga%20City%20People's%20Mall
router.get('/filter', getFilteredStalls)           // GET /api/stalls/filter?branch=Naga%20City%20People's%20Mall&location=Section%20A
router.get('/:id', getStallById)                   // GET /api/stalls/:id

// Legacy area-based routes (for backward compatibility)
router.get('/areas', getAvailableAreas)            // GET /api/stalls/areas
router.get('/by-area', getStallsByArea)            // GET /api/stalls/by-area?area=Naga%20City
router.get('/by-location', getStallsByLocation)    // GET /api/stalls/by-location?location=Peoples%20Mall
router.get('/markets', getAvailableMarkets)        // GET /api/stalls/markets

export default router