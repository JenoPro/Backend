import { createConnection } from '../../../config/database.js'

// Get unique cities
export const getCities = async (req, res) => {
  let connection
  try {
    connection = await createConnection()
    const [cities] = await connection.execute(`
      SELECT DISTINCT area as city, COUNT(*) as branch_count
      FROM branch_manager
      WHERE status = 'Active'
      GROUP BY area
      ORDER BY area
    `)

    res.json({
      success: true,
      data: cities,
      message: 'Cities retrieved successfully',
    })
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}