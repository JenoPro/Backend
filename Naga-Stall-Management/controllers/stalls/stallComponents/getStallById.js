import { createConnection } from '../../../config/database.js'

// Get stall by ID (only if it belongs to the authenticated branch manager)
export const getStallById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      });
    }

    connection = await createConnection();

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
      WHERE s.stall_id = ? AND bm.branch_manager_id = ?`,
      [id, branchManagerId]
    );

    if (stalls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to view it',
      });
    }

    res.json({
      success: true,
      message: 'Stall retrieved successfully',
      data: stalls[0]
    });

  } catch (error) {
    console.error('❌ Get stall by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stall',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};