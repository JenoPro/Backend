import { createConnection } from '../../../config/database.js'

// Get area by ID (branch manager by ID) with detailed statistics
export const getAreaById = async (req, res) => {
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