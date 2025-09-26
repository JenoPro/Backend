import { createConnection } from '../../../config/database.js';

// Get branch manager by ID
export const getBranchManagerById = async (req, res) => {
  let connection;
  try {
    console.log('🔍 Getting branch manager by ID - Request received');
    console.log('📄 Request method:', req.method);
    console.log('📄 Request URL:', req.url);
    console.log('📋 Request params:', req.params);

    const { managerId } = req.params; // Get manager ID from URL params

    console.log('🔍 Get validation:');
    console.log('- managerId:', managerId, '(valid:', !!managerId, ')');

    // Validation
    if (!managerId) {
      console.log('❌ Missing manager ID in URL params');
      return res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
    }

    console.log('🔌 Creating database connection...');
    connection = await createConnection();
    console.log('✅ Database connection established');

    // Get manager data with branch information
    console.log('🔍 Fetching manager data:', managerId);
    const [managerData] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.branch_id,
        bm.first_name,
        bm.last_name,
        bm.manager_username,
        bm.email,
        bm.contact_number,
        bm.status,
        bm.created_at,
        bm.updated_at,
        b.branch_name,
        b.area,
        b.location,
        b.address as branch_address,
        b.contact_number as branch_contact,
        b.email as branch_email
      FROM branch_manager bm
      LEFT JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.branch_manager_id = ?`,
      [managerId]
    );

    if (managerData.length === 0) {
      console.log('❌ Manager not found:', managerId);
      return res.status(404).json({
        success: false,
        message: 'Branch manager not found'
      });
    }

    const manager = managerData[0];
    console.log('✅ Manager found:', {
      id: manager.branch_manager_id,
      name: `${manager.first_name} ${manager.last_name}`,
      username: manager.manager_username,
      branch: manager.branch_name
    });

    res.json({
      success: true,
      message: 'Branch manager retrieved successfully',
      data: {
        managerId: manager.branch_manager_id,
        branchId: manager.branch_id,
        firstName: manager.first_name,
        lastName: manager.last_name,
        fullName: `${manager.first_name} ${manager.last_name}`,
        username: manager.manager_username,
        email: manager.email,
        contactNumber: manager.contact_number,
        status: manager.status,
        createdAt: manager.created_at,
        updatedAt: manager.updated_at,
        branch: {
          branchId: manager.branch_id,
          branchName: manager.branch_name,
          area: manager.area,
          location: manager.location,
          address: manager.branch_address,
          contactNumber: manager.branch_contact,
          email: manager.branch_email
        }
      }
    });

  } catch (error) {
    console.error('❌ Get branch manager error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to get branch manager',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) {
      console.log('🔌 Closing database connection...');
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
};