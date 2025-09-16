import { createConnection } from '../../config/database.js'

// Get available areas from branch_manager table
export async function getAreas(req, res) {
  let connection

  try {
    connection = await createConnection()

    // Get distinct areas from branch_manager table
    const [areas] = await connection.execute(
      'SELECT DISTINCT area FROM branch_manager WHERE status = ? ORDER BY area ASC',
      ['Active'],
    )

    console.log('🏙️ Found areas:', areas.length)

    res.json({
      success: true,
      message: 'Areas retrieved successfully',
      data: areas.map((row) => row.area),
    })
  } catch (error) {
    console.error('❌ Get areas error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}