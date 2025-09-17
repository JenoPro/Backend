import bcrypt from 'bcrypt'
import { createConnection } from '../../../config/database.js'

const { hash } = bcrypt

// Create Admin User controller
export async function createAdminUser(req, res) {
  let connection

  try {
    const { username, password, email } = req.body

    console.log('👤 Creating admin user:', username)

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      })
    }

    connection = await createConnection()

    // Check if admin already exists
    const [existingAdmin] = await connection.execute(
      'SELECT admin_id FROM admin WHERE admin_username = ?',
      [username],
    )

    if (existingAdmin.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Admin user already exists',
      })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await hash(password, saltRounds)

    // Insert new admin
    const [result] = await connection.execute(
      'INSERT INTO admin (admin_username, admin_password_hash, email, status) VALUES (?, ?, ?, ?)',
      [username, passwordHash, email || null, 'Active'],
    )

    console.log('✅ Admin user created successfully:', username)

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: result.insertId,
        username: username,
        email: email || null,
      },
    })
  } catch (error) {
    console.error('❌ Create admin user error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}