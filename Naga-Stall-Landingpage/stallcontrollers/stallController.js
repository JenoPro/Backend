import { createConnection } from '../config/database.js'

// Get all stalls (for landing page)
export const getAllStalls = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    const [stalls] = await connection.execute(`
      SELECT 
        s.*,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.status = 'Active'
      ORDER BY s.created_at DESC
    `)

    res.json({
      success: true,
      message: 'Available stalls retrieved successfully',
      data: stalls,
    })
  } catch (error) {
    console.error('❌ Get stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get stall by ID
export const getStallById = async (req, res) => {
  let connection
  try {
    const { id } = req.params
    connection = await createConnection()

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ? AND s.status = 'Active'
    `,
      [id],
    )

    if (stalls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or not available',
      })
    }

    res.json({
      success: true,
      message: 'Stall retrieved successfully',
      data: stalls[0],
    })
  } catch (error) {
    console.error('❌ Get stall by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stall',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get available areas (NEW)
export const getAvailableAreas = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    const [areas] = await connection.execute(`
      SELECT DISTINCT bm.area, COUNT(s.stall_id) as stall_count
      FROM branch_manager bm
      LEFT JOIN stall s ON bm.branch_manager_id = s.branch_manager_id 
        AND s.status = 'Active'
      WHERE bm.status = 'Active'
      GROUP BY bm.area
      ORDER BY bm.area
    `)

    res.json({
      success: true,
      message: 'Available areas retrieved successfully',
      data: areas,
    })
  } catch (error) {
    console.error('❌ Get available areas error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available areas',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get stalls by area (NEW)
export const getStallsByArea = async (req, res) => {
  let connection
  try {
    const { area } = req.query
    connection = await createConnection()

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required',
      })
    }

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE bm.area = ? AND s.status = 'Active'
      ORDER BY s.created_at DESC
    `,
      [area]
    )

    res.json({
      success: true,
      message: `Stalls in ${area} retrieved successfully`,
      data: stalls,
      count: stalls.length,
      filters: { area },
    })
  } catch (error) {
    console.error('❌ Get stalls by area error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls by area',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get locations within an area (NEW)
export const getLocationsByArea = async (req, res) => {
  let connection
  try {
    const { area } = req.query
    connection = await createConnection()

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required',
      })
    }

    const [locations] = await connection.execute(
      `
      SELECT DISTINCT bm.location, COUNT(s.stall_id) as stall_count
      FROM branch_manager bm
      LEFT JOIN stall s ON bm.branch_manager_id = s.branch_manager_id 
        AND s.status = 'Active'
      WHERE bm.area = ? AND bm.status = 'Active'
      GROUP BY bm.location
      ORDER BY bm.location
    `,
      [area]
    )

    res.json({
      success: true,
      message: `Locations in ${area} retrieved successfully`,
      data: locations,
    })
  } catch (error) {
    console.error('❌ Get locations by area error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve locations by area',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get filtered stalls (NEW - Enhanced filtering)
export const getFilteredStalls = async (req, res) => {
  let connection
  try {
    const { area, location, section, minPrice, maxPrice, search } = req.query
    connection = await createConnection()

    let query = `
      SELECT 
        s.*,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.status = 'Active'
    `
    const queryParams = []

    // Area filter
    if (area) {
      query += ' AND bm.area = ?'
      queryParams.push(area)
    }

    // Location filter
    if (location) {
      query += ' AND bm.location = ?'
      queryParams.push(location)
    }

    // Section filter
    if (section) {
      query += ' AND s.section = ?'
      queryParams.push(section)
    }

    // Price range filters
    if (minPrice !== undefined && !isNaN(minPrice)) {
      query += ' AND s.rental_price >= ?'
      queryParams.push(parseFloat(minPrice))
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      query += ' AND s.rental_price <= ?'
      queryParams.push(parseFloat(maxPrice))
    }

    // Search filter
    if (search) {
      query += ` AND (
        s.stall_no LIKE ? OR 
        s.stall_location LIKE ? OR 
        s.description LIKE ? OR
        s.section LIKE ? OR
        s.floor LIKE ?
      )`
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    query += ' ORDER BY s.created_at DESC'

    const [stalls] = await connection.execute(query, queryParams)

    res.json({
      success: true,
      message: 'Filtered stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
      filters: { area, location, section, minPrice, maxPrice, search },
    })
  } catch (error) {
    console.error('❌ Get filtered stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filtered stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Legacy routes for backward compatibility
export const getStallsByLocation = async (req, res) => {
  let connection
  try {
    const { location } = req.query
    connection = await createConnection()

    let query = `
      SELECT 
        s.*,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.status = 'Active'
    `
    const queryParams = []

    if (location && location !== 'all') {
      query += ' AND bm.location = ?'
      queryParams.push(location)
    }

    query += ' ORDER BY s.created_at DESC'

    const [stalls] = await connection.execute(query, queryParams)

    res.json({
      success: true,
      message: 'Stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
      filters: { location },
    })
  } catch (error) {
    console.error('❌ Get stalls by location error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

export const getAvailableMarkets = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    const [markets] = await connection.execute(`
      SELECT DISTINCT bm.location as market, COUNT(s.stall_id) as stall_count
      FROM branch_manager bm
      LEFT JOIN stall s ON bm.branch_manager_id = s.branch_manager_id 
        AND s.status = 'Active'
      WHERE bm.status = 'Active'
      GROUP BY bm.location
      ORDER BY bm.location
    `)

    res.json({
      success: true,
      message: 'Available markets retrieved successfully',
      data: markets,
    })
  } catch (error) {
    console.error('❌ Get available markets error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available markets',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}