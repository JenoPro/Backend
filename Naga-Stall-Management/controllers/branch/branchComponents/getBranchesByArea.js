import { createConnection } from '../../../config/database.js'

// Get branches by area
export const getBranchesByArea = async (req, res) => {
  let connection;
  try {
    const { area } = req.params;
    
    connection = await createConnection();
    
    const [branches] = await connection.execute(
      `SELECT 
        b.*,
        CONCAT(bm.first_name, ' ', bm.last_name) as manager_name,
        bm.branch_manager_id,
        bm.manager_username
      FROM branch b
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE b.area = ?
      ORDER BY b.branch_name ASC`,
      [area]
    );
    
    res.json({
      success: true,
      data: branches,
      message: `Branches in ${area} retrieved successfully`,
      count: branches.length
    });
    
  } catch (error) {
    console.error('❌ Get branches by area error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches by area',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};