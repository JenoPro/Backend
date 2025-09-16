import { createConnection } from '../../../config/database.js'

// Get all stalls (for landing page)
export const getAllStalls = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    const [stalls] = await connection.execute(`
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