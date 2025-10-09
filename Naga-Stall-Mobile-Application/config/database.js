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

console.log('🔧 Mobile App Database Config:', {
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
    console.error('❌ Mobile App Database connection failed:', error)
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
      message: 'Mobile App Database connection successful',
      config: {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
      },
    }
  } catch (error) {
    console.error('Mobile App Database test failed:', error)
    return {
      success: false,
      message: 'Mobile App Database connection failed',
      error: error.message,
    }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

export default dbConfig