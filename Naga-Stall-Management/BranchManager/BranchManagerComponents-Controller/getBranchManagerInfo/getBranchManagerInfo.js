import jwt from 'jsonwebtoken'
import { createConnection } from '../../../config/database.js'

const { verify } = jwt

// Get Branch Manager Info controller
export async function getBranchManagerInfo(req, res) {
  let connection

  try {
    console.log('🔍 getBranchManagerInfo called')
    
    // Get the token from authorization header
    const token = req.headers.authorization?.replace('Bearer ', '')
    console.log('🎫 Token received:', token ? 'Yes' : 'No')

    if (!token) {
      console.log('❌ No token provided')
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      })
    }

    // Verify token
    const jwtSecret =
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    const decoded = verify(token, jwtSecret)
    console.log('🔓 Token decoded:', { userType: decoded.userType, branchManagerId: decoded.branchManagerId })

    if (decoded.userType !== 'branch_manager') {
      console.log('❌ Access denied - not branch manager')
      return res.status(403).json({
        success: false,
        message: 'Access denied. Branch manager role required.',
      })
    }

    connection = await createConnection()
    console.log('📊 Database connected')

    // Get branch manager information with branch details
    const [branchManagers] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.manager_username,
        bm.branch_id,
        bm.first_name,
        bm.last_name,
        bm.email,
        bm.status,
        bm.created_at,
        b.area,
        b.location,
        b.branch_name
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.branch_manager_id = ? AND bm.status = ?`,
      [decoded.branchManagerId, 'Active'],
    )

    console.log('📋 Query result:', branchManagers.length, 'records found')

    if (branchManagers.length === 0) {
      console.log('❌ Branch manager not found in database')
      return res.status(404).json({
        success: false,
        message: 'Branch manager not found',
      })
    }

    const branchManager = branchManagers[0]
    console.log('✅ Branch manager found:', branchManager.branch_username)

    res.json({
      success: true,
      message: 'Branch manager information retrieved successfully',
      branchManager: {
        id: branchManager.branch_manager_id,
        username: branchManager.manager_username,
        branchId: branchManager.branch_id,
        area: branchManager.area,              // From branch table
        location: branchManager.location,      // From branch table
        branchName: branchManager.branch_name, // From branch table
        firstName: branchManager.first_name,
        lastName: branchManager.last_name,
        email: branchManager.email,
        status: branchManager.status,
        fullName: `${branchManager.first_name} ${branchManager.last_name}`,
        designation: `${branchManager.area} - ${branchManager.location} Manager`,
        role: 'Branch Manager',
      },
    })
  } catch (error) {
    console.error('Get branch manager info error:', error)

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}