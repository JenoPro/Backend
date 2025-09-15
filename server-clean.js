import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import process from 'process'

// Database and configuration imports
import { initializeDatabase } from './Naga-Stall-Management/config/database.js'
import { corsConfig } from './Naga-Stall-Management/config/cors.js'
import { errorHandler } from './Naga-Stall-Management/middleware/errorHandler.js'
import { testConnection } from './Naga-Stall-Landingpage/config/database.js'

// Route imports - organized by functionality
import adminRoutes from './Naga-Stall-Management/Admin/adminRoutes.js'
import managementStallRoutes from './Naga-Stall-Management/Stall/stallRoutes.js'
import landingStallRoutes from './Naga-Stall-Landingpage/routes/stallRoutes.js'
import applicantRoutes from './Naga-Stall-Landingpage/routes/applicantRoutes.js'
import applicationRoutes from './Naga-Stall-Landingpage/routes/applicationRoutes.js'

// Controller imports - static imports for better performance
import {
  adminLogin,
  branchManagerLogin,
  verifyToken,
  logout,
  getCurrentUser,
  getBranchManagerInfo,
  getAreas,
  getBranchesByArea,
  testDb
} from './Naga-Stall-Management/Admin/adminController.js'

import {
  getAllStalls,
  getStallById,
  getAvailableAreas,
  getStallsByArea,
  getLocationsByArea,
  getFilteredStalls
} from './Naga-Stall-Landingpage/stallcontrollers/stallController.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors(corsConfig))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ===== PREFIXED ROUTES (For advanced usage) =====
app.use('/management/api/auth', adminRoutes)
app.use('/management/api/stalls', managementStallRoutes)
app.use('/landing/api/stalls', landingStallRoutes)
app.use('/landing/api/applicants', applicantRoutes)
app.use('/landing/api/applications', applicationRoutes)

// ===== FRONTEND-FRIENDLY ROUTES (No prefix) =====

// Authentication endpoints
app.post('/api/auth/admin/login', adminLogin)
app.post('/api/auth/branch_manager/login', branchManagerLogin)
app.get('/api/auth/verify-token', verifyToken)
app.post('/api/auth/logout', logout)
app.get('/api/auth/me', getCurrentUser)
app.get('/api/auth/branch-manager-info', getBranchManagerInfo)

// Stall endpoints
app.get('/api/stalls', getAllStalls)
app.get('/api/stalls/areas', getAvailableAreas)
app.get('/api/stalls/by-area', getStallsByArea)
app.get('/api/stalls/locations', getLocationsByArea)
app.get('/api/stalls/filter', getFilteredStalls)
app.get('/api/stalls/:id', getStallById)

// Area and branch endpoints
app.get('/api/areas', getAreas)
app.get('/api/branches/:area', getBranchesByArea)

// Utility endpoints
app.get('/api/test-db', testDb)
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection()
    res.json({
      success: true,
      message: 'Naga Stall Main Server is running',
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
        dbHost: process.env.DB_HOST || 'localhost',
        dbName: process.env.DB_NAME || 'naga_stall',
      },
      database: dbStatus,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server health check failed',
      error: error.message,
    })
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Naga Stall Main API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      stalls: '/api/stalls/*',
      areas: '/api/areas',
      health: '/api/health'
    },
  })
})

// Error handling
app.use(errorHandler)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// Start server
app.listen(PORT, async () => {
  console.log('🚀 Naga Stall Server starting...')
  console.log(`🌐 Server: http://localhost:${PORT}`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  try {
    console.log('🔧 Initializing database...')
    await initializeDatabase()
    console.log('✅ Database ready')
    console.log('📊 Server fully operational')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
})

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🔄 ${signal} received, shutting down gracefully`)
  process.exit(0)
}

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))