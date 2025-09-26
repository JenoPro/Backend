import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  createBranch,
  getAllBranches,
  deleteBranch,
  createBranchManager,
  assignManager,
  updateBranchManager,
  deleteBranchManager,
  getBranchManagerById,
  getAllBranchManagers,
  getBranchesByArea,
  getAreas,
  getFloors,
  createFloor,
  getSections,
  createSection,
  getFloorsWithSections,
  // Merged area functions
  getAreasByCity,
  getAreaById,
  getCities,
  getLocationsByCity
} from '../controllers/branch/branchController.js'

const router = express.Router()

// Apply authentication middleware to all branch routes
// Allow both admin and branch manager access
router.use(authMiddleware.authenticateToken)

// Branch routes (admin-only for creation/deletion, admin+branch_manager for reading)
router.post('/', authMiddleware.authorizeRole('admin'), createBranch)                      // POST /api/branches - Create new branch (admin only)
router.get('/', getAllBranches)                     // GET /api/branches - Get all branches (admin + branch manager)
router.delete('/:id', authMiddleware.authorizeRole('admin'), deleteBranch)                 // DELETE /api/branches/:id - Delete branch (admin only)
router.get('/areas', getAreas)                      // GET /api/branches/areas - Get all areas
router.get('/area/:area', getBranchesByArea)        // GET /api/branches/area/:area - Get branches by area

// Branch manager routes (admin only)
router.get('/managers', authMiddleware.authorizeRole('admin'), getAllBranchManagers)       // GET /api/branches/managers - Get all branch managers (admin only)
router.post('/managers', authMiddleware.authorizeRole('admin'), createBranchManager)       // POST /api/branches/managers - Create branch manager (admin only)
router.get('/managers/:managerId', authMiddleware.authorizeRole('admin'), getBranchManagerById)  // GET /api/branches/managers/:managerId - Get branch manager by ID (admin only)
router.put('/managers/:managerId', authMiddleware.authorizeRole('admin'), updateBranchManager)   // PUT /api/branches/managers/:managerId - Update branch manager (admin only)
router.delete('/managers/:managerId', authMiddleware.authorizeRole('admin'), deleteBranchManager) // DELETE /api/branches/managers/:managerId - Delete branch manager (admin only)
router.post('/assign-manager', authMiddleware.authorizeRole('admin'), assignManager)
router.post('/branch-managers', authMiddleware.authorizeRole('admin'), assignManager)       // POST /api/branches/branch-managers - Assign manager to branch (admin only)

// Floor routes
router.get('/floors', getFloors)                    // GET /api/branches/floors - Get floors for branch manager
router.post('/floors', createFloor)                 // POST /api/branches/floors - Create new floor

// Section routes  
router.get('/sections', getSections)                // GET /api/branches/sections - Get sections for branch manager
router.post('/sections', createSection)             // POST /api/branches/sections - Create new section

// Floor-Section combined routes
router.get('/floors-with-sections', getFloorsWithSections)  // GET /api/branches/floors-with-sections - Get floors with nested sections

// ===== AREA MANAGEMENT ROUTES (Merged from areaRoutes) =====
router.get('/cities', getCities)                    // GET /api/branches/cities - Get unique cities
router.get('/city/:city', getAreasByCity)           // GET /api/branches/city/:city - Get areas by city
router.get('/locations/:city', getLocationsByCity)  // GET /api/branches/locations/:city - Get locations by city
router.get('/area/:id', getAreaById)                // GET /api/branches/area/:id - Get area by ID with stats

export default router