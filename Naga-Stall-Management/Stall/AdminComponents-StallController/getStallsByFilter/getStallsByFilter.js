import { createConnection } from '../../../config/database.js'

// Get stalls by filter (for the authenticated branch manager)
export const getStallsByFilter = async (req, res) => {
  let connection
  try {
    const { location, status, search, minPrice, maxPrice, floor, section } = req.query
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    let query = `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.branch_manager_id = ?
    `
    const queryParams = [branchManagerId]

    // Location filter
    if (location) {
      query += ' AND s.stall_location = ?'
      queryParams.push(location)
    }

    // Status filter
    if (status) {
      query += ' AND s.status = ?'
      queryParams.push(status)
    }

    // Floor filter (simple text field)
    if (floor) {
      query += ' AND s.floor = ?'
      queryParams.push(floor)
    }

    // Section filter (simple text field)
    if (section) {
      query += ' AND s.section = ?'
      queryParams.push(section)
    }

    // Search filter (search in stall number, location, description, floor, section)
    if (search) {
      query += ` AND (
        s.stall_no LIKE ? OR 
        s.stall_location LIKE ? OR 
        s.description LIKE ? OR
        s.floor LIKE ? OR
        s.section LIKE ?
      )`
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Price range filter
    if (minPrice !== undefined && !isNaN(minPrice)) {
      query += ' AND s.rental_price >= ?'
      queryParams.push(parseFloat(minPrice))
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      query += ' AND s.rental_price <= ?'
      queryParams.push(parseFloat(maxPrice))
    }

    query += ' ORDER BY s.created_at DESC'

    const [stalls] = await connection.execute(query, queryParams)

    res.json({
      success: true,
      message: 'Stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
      filters: {
        location,
        status,
        search,
        minPrice,
        maxPrice,
        floor,
        section,
      },
    })
  } catch (error) {
    console.error('❌ Get stalls by filter error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}