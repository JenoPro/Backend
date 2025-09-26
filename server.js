import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import process from 'process'
import { initializeDatabase } from './Naga-Stall-Management/config/database.js'
import { corsConfig } from './Naga-Stall-Management/config/cors.js'
import { errorHandler } from './Naga-Stall-Management/middleware/errorHandler.js'

// Import new consolidated routes
import authRoutes from './Naga-Stall-Management/routes/authRoutes.js'
import stallRoutes from './Naga-Stall-Management/routes/stallRoutes.js'
import branchRoutes from './Naga-Stall-Management/routes/branchRoutes.js'
import applicantRoutes from './Naga-Stall-Management/routes/applicantRoutes.js'
// Import floor/section functions for direct endpoints
import { getFloors, getSections, getFloorsWithSections, createFloor, createSection, createBranchManager } from './Naga-Stall-Management/controllers/branch/branchController.js'
import authMiddleware from './Naga-Stall-Management/middleware/auth.js'

// Legacy imports for Landing page and Mobile app (unchanged)
import landingStallRoutes from "./Naga-Stall-Landingpage/routes/stallRoutes.js";
import landingApplicantRoutes from "./Naga-Stall-Landingpage/routes/applicantRoutes.js";
import applicationRoutes from "./Naga-Stall-Landingpage/routes/applicationRoutes.js";
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== NEW ORGANIZED API ROUTES (Management System) =====
// Authentication routes
app.use('/api/auth', authRoutes)

// Feature-based routes (protected)
app.use('/api/stalls', stallRoutes)          // Stall management
app.use('/api/branches', branchRoutes)       // Branch management (for branch managers)
app.use('/api/applicants', applicantRoutes)  // Applicant management

// Admin-specific routes (different URL structure expected by frontend)
app.use('/api/admin/branches', branchRoutes) // Admin branch management
// Add specific admin endpoints that frontend expects
app.post('/api/admin/branch-managers', authMiddleware.authenticateToken, authMiddleware.authorizeRole('admin'), createBranchManager)  // POST /api/admin/branch-managers

// Direct endpoints for floors and sections (required by frontend)
app.get('/api/floors', authMiddleware.authenticateToken, getFloors)      // GET /api/floors - Get floors for branch manager
app.post('/api/floors', authMiddleware.authenticateToken, createFloor)   // POST /api/floors - Create new floor
app.get('/api/sections', authMiddleware.authenticateToken, getSections)  // GET /api/sections - Get sections for branch manager
app.post('/api/sections', authMiddleware.authenticateToken, createSection) // POST /api/sections - Create new section

// Legacy endpoint that frontend expects
app.get('/api/branch-manager/floors-with-sections', authMiddleware.authenticateToken, getFloorsWithSections)  // GET /api/branch-manager/floors-with-sections

// ===== LEGACY ROUTES (Landing Page & Mobile - unchanged) =====
app.use("/api/landing-stalls", landingStallRoutes);
app.use("/api/landing-applicants", landingApplicantRoutes);
app.use("/api/applications", applicationRoutes);

// ===== UTILITY ENDPOINTS =======

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Naga Stall Management Server is running',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: PORT,
      dbHost: process.env.DB_HOST || 'localhost',
      dbName: process.env.DB_NAME || 'naga_stall',
    },
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Naga Stall Management API',
    version: '2.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  })
})

