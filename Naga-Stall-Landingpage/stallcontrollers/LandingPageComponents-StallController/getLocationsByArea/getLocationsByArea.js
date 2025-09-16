import { createConnection } from '../../../config/database.js'

// Get locations by area
export const getLocationsByArea = async (req, res) => {
  let connection
  try {
    console.log('🐛 DEBUG getLocationsByArea called')
    console.log('🐛 req.query:', req.query)
    console.log('🐛 req.params:', req.params)
    console.log('🐛 Full request URL:', req.url)
    
    const { area } = req.query
    console.log('🐛 Extracted area:', area, typeof area)

    if (!area) {
      console.log('❌ No area parameter provided')
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required',
      })
    }

    connection = await createConnection()

    const [locations] = await connection.execute(
      'SELECT DISTINCT location FROM branch_manager WHERE area = ? AND status = "Active" ORDER BY location',
      [area],
    )

    // Format the data - frontend might expect objects with location property
    const locationList = locations.map((row) => ({
      location: row.location,
      value: row.location
    }))
    console.log('✅ Found locations:', locationList.map(l => l.location))

    res.json({
      success: true,
      message: `Locations in ${area} retrieved successfully`,
      data: locationList,
      area: area,
    })
  } catch (error) {
    console.error('❌ Get locations by area error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve locations',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}