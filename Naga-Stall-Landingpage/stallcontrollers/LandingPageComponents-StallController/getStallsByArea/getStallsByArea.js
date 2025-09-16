import { createConnection } from '../../../config/database.js'

// Get stalls by area
export const getStallsByArea = async (req, res) => {
  let connection
  try {
    const { area } = req.query

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required',
      })
    }

    connection = await createConnection()

    const [stalls] = await connection.execute(
      `
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
      WHERE bm.area = ? AND s.status = 'Active' AND s.is_available = 1
      ORDER BY s.created_at DESC
    `,
      [area],
    )

    res.json({
      success: true,
      message: `Stalls in ${area} retrieved successfully`,
      data: stalls,
      area: area,
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