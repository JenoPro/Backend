import { createConnection } from '../../../config/database.js'

// Get filtered stalls
export const getFilteredStalls = async (req, res) => {
  let connection
  try {
    const { area, location, section, search, minPrice, maxPrice, sortBy = 'default', limit = 50 } = req.query

    connection = await createConnection()

    let query = `
      SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name as section,
        sec.section_code,
        f.floor_name as floor,
        f.floor_number,
        bm.area,
        bm.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
      WHERE s.status = 'Active' AND s.is_available = 1
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
      query += ' AND sec.section_name = ?'
      queryParams.push(section)
    }

    // Search filter
    if (search) {
      query += ` AND (
        s.stall_no LIKE ? OR 
        s.stall_location LIKE ? OR 
        s.description LIKE ? OR
        bm.area LIKE ? OR
        bm.location LIKE ?
      )`
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Price range filters
    if (minPrice && !isNaN(minPrice)) {
      query += ' AND s.rental_price >= ?'
      queryParams.push(parseFloat(minPrice))
    }

    if (maxPrice && !isNaN(maxPrice)) {
      query += ' AND s.rental_price <= ?'
      queryParams.push(parseFloat(maxPrice))
    }

    // Sorting
    let orderBy = 's.created_at DESC'
    if (sortBy === 'price-low') {
      orderBy = 's.rental_price ASC'
    } else if (sortBy === 'price-high') {
      orderBy = 's.rental_price DESC'
    } else if (sortBy === 'newest') {
      orderBy = 's.created_at DESC'
    } else if (sortBy === 'oldest') {
      orderBy = 's.created_at ASC'
    }

    query += ` ORDER BY ${orderBy} LIMIT ?`
    queryParams.push(parseInt(limit))

    const [stalls] = await connection.execute(query, queryParams)

    res.json({
      success: true,
      message: 'Filtered stalls retrieved successfully',
      data: stalls,
      filters: {
        area,
        location,
        section,
        search,
        minPrice,
        maxPrice,
        sortBy,
        limit,
      },
      count: stalls.length,
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