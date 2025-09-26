import { createConnection } from '../../../config/database.js';

// Get all branch managers
export const getAllBranchManagers = async (req, res) => {
  let connection;
  try {
    console.log('📋 Getting all branch managers - Request received');
    console.log('📄 Request method:', req.method);
    console.log('📄 Request URL:', req.url);
    console.log('📋 Request query params:', req.query);

    // Optional query parameters for filtering
    const { 
      status,        // Filter by status
      branchId,      // Filter by specific branch
      area,          // Filter by area
      search         // Search by name or username
    } = req.query;

    console.log('🔌 Creating database connection...');
    connection = await createConnection();
    console.log('✅ Database connection established');

    // Build dynamic query
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('bm.status = ?');
      queryParams.push(status);
    }

    if (branchId) {
      whereConditions.push('bm.branch_id = ?');
      queryParams.push(branchId);
    }

    if (area) {
      whereConditions.push('b.area = ?');
      queryParams.push(area);
    }

    if (search) {
      whereConditions.push('(bm.first_name LIKE ? OR bm.last_name LIKE ? OR bm.manager_username LIKE ?)');
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    console.log('🔍 Fetching branch managers with filters...');
    console.log('📝 Where clause:', whereClause);
    console.log('📝 Query params:', queryParams);

    const [managers] = await connection.execute(
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
        b.email as branch_email,
        b.status as branch_status
      FROM branch_manager bm
      LEFT JOIN branch b ON bm.branch_id = b.branch_id
      ${whereClause}
      ORDER BY bm.created_at DESC`,
      queryParams
    );

    console.log('✅ Found', managers.length, 'branch managers');

    // Format the data
    const formattedManagers = managers.map(manager => ({
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
        email: manager.branch_email,
        status: manager.branch_status
      },
      // For display purposes
      designation: manager.area && manager.location ? `${manager.area} - ${manager.location}` : 'Unassigned'
    }));

    // Get summary statistics
    const [stats] = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN bm.status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN bm.status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
        COUNT(DISTINCT bm.branch_id) as branches_managed
      FROM branch_manager bm`
    );

    console.log('📊 Manager statistics:', stats[0]);

    res.json({
      success: true,
      message: 'Branch managers retrieved successfully',
      data: formattedManagers,
      pagination: {
        total: formattedManagers.length,
        showing: formattedManagers.length
      },
      statistics: {
        total: stats[0].total,
        active: stats[0].active,
        inactive: stats[0].inactive,
        branchesManaged: stats[0].branches_managed
      },
      filters: {
        status: status || null,
        branchId: branchId || null,
        area: area || null,
        search: search || null
      }
    });

  } catch (error) {
    console.error('❌ Get all branch managers error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to get branch managers',
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