import jwt from 'jsonwebtoken'
import { createConnection } from '../../config/database.js'

const { verify } = jwt

// Get Branch Manager Info controller
export async function getBranchManagerInfo(req, res) {
  let connection

  try {
    // Get the token from authorization header
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      })
    }

    // Verify token
    const jwtSecret =
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    const decoded = verify(token, jwtSecret)

    if (decoded.userType !== 'branch_manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Branch manager role required.',
      })
    }

    connection = await createConnection()

    // Get branch manager information
    const [branchManagers] = await connection.execute(
      `SELECT 
        branch_manager_id,
        branch_username,
        area,
        location,
        first_name,
        last_name,
        email,
        status,
        created_at
      FROM branch_manager 
      WHERE branch_manager_id = ? AND status = ?`,
      [decoded.branchManagerId, 'Active'],
    )

    if (branchManagers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch manager not found',
      })
    }

    const branchManager = branchManagers[0]

    res.json({
      success: true,
      message: 'Branch manager information retrieved successfully',
      data: {
        id: branchManager.branch_manager_id,
        username: branchManager.branch_username,
        area: branchManager.area,
        location: branchManager.location,
        firstName: branchManager.first_name,
        lastName: branchManager.last_name,
        email: branchManager.email,
        status: branchManager.status,
        fullName: `${branchManager.first_name} ${branchManager.last_name}`,
        designation: `${branchManager.area} - ${branchManager.location} Manager`,
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