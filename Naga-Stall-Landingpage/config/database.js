import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import process from 'process'

const { hash } = bcrypt
const { createConnection: _createConnection } = mysql

// Database configuration
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'naga_stall',
}

console.log('🔧 Database Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  passwordSet: !!dbConfig.password,
})

// Create database connection
export async function createConnection() {
  try {
    const connection = await _createConnection(dbConfig)
    console.log('✅ Connected to MySQL database')
    return connection
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    throw error
  }
}

// Initialize database and tables
export async function initializeDatabase() {
  let connection
  let dbConnection

  try {
    // First connect without database to create it
    connection = await _createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    })

    console.log('🔧 Creating database if not exists...')
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`)
    await connection.end()

    // Now connect to the specific database
    dbConnection = await _createConnection(dbConfig)

    // Since your tables already exist from the SQL dump, we just need to check/update admin
    console.log('🔧 Checking existing database structure...')

    // Check if admin user exists (using correct column names from your schema)
    const [existingAdmin] = await dbConnection.execute('SELECT * FROM admin WHERE admin_username = ?', [
      'admin',
    ])

    if (existingAdmin.length === 0) {
      console.log('🔧 Creating default admin user...')
      const hashedPassword = await hash('admin123', 12)

      await dbConnection.execute(
        'INSERT INTO admin (admin_username, admin_password_hash, email, status) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@nagastall.com', 'Active'],
      )

      console.log('✅ Default admin user created successfully!')
    } else {
      console.log('✅ Admin user already exists')

      // Update the password to ensure it works
      console.log('🔧 Updating admin password to ensure compatibility...')
      const hashedPassword = await hash('admin123', 12)
      await dbConnection.execute('UPDATE admin SET admin_password_hash = ? WHERE admin_username = ?', [
        hashedPassword,
        'admin',
      ])
      console.log('✅ Admin password updated!')
    }

    // Check stalls count (using correct table name from your schema)
    const [existingStalls] = await dbConnection.execute('SELECT COUNT(*) as count FROM stall')
    console.log(`📊 Current stalls in database: ${existingStalls[0].count}`)

    console.log('📋 Login Credentials:')
    console.log('   Username: admin')
    console.log('   Password: admin123')
    console.log('✅ Database initialization completed!')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    if (dbConnection) await dbConnection.end()
  }
}

// Test database connection
export async function testConnection() {
  let connection
  try {
    connection = await createConnection()
    
    // Use correct table names from your schema
    const [adminRows] = await connection.execute('SELECT COUNT(*) as count FROM admin')
    const [stallRows] = await connection.execute('SELECT COUNT(*) as count FROM stall')

    return {
      success: true,
      message: 'Database connection successful',
      adminCount: adminRows[0].count,
      stallCount: stallRows[0].count,
    }
  } catch (error) {
    console.error('Database test error:', error)
    throw error
  } finally {
    if (connection) await connection.end()
  }
}