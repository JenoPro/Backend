import { createConnection } from '../../../config/database.js'

// Get current user info
export const getCurrentUser = async (req, res) => {
  let connection;
  try {
    console.log('🔍 getCurrentUser called - checking authentication');
    const user = req.user; // From auth middleware

    if (!user) {
      console.log('❌ No user in request - not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('✅ User authenticated:', {
      userId: user.userId,
      branchManagerId: user.branchManagerId,
      role: user.role,
      username: user.username
    });

    connection = await createConnection();

    if (user.role === 'admin') {
      console.log('🔍 Fetching admin data for ID:', user.userId);
      const [admins] = await connection.execute(
        'SELECT admin_id, admin_username, email, first_name, last_name, contact_number, status, created_at FROM admin WHERE admin_id = ?',
        [user.userId]
      );

      if (admins.length === 0) {
        console.log('❌ Admin not found in database');
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      const admin = admins[0];
      console.log('✅ Admin data found:', admin);

      res.json({
        success: true,
        user: {
          ...admin,
          role: 'admin',
          type: 'admin',
          userType: 'admin'
        },
        // Add admin alias for AppHeader.js compatibility  
        admin: {
          id: admin.admin_id,
          username: admin.admin_username,
          fullName: admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : 'System Administrator',
          firstName: admin.first_name || 'System',
          lastName: admin.last_name || 'Administrator', 
          email: admin.email,
          contactNumber: admin.contact_number,
          status: admin.status,
          designation: 'System Administrator',
          role: 'admin',
          type: 'admin',
          userType: 'admin',
          createdAt: admin.created_at
        }
      });

    } else if (user.role === 'branch_manager') {
      console.log('🔍 Fetching branch manager data for ID:', user.branchManagerId || user.userId);
      const [managers] = await connection.execute(
        `SELECT 
          bm.branch_manager_id,
          bm.manager_username,
          bm.first_name,
          bm.last_name,
          bm.email,
          bm.contact_number,
          bm.status,
          bm.created_at,
          b.branch_id,
          b.branch_name,
          b.area,
          b.location
        FROM branch_manager bm
        INNER JOIN branch b ON bm.branch_id = b.branch_id
        WHERE bm.branch_manager_id = ?`,
        [user.branchManagerId || user.userId]
      );

      if (managers.length === 0) {
        console.log('❌ Branch manager not found in database');
        return res.status(404).json({
          success: false,
          message: 'Branch manager not found'
        });
      }

      console.log('✅ Branch manager data found:', {
        id: managers[0].branch_manager_id,
        username: managers[0].manager_username,
        branch: managers[0].branch_name,
        area: managers[0].area,
        location: managers[0].location
      });

      res.json({
        success: true,
        user: {
          ...managers[0],
          fullName: `${managers[0].first_name} ${managers[0].last_name}`,
          role: 'branch_manager',
          type: 'branch_manager',
          branch: {
            id: managers[0].branch_id,
            name: managers[0].branch_name,
            area: managers[0].area,
            location: managers[0].location
          }
        },
        // Add branchManager alias for AppHeader.js compatibility
        branchManager: {
          id: managers[0].branch_manager_id,
          username: managers[0].manager_username,
          fullName: `${managers[0].first_name} ${managers[0].last_name}`,
          firstName: managers[0].first_name,
          lastName: managers[0].last_name,
          email: managers[0].email,
          contactNumber: managers[0].contact_number,
          status: managers[0].status,
          area: managers[0].area,
          location: managers[0].location,
          designation: `${managers[0].area} - ${managers[0].location}`,
          role: 'branch_manager',
          type: 'branch_manager',
          branchId: managers[0].branch_id,
          branchName: managers[0].branch_name,
          createdAt: managers[0].created_at
        }
      });
    } else {
      console.log('❌ Unknown user role:', user.role);
      return res.status(400).json({
        success: false,
        message: 'Unknown user role'
      });
    }

  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};