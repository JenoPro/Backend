import { createConnection } from '../../../config/database.js'

// Get available stalls for the authenticated branch manager
export const getAvailableStalls = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      });
    }

    const [stalls] = await connection.execute(
      `SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name,
        f.floor_name,
        b.branch_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE bm.branch_manager_id = ? AND s.is_available = 1
      ORDER BY s.created_at DESC`,
      [branchManagerId]
    );

    res.json({
      success: true,
      message: 'Available stalls retrieved successfully',
      data: stalls,
      count: stalls.length
    });

  } catch (error) {
    console.error('❌ Get available stalls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available stalls',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};