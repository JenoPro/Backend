import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import process from 'process'
import { createConnection } from '../../config/database.js'

const { compare } = bcrypt
const { sign } = jwt

// Branch Manager Login controller - simplified to only require username and password
export async function branchManagerLogin(req, res) {
  let connection

  try {
    const { username, password } = req.body

    console.log('🔐 Branch Manager login attempt:')
    console.log('- Username:', username)
    console.log('- Password length:', password ? password.length : 'undefined')

    // Validation - only username and password required
    if (!username || !password) {
      console.log('❌ Missing required fields')
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    connection = await createConnection()

    // Query branch_manager table with JOIN to branch table for area/location
    console.log('🔍 Searching for branch manager with username:', username)

    const [branchManagers] = await connection.execute(
      `SELECT 
        bm.branch_manager_id, 
        bm.manager_username, 
        bm.manager_password_hash, 
        bm.branch_id,
        bm.first_name, 
        bm.last_name, 
        bm.email, 
        bm.status,
        b.area,
        b.location,
        b.branch_name
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.manager_username = ? AND bm.status = ?`,
      [username, 'Active'],
    )

    console.log('🔍 Query results: Found', branchManagers.length, 'branch managers')

    if (branchManagers.length === 0) {
      console.log('❌ No branch manager found with username:', username)
      console.log('🔍 Let me check what branch managers exist in the database...')

      // Debug: Show all branch managers
      const [allManagers] = await connection.execute(
        `SELECT 
          bm.manager_username, 
          bm.status,
          b.area,
          b.location,
          b.branch_name
        FROM branch_manager bm
        INNER JOIN branch b ON bm.branch_id = b.branch_id`
      )
      console.log('📋 All branch managers in database:')
      allManagers.forEach((manager, index) => {
        console.log(
          `   ${index + 1}. ${manager.manager_username} - ${manager.branch_name} (${manager.area} - ${manager.location}) [${manager.status}]`,
        )
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid username or user not found',
      })
    }

    const branchManager = branchManagers[0]

    console.log('👤 Branch Manager found:')
    console.log('- ID:', branchManager.branch_manager_id)
    console.log('- Username:', branchManager.manager_username)
    console.log('- Name:', branchManager.first_name, branchManager.last_name)
    console.log('- Branch:', branchManager.branch_name)
    console.log('- Area:', branchManager.area, '(automatically detected)')
    console.log('- Location:', branchManager.location, '(automatically detected)')
    console.log('- Status:', branchManager.status)

    // Enhanced password verification with debugging
    console.log('🔐 Starting password verification...')
    console.log('- Input password provided:', !!password)
    console.log('- Hash format valid:', branchManager.manager_password_hash?.startsWith('$2b$'))

    const isPasswordValid = await compare(password, branchManager.manager_password_hash)
    console.log('🔐 Password comparison result:', isPasswordValid)

    // If password fails, test common passwords for debugging
    if (!isPasswordValid) {
      console.log('🧪 Password failed. Testing common passwords for debugging:')
      const testPasswords = ['password123', 'admin123', 'manager123', '123456', 'password']

      for (const testPwd of testPasswords) {
        const testResult = await compare(testPwd, branchManager.manager_password_hash)
        console.log(`   Testing "${testPwd}": ${testResult ? '✅ MATCH!' : '❌ No match'}`)
        if (testResult) {
          console.log(`   🎉 The correct password is: "${testPwd}"`)
          break
        }
      }

      console.log('❌ Invalid password for user:', username)
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      })
    }

    // Generate JWT token
    const jwtSecret =
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

    const token = sign(
      {
        userId: branchManager.branch_manager_id,
        username: branchManager.manager_username,
        userType: 'branch_manager',
        area: branchManager.area,
        location: branchManager.location,
        branchManagerId: branchManager.branch_manager_id,
      },
      jwtSecret,
      { expiresIn: '24h' },
    )

    console.log('✅ Branch Manager login successful!')
    console.log('📍 User details automatically retrieved from database:')
    console.log('- Area:', branchManager.area)
    console.log('- Location:', branchManager.location)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: branchManager.branch_manager_id,
          username: branchManager.manager_username,
          firstName: branchManager.first_name,
          lastName: branchManager.last_name,
          email: branchManager.email,
          area: branchManager.area,           // Automatically from database
          location: branchManager.location,   // Automatically from database
          branchName: branchManager.branch_name, // Branch name from database
          userType: 'branch_manager',
          branchManagerId: branchManager.branch_manager_id,
          fullName: `${branchManager.first_name} ${branchManager.last_name}`,
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