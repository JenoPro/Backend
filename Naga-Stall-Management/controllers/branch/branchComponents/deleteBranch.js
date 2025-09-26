import { createConnection } from '../../../config/database.js'

// Delete branch
export const deleteBranch = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await createConnection();
    
    // Check if branch exists
    const [existingBranch] = await connection.execute(
      'SELECT branch_id, branch_name FROM branch WHERE branch_id = ?',
      [id]
    );
    
    if (existingBranch.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    // Check if branch has associated managers or stalls (optional validation)
    const [managers] = await connection.execute(
      'SELECT COUNT(*) as manager_count FROM branch_manager WHERE branch_id = ?',
      [id]
    );
    
    if (managers[0].manager_count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with assigned managers. Please reassign or remove managers first.'
      });
    }
    
    // Delete the branch
    await connection.execute('DELETE FROM branch WHERE branch_id = ?', [id]);
    
    console.log('✅ Branch deleted successfully:', existingBranch[0].branch_name);
    
    res.json({
      success: true,
      message: 'Branch deleted successfully',
      data: { id: id, branchName: existingBranch[0].branch_name }
    });
    
  } catch (error) {
    console.error('❌ Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};