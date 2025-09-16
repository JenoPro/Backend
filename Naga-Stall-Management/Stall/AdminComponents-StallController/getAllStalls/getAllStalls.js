import { createConnection } from '../../../config/database.js'

// Get all stalls for the authenticated branch manager
export const getAllStalls = async (req, res) => {
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

    console.log('Fetching stalls for branch manager ID:', branchManagerId)

    // Query stalls with proper relationship through section -> floor -> branch -> branch_manager
    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name,
        sec.section_code,
        f.floor_name,
        f.floor_number,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        b.area,
        b.location as branch_location,
        b.branch_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE bm.branch_manager_id = ?
      ORDER BY s.created_at DESC
    `,
      [branchManagerId],
    )

    console.log(`Found ${stalls.length} stalls for branch manager ID: ${branchManagerId}`)
    
    // Debug: Check what stall IDs we're getting
    console.log('🔍 Stall IDs retrieved:', stalls.map(s => ({ id: s.stall_id, no: s.stall_no })))

    res.json({
      success: true,
      message: 'Stalls retrieved successfully',
      data: stalls,
      branchManagerId: branchManagerId,
      count: stalls.length,
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