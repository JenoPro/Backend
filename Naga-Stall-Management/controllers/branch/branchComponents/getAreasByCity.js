import { createConnection } from '../../../config/database.js'

// Get areas by city
export const getAreasByCity = async (req, res) => {
  let connection
  try {
    const { city } = req.params
    connection = await createConnection()

    const [areas] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE area = ? AND status = 'Active'
      ORDER BY location
    `,
      [city],
    )

    if (areas.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No areas found for city: ${city}`,
      })
    }

    res.json({
      success: true,
      data: areas,
      message: `Areas in ${city} retrieved successfully`,
    })
  } catch (error) {
    console.error('Error fetching areas by city:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch areas by city',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}