import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import process from 'process'
import { createConnection } from '../../../config/database.js'

const { compare } = bcrypt
const { sign } = jwt

// Admin Login controller
export async function adminLogin(req, res) {
  let connection

  try {
    const { username, password } = req.body

    console.log('🔐 Admin login attempt for username:', username)

    // Validation
    if (!username || !password) {
      console.log('❌ Missing username or password')
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    connection = await createConnection()

    // Query admin table
    const [admins] = await connection.execute(
      'SELECT admin_id, admin_username, admin_password_hash, email, status FROM admin WHERE admin_username = ? AND status = ?',
      [username, 'Active'],
    )

    console.log('🔍 Found admins:', admins.length)

    if (admins.length === 0) {
      console.log('❌ No admin found with username:', username)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const admin = admins[0]

    // Verify password
    const isPasswordValid = await compare(password, admin.admin_password_hash)

    if (!isPasswordValid) {
      console.log('❌ Invalid password for admin:', username)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    // Generate JWT token
    const jwtSecret =
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

    const token = sign(
      {
        userId: admin.admin_id,
        username: admin.admin_username,
        userType: 'admin',
        adminId: admin.admin_id,
      },
      jwtSecret,
      { expiresIn: '24h' },
    )

    console.log('✅ Admin login successful for user:', admin.admin_username)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin.admin_id,
          username: admin.admin_username,
          email: admin.email,
          userType: 'admin',
          adminId: admin.admin_id,
        },
      },
    })
  } catch (error) {
    console.error('❌ Admin login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}