// Start server
app.listen(PORT, async () => {
  console.log('🚀 Naga Stall Management Server starting...')
  console.log(`🌐 Server running on http://localhost:${PORT}`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('🌐 CORS enabled for frontend URLs')
  console.log('📋 API Endpoints:')

  // Authentication endpoints
  console.log('\n   === AUTHENTICATION ENDPOINTS ===')
  console.log('   POST /api/auth/admin/login - Admin login (super admin)')
  console.log('   POST /api/auth/branch_manager/login - Branch Manager login')
  console.log('   GET  /api/auth/verify-token - Verify JWT token')
  console.log('   POST /api/auth/logout - Logout (protected)')
  console.log('   GET  /api/auth/me - Get current user info (protected)')
  console.log('   GET  /api/auth/branch-manager-info - Get branch manager info (protected)')
  console.log('   GET  /api/auth/admin-info - Get admin info (protected)')
  console.log('   POST /api/auth/create-admin - Create admin user')
  console.log('   POST /api/auth/hash-password - Create password hash')
  console.log('   GET  /api/auth/test-db - Test database connection')

  // Branch management endpoints
  console.log('\n   === BRANCH MANAGEMENT ENDPOINTS (Protected) ===')
  console.log('   POST /api/branches - Create new branch')
  console.log('   GET  /api/branches - Get all branches')
  console.log('   DELETE /api/branches/:id - Delete branch')
  console.log('   GET  /api/branches/areas - Get all areas')
  console.log('   GET  /api/branches/area/:area - Get branches by area')
  console.log('   GET  /api/branches/managers - Get all branch managers')
  console.log('   POST /api/branches/managers - Create branch manager')
  console.log('   GET  /api/branches/managers/:managerId - Get branch manager by ID')
  console.log('   PUT  /api/branches/managers/:managerId - Update branch manager')
  console.log('   DELETE /api/branches/managers/:managerId - Delete branch manager')
  console.log('   POST /api/branches/assign-manager - Assign manager to branch')
  console.log('   POST /api/branches/branch-managers - Assign manager to branch (alias)')
  console.log('   GET  /api/branches/floors - Get floors for branch manager')
  console.log('   POST /api/branches/floors - Create new floor')
  console.log('   GET  /api/branches/sections - Get sections for branch manager')
  console.log('   POST /api/branches/sections - Create new section')
  console.log('   GET  /api/branches/cities - Get unique cities')
  console.log('   GET  /api/branches/city/:city - Get areas by city')
  console.log('   GET  /api/branches/locations/:city - Get locations by city')
  console.log('   GET  /api/branches/area/:id - Get area by ID with statistics')

  // Direct floor and section endpoints (required by frontend)
  console.log('\n   === FLOOR & SECTION ENDPOINTS (Protected) ===')
  console.log('   GET  /api/floors - Get floors for authenticated branch manager')
  console.log('   POST /api/floors - Create new floor')
  console.log('   GET  /api/sections - Get sections for authenticated branch manager')
  console.log('   POST /api/sections - Create new section')
  console.log('   GET  /api/branch-manager/floors-with-sections - Get floors with nested sections (legacy endpoint)')

  // Stall management endpoints
  console.log('\n   === STALL MANAGEMENT ENDPOINTS (Protected) ===')
  console.log('   POST /api/stalls - Add new stall')
  console.log('   GET  /api/stalls - Get all stalls for authenticated branch manager')
  console.log('   GET  /api/stalls/available - Get available stalls')
  console.log('   GET  /api/stalls/filter - Get stalls by filter')
  console.log('   GET  /api/stalls/:id - Get stall by ID')
  console.log('   PUT  /api/stalls/:id - Update stall')
  console.log('   DELETE /api/stalls/:id - Delete stall')

  // Applicant management endpoints
  console.log('\n   === APPLICANT MANAGEMENT ENDPOINTS ===')
  console.log('   POST /api/applicants - Create new applicant (public)')
  console.log('   GET  /api/applicants - Get all applicants (protected)')
  console.log('   GET  /api/applicants/search - Search applicants (protected)')
  console.log('   GET  /api/applicants/:id - Get applicant by ID (protected)')
  console.log('   PUT  /api/applicants/:id - Update applicant (protected)')
  console.log('   DELETE /api/applicants/:id - Delete applicant (protected)')

  // Legacy landing page endpoints
  console.log('\n   === LEGACY LANDING PAGE ENDPOINTS ===')
  console.log('   GET  /api/landing-stalls/* - Landing page stall endpoints')
  console.log('   GET  /api/landing-applicants/* - Landing page applicant endpoints')
  console.log('   GET  /api/applications/* - Application endpoints')

  // Utility endpoints
  console.log('\n   === UTILITY ENDPOINTS ===')
  console.log('   GET  /api/health - Health check')
  console.log('   GET  / - API information')

  console.log('\n📋 SAMPLE LOGIN CREDENTIALS:')
  console.log('   Branch Manager 1:')
  console.log('   - Area: Naga City')
  console.log('   - Location: Peoples Mall')
  console.log('   - Username: manager_naga_peoples')
  console.log('   - Password: [encrypted in database]')
  console.log('')
  console.log('   Branch Manager 2:')
  console.log('   - Area: Legazpi')
  console.log('   - Location: SM')
  console.log('   - Username: manager_legazpi_sm')
  console.log('   - Password: [encrypted in database]')

  try {
    await initializeDatabase()
    console.log('\n✅ Database initialization completed successfully')
    console.log('📊 Stalls are filtered by branch_manager_id for each logged-in user')
    console.log('🎯 Backend reorganized by features (login, stalls, branches, applicants)')
  } catch (error) {
    console.error('\n❌ Failed to initialize database:', error)
    process.exit(1)
  }
})

export default app
