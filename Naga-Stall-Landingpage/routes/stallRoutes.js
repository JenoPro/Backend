import express from 'express'
import {
  getAllStalls,
  getStallById,
  getAvailableAreas,
  getStallsByArea,
  getLocationsByArea,
  getFilteredStalls,
  // Legacy routes for backward compatibility
  getStallsByLocation,
  getAvailableMarkets
} from '../stallcontrollers/stallController.js'

const router = express.Router()

// Main stall routes (NEW)
router.get('/', getAllStalls)                    // GET /api/stalls
router.get('/areas', getAvailableAreas)          // GET /api/stalls/areas
router.get('/by-area', getStallsByArea)          // GET /api/stalls/by-area?area=Naga%20City
router.get('/locations', getLocationsByArea)     // GET /api/stalls/locations?area=Naga%20City
router.get('/filter', getFilteredStalls)         // GET /api/stalls/filter?area=Naga%20City&location=Peoples%20Mall
router.get('/:id', getStallById)                 // GET /api/stalls/:id

// Legacy routes (for backward compatibility)
router.get('/by-location', getStallsByLocation)  // GET /api/stalls/by-location?location=Peoples%20Mall
router.get('/markets', getAvailableMarkets)      // GET /api/stalls/markets

export default router