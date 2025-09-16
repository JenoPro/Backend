import { createConnection } from '../../../config/database.js'

// Get available stalls only (for the authenticated branch manager)
export const getAvailableStalls = async (req, res) => {
  let connection
  try {
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*, 
        bm.area, 
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.branch_manager_id = ? AND s.status = 'Active' AND s.is_available = 1
      ORDER BY s.stall_location, s.stall_no
    `,
      [branchManagerId],
    )

    res.json({
      success: true,
      message: 'Available stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
    })
  } catch (error) {
    console.error('❌ Get available stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}