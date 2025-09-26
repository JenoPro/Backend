import { createConnection } from '../../../config/database.js'

// Delete stall (only if it belongs to the authenticated branch manager)
export const deleteStall = async (req, res) => {
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

    // Check if stall exists and belongs to this branch manager
    const [existingStall] = await connection.execute(
      `SELECT s.stall_id, s.stall_no 
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE s.stall_id = ? AND bm.branch_manager_id = ?`,
      [id, branchManagerId]
    );

    if (existingStall.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to delete it',
      });
    }

    // Delete the stall
    await connection.execute('DELETE FROM stall WHERE stall_id = ?', [id]);

    console.log('✅ Stall deleted successfully:', existingStall[0].stall_no);

    res.json({
      success: true,
      message: 'Stall deleted successfully',
      data: { id: id, stallNumber: existingStall[0].stall_no }
    });

  } catch (error) {
    console.error('❌ Delete stall error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stall',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};