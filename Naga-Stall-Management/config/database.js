import mysql from 'mysql2/promise'
import process from 'process'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'naga_stall',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

console.log('🔧 Database Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  passwordSet: !!dbConfig.password,
})

export async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    return connection
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

export async function testConnection() {
  let connection
  try {
    connection = await createConnection()
    await connection.execute('SELECT 1')
    return {
      success: true,
      message: 'Database connection successful',
      config: {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
      },
    }
  } catch (error) {
    console.error('Database test failed:', error)
    return {
      success: false,
      message: 'Database connection failed',
      error: error.message,
    }
  } finally {
    if (connection) await connection.end()
  }
}

export async function initializeDatabase() {
  let connection

  try {
    console.log('🔧 Creating database if not exists...')

    // Create connection without specifying database first
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    })

    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``)
    await tempConnection.end()

    // Now connect to the specific database
    connection = await createConnection()

    // Check if tables exist (they should since you imported the SQL dump)
    console.log('🔧 Verifying database tables...')

    const [adminTable] = await connection.execute(
      `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'admin'
    `,
      [dbConfig.database],
    )

    const [branchManagerTable] = await connection.execute(
      `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'branch_manager'
    `,
      [dbConfig.database],
    )

    const [stallTable] = await connection.execute(
      `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'stall'
    `,
      [dbConfig.database],
    )

    if (
      adminTable[0].count === 0 ||
      branchManagerTable[0].count === 0 ||
      stallTable[0].count === 0
    ) {
      console.log('⚠️ Required tables not found. Please import the SQL dump file first.')
      return
    }

    console.log('✅ All required tables exist')

    // Display available login credentials from your actual schema
    console.log('📋 Available Login Credentials:')

    try {
      const [branchManagers] = await connection.execute(`
        SELECT 
          bm.branch_manager_id,
          bm.manager_username, 
          bm.first_name,
          bm.last_name,
          bm.status,
          bm.branch_id,
          b.area,
          b.location,
          b.branch_name
        FROM branch_manager bm
        INNER JOIN branch b ON bm.branch_id = b.branch_id
        WHERE bm.status = 'Active'
        ORDER BY b.area, b.location, bm.manager_username
      `)

      if (branchManagers.length > 0) {
        console.log('   === BRANCH MANAGERS ===')
        branchManagers.forEach((manager, index) => {
          console.log(`   ${index + 1}. ${manager.first_name} ${manager.last_name}`)
          console.log(`      Username: ${manager.manager_username}`)
          console.log(`      Branch: ${manager.branch_name} (${manager.area} - ${manager.location})`)
          console.log(`      Status: ${manager.status}`)
          console.log('      ---')
        })
      } else {
        console.log('   No branch managers found. Please check your data.')
      }

      // Also check admin accounts
      const [admins] = await connection.execute(`
        SELECT 
          admin_id,
          admin_username, 
          email,
          status 
        FROM admin 
        WHERE status = 'Active'
        ORDER BY admin_username
      `)

      if (admins.length > 0) {
        console.log('   === ADMIN ACCOUNTS ===')
        admins.forEach((admin, index) => {
          console.log(`   ${index + 1}. Admin: ${admin.admin_username}`)
          console.log(`      Email: ${admin.email || 'Not set'}`)
          console.log(`      Status: ${admin.status}`)
          console.log('      Password: [encrypted - use original password]')
          console.log('')
        })
      }
    } catch (queryError) {
      console.error('❌ Error fetching login credentials:', queryError)
    }

    console.log('✅ Database initialization completed successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    if (connection) await connection.end()
  }
}
