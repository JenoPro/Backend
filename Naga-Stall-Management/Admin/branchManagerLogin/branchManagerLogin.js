import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import process from 'process'
import { createConnection } from '../../config/database.js'

const { compare } = bcrypt
const { sign } = jwt

// Branch Manager Login controller with extensive debugging
export async function branchManagerLogin(req, res) {
  let connection

  try {
    const { username, password, area, location } = req.body

    console.log('🔐 Branch Manager login attempt:')
    console.log('- Username:', username)
    console.log('- Area:', area)
    console.log('- Location:', location)
    console.log('- Password length:', password ? password.length : 'undefined')

    // Validation
    if (!username || !password || !area || !location) {
      console.log('❌ Missing required fields')
      return res.status(400).json({
        success: false,
        message: 'Username, password, area, and location are required',
      })
    }

    connection = await createConnection()

    // Query branch_manager table using naga_stall database structure
    console.log('🔍 Searching for branch manager with:')
    console.log('- Username:', username)
    console.log('- Area:', area)
    console.log('- Location:', location)

    const [branchManagers] = await connection.execute(
      `SELECT 
        branch_manager_id, 
        branch_username, 
        branch_password_hash, 
        area, 
        location, 
        first_name, 
        last_name, 
        email, 
        status 
      FROM branch_manager 
      WHERE branch_username = ? 
        AND area = ? 
        AND location = ? 
        AND status = ?`,
      [username, area, location, 'Active'],
    )

    console.log('🔍 Query results: Found', branchManagers.length, 'branch managers')

    if (branchManagers.length === 0) {
      console.log('❌ No branch manager found with these credentials')
      console.log('🔍 Let me check what branch managers exist in the database...')

      // Debug: Show all branch managers
      const [allManagers] = await connection.execute(
        'SELECT branch_username, area, location, status FROM branch_manager',
      )
      console.log('📋 All branch managers in database:')
      allManagers.forEach((manager, index) => {
        console.log(
          `   ${index + 1}. ${manager.branch_username} - ${manager.area} - ${manager.location} (${manager.status})`,
        )
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or branch not found',
      })
    }

    const branchManager = branchManagers[0]

    console.log('👤 Branch Manager found:')
    console.log('- ID:', branchManager.branch_manager_id)
    console.log('- Username:', branchManager.branch_username)
    console.log('- Name:', branchManager.first_name, branchManager.last_name)
    console.log('- Area:', branchManager.area)
    console.log('- Location:', branchManager.location)
    console.log('- Status:', branchManager.status)
    console.log('- Password hash:', branchManager.branch_password_hash)

    // Enhanced password verification with debugging
    console.log('🔐 Starting password verification...')
    console.log('- Input password:', password)
    console.log('- Stored hash:', branchManager.branch_password_hash)
    console.log('- Hash format valid:', branchManager.branch_password_hash.startsWith('$2b$'))

    const isPasswordValid = await compare(password, branchManager.branch_password_hash)
    console.log('🔐 Password comparison result:', isPasswordValid)

    // If password fails, test common passwords for debugging
    if (!isPasswordValid) {
      console.log('🧪 Password failed. Testing common passwords for debugging:')
      const testPasswords = ['password123', 'admin123', 'manager123', '123456', 'password']

      for (const testPwd of testPasswords) {
        const testResult = await compare(testPwd, branchManager.branch_password_hash)
        console.log(`   Testing "${testPwd}": ${testResult ? '✅ MATCH!' : '❌ No match'}`)
        if (testResult) {
          console.log(`   🎉 The correct password is: "${testPwd}"`)
          break
        }
      }

      console.log('❌ Invalid password for user:', username)
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
        userId: branchManager.branch_manager_id,
        username: branchManager.branch_username,
        userType: 'branch_manager',
        area: branchManager.area,
        location: branchManager.location,
        branchManagerId: branchManager.branch_manager_id,
      },
      jwtSecret,
      { expiresIn: '24h' },
    )

    console.log('✅ Branch Manager login successful for user:', branchManager.branch_username)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: branchManager.branch_manager_id,
          username: branchManager.branch_username,
          firstName: branchManager.first_name,
          lastName: branchManager.last_name,
          email: branchManager.email,
          area: branchManager.area,
          location: branchManager.location,
          userType: 'branch_manager',
          branchManagerId: branchManager.branch_manager_id,
        },
      },
    })
  } catch (error) {
    console.error('❌ Branch Manager login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}