import { createConnection } from '../config/database.js'

// Get all areas and locations from branch managers
export async function getAllAreas(req, res) {
  let connection
  try {
    connection = await createConnection()
    const [areas] = await connection.execute(`
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE status = 'Active'
      ORDER BY area, location
    `)

    res.json({
      success: true,
      data: areas,
      message: 'Areas retrieved successfully',
    })
  } catch (error) {
    console.error('Error fetching areas:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch areas',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get areas by city
export async function getAreasByCity(req, res) {
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

// Get area by ID (branch manager by ID)
export async function getAreaById(req, res) {
  let connection
  try {
    const { id } = req.params
    connection = await createConnection()

    const [areas] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        first_name,
        last_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE branch_manager_id = ? AND status = 'Active'
    `,
      [id],
    )

    if (areas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Area not found',
      })
    }

    // Get statistics for this area
    const [floorCount] = await connection.execute(
      'SELECT COUNT(*) as floor_count FROM floor WHERE branch_manager_id = ?',
      [id],
    )

    const [sectionCount] = await connection.execute(
      `SELECT COUNT(*) as section_count 
       FROM section s
       JOIN floor f ON s.floor_id = f.floor_id
       WHERE f.branch_manager_id = ?`,
      [id],
    )

    const [stallCount] = await connection.execute(
      `SELECT COUNT(*) as stall_count 
       FROM stall st
       JOIN section s ON st.section_id = s.section_id
       JOIN floor f ON s.floor_id = f.floor_id
       WHERE f.branch_manager_id = ?`,
      [id],
    )

    const areaData = {
      ...areas[0],
      stats: {
        floor_count: floorCount[0].floor_count,
        section_count: sectionCount[0].section_count,
        stall_count: stallCount[0].stall_count,
      },
    }

    res.json({
      success: true,
      data: areaData,
      message: 'Area retrieved successfully',
    })
  } catch (error) {
    console.error('Error fetching area by ID:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch area',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get unique cities
export async function getCities(req, res) {
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

// Get locations within a city
export async function getLocationsByCity(req, res) {
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

// Get floors for the authenticated branch manager
export async function getFloors(req, res) {
  let connection
  try {
    connection = await createConnection()

    // Get the branch manager ID from the authenticated user
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    const [floors] = await connection.execute(
      `
      SELECT 
        f.floor_id,
        f.floor_name,
        f.floor_number,
        f.status,
        f.created_at,
        f.updated_at
      FROM floor f
      WHERE f.branch_manager_id = ? AND f.status = 'Active'
      ORDER BY f.floor_number ASC
    `,
      [branchManagerId],
    )

    res.json({
      success: true,
      data: floors,
      message: 'Floors retrieved successfully',
      branchManagerId: branchManagerId,
      count: floors.length,
    })
  } catch (error) {
    console.error('Error fetching floors:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch floors',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get sections for the authenticated branch manager
export async function getSections(req, res) {
  let connection
  try {
    connection = await createConnection()

    // Get the branch manager ID from the authenticated user
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    const [sections] = await connection.execute(
      `
      SELECT 
        s.section_id,
        s.section_name,
        s.section_code,
        s.status,
        s.created_at,
        s.updated_at,
        f.floor_name,
        f.floor_number
      FROM section s
      INNER JOIN floor f ON s.floor_id = f.floor_id
      WHERE f.branch_manager_id = ? AND s.status = 'Active'
      ORDER BY f.floor_number ASC, s.section_name ASC
    `,
      [branchManagerId],
    )

    res.json({
      success: true,
      data: sections,
      message: 'Sections retrieved successfully',
      branchManagerId: branchManagerId,
      count: sections.length,
    })
  } catch (error) {
    console.error('Error fetching sections:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}