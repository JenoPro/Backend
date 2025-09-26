import { createConnection } from '../../../config/database.js'

// Test database connection
export const testDb = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    
    const [rows] = await connection.execute('SELECT 1 as test');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: rows[0]
    });

  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};