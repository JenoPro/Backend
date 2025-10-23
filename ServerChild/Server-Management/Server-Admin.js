import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import process from 'process'
import { initializeDatabase } from '../../Naga-Stall-Management/config/database.js'
import { corsConfig } from '../../Naga-Stall-Management/config/cors.js'
import authRoutes from '../../Naga-Stall-Management/routes/authRoutes.js'
import stallRoutes from '../../Naga-Stall-Management/routes/stallRoutes.js'
import branchRoutes from '../../Naga-Stall-Management/routes/branchRoutes.js'
import applicantRoutes from '../../Naga-Stall-Management/routes/applicantRoutes.js'
import employeeRoutes from '../../Naga-Stall-Management/routes/employeeRoutes.js'
import { errorHandler } from '../../Naga-Stall-Management/middleware/errorHandler.js'

// Load environment variables from .env file
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors(corsConfig))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)        // Authentication routes for branch managers
app.use('/api/stalls', stallRoutes)     // Stall management routes (with authentication) - INCLUDES RAFFLE/AUCTION
app.use('/api/branches', branchRoutes)  // Branch management routes
app.use('/api/applicants', applicantRoutes) // Applicant management routes
app.use('/api/employees', employeeRoutes)    // Employee management routes

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const connection = await initializeDatabase();
    if (connection) {
      await connection.end();
      res.json({
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message
    });
  }
})

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

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, async () => {
  console.log('🚀 Naga Stall Management Server starting...')
  console.log(`🌐 Server running on http://localhost:${PORT}`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 CORS enabled for frontend URLs`)
  console.log('🔧 Available endpoints:')

  // Authentication endpoints
  console.log('   === AUTHENTICATION ENDPOINTS ===')
  console.log('   POST /api/auth/admin/login - Admin login (super admin)')
  console.log('   POST /api/auth/branch_manager/login - Branch Manager login')
  console.log('   GET  /api/auth/verify-token - Verify JWT token')
  console.log('   POST /api/auth/logout - Logout')
  console.log('   GET  /api/auth/me - Get current user info')
  console.log('')

  // Area and Branch endpoints
  console.log('   === LOCATION ENDPOINTS ===')
  console.log('   GET  /api/areas - Get all areas/branches (from branch_manager table)')
  console.log('   GET  /api/areas/cities - Get unique cities')
  console.log('   GET  /api/areas/city/:city - Get branches by city')
  console.log('   GET  /api/areas/locations/:city - Get locations by city')
  console.log('   GET  /api/areas/:id - Get area by ID')
  console.log('')

  // Stall management endpoints (protected)
  console.log('   === STALL MANAGEMENT ENDPOINTS (Protected) ===')
  console.log('   GET  /api/stalls - Get all stalls for authenticated branch manager')
  console.log('   POST /api/stalls - Add new stall')
  console.log('   GET  /api/stalls/available - Get available stalls')
  console.log('   GET  /api/stalls/filter - Get stalls by filter')
  console.log('   GET  /api/stalls/:id - Get stall by ID')
  console.log('   PUT  /api/stalls/:id - Update stall')
  console.log('   DELETE /api/stalls/:id - Delete stall')
  console.log('')

  // Utility endpoints
  console.log('   === UTILITY ENDPOINTS ===')
  console.log('   GET  /api/health - Health check')
  console.log('   GET  /api/test-db - Test database connection')
  console.log('')

  console.log('📋 SAMPLE LOGIN CREDENTIALS (from SQL):')
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
  console.log('')

  try {
    await initializeDatabase()
    console.log('✅ Database initialization completed successfully')
    console.log('📊 Stalls are filtered by branch_manager_id for each logged-in user')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    process.exit(1)
  }
})
