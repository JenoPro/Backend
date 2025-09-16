import { testConnection } from '../../config/database.js'

// Test database connection controller
export async function testDb(req, res) {
  try {
    const result = await testConnection()
    res.json({
      success: true,
      message: 'Database connection test successful',
      data: result,
    })
  } catch (error) {
    console.error('❌ Database test error:', error)
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    })
  }
}