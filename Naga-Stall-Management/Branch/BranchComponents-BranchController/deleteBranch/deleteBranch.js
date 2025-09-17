import { createConnection } from '../../../config/database.js'

// Delete branch
export const deleteBranch = async (req, res) => {
  try {
    const { id: branch_id } = req.params
    
    const connection = await createConnection()
    
    // Check if branch exists
    const [branchResult] = await connection.execute(
      'SELECT branch_id FROM branch WHERE branch_id = ?',
      [branch_id]
    )
    
    if (branchResult.length === 0) {
      await connection.end()
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      })
    }
    
    // Check if branch has any stalls (through sections -> floors -> branch)
    const [stallsResult] = await connection.execute(`
      SELECT COUNT(*) as stall_count 
      FROM stall s
      JOIN section sec ON s.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      WHERE f.branch_id = ?
    `, [branch_id])
    
    if (stallsResult[0].stall_count > 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with existing stalls. Please remove all stalls first.'
      })
    }
    
    // Delete branch (this will cascade delete managers, employees, floors, sections)
    await connection.execute('DELETE FROM branch WHERE branch_id = ?', [branch_id])
    
    await connection.end()
    
    res.json({
      success: true,
      message: 'Branch deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting branch:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    })
  }
}