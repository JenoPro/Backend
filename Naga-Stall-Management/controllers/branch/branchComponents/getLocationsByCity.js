import { createConnection } from '../../../config/database.js'

// Get locations within a city
export const getLocationsByCity = async (req, res) => {
  let connection
  try {
    const { city } = req.params
    connection = await createConnection()

    const [locations] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name
      FROM branch_manager
      WHERE area = ? AND status = 'Active'
      ORDER BY location
    `,
      [city],
    )

    res.json({
      success: true,
      data: locations,
      message: `Locations in ${city} retrieved successfully`,
    })
  } catch (error) {
    console.error('Error fetching locations by city:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}