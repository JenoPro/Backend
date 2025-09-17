import { createConnection } from '../../../config/database.js'

// Get branches by area from branch_manager table
export async function getBranchesByArea(req, res) {
  let connection

  try {
    const { area } = req.params

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required',
      })
    }

    connection = await createConnection()

    // Get locations (branches) for specific area
    const [branches] = await connection.execute(
      'SELECT DISTINCT location FROM branch_manager WHERE area = ? AND status = ? ORDER BY location ASC',
      [area, 'Active'],
    )

    console.log('🏢 Found branches for area', area, ':', branches.length)

    res.json({
      success: true,
      message: 'Branches retrieved successfully',
      data: branches.map((row) => row.location),
    })
  } catch (error) {
    console.error('❌ Get branches error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}