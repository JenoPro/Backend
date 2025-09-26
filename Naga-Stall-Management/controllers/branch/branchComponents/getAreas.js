import { createConnection } from '../../../config/database.js'

// Get available areas
export const getAreas = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    
    const [areas] = await connection.execute(
      'SELECT DISTINCT area FROM branch WHERE status = "Active" ORDER BY area ASC'
    );
    
    res.json({
      success: true,
      data: areas.map(row => row.area),
      message: 'Areas retrieved successfully',
      count: areas.length
    });
    
  } catch (error) {
    console.error('❌ Get areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch areas',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};