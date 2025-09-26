import { createConnection } from '../../../config/database.js'

// Get all branches
export const getAllBranches = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    
    const query = `
      SELECT 
        b.branch_id,
        b.branch_name,
        b.area,
        b.location,
        b.address,
        b.contact_number,
        b.email,
        b.status,
        b.created_at,
        b.updated_at,
        CONCAT(bm.first_name, ' ', bm.last_name) as manager_name,
        bm.branch_manager_id,
        bm.manager_username,
        bm.email as manager_email,
        bm.contact_number as manager_contact,
        bm.status as manager_status
      FROM branch b
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      ORDER BY b.branch_name ASC
    `;
    
    const [branches] = await connection.execute(query);
    
    res.json({
      success: true,
      data: branches,
      message: 'Branches retrieved successfully',
      count: branches.length
    });
    
  } catch (error) {
    console.error('❌ Get all branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};