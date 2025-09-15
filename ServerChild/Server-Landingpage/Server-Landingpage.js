import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initializeDatabase, testConnection } from './Naga-Stall-Landingpage/config/database.js'
import stallRoutes from './Naga-Stall-Landingpage/routes/stallRoutes.js'
import applicantRoutes from './Naga-Stall-Landingpage/routes/applicantRoutes.js'
import applicationRoutes from './Naga-Stall-Landingpage/routes/applicationRoutes.js'
import { errorHandler } from './Naga-Stall-Landingpage/middleware/errorHandler.js'
import { corsConfig } from './Naga-Stall-Landingpage/middleware/cors.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

console.log('🚀 Starting Naga Stall Landing Page Server...')

// Middleware
app.use(cors(corsConfig))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/api/stalls', stallRoutes)
app.use('/api/applicants', applicantRoutes)
app.use('/api/applications', applicationRoutes)

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection()
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
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
    message: 'Naga Stall Landing Page API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      stalls: '/api/stalls',
    },
  })
})

// Error handling middleware
app.use(errorHandler)

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔧 Initializing database...')
    await initializeDatabase()
    console.log('✅ Database initialized successfully')

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`)
      console.log(`🌐 Server URL: http://localhost:${PORT}`)
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`)
      console.log(`📊 Stalls API: http://localhost:${PORT}/api/stalls`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully')
  process.exit(0)
})

startServer()