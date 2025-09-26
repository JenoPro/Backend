import { createConnection } from '../../../config/database.js';
import bcrypt from 'bcrypt';

// Update branch manager
export const updateBranchManager = async (req, res) => {
  let connection;
  try {
    console.log('🔧 Updating branch manager - Request received');
    console.log('📄 Request method:', req.method);
    console.log('📄 Request URL:', req.url);
    console.log('📋 Request params:', req.params);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    const { managerId } = req.params; // Get manager ID from URL params
    const {
      branch_id,
      branchId = branch_id,
      first_name,
      firstName = first_name,
      last_name,
      lastName = last_name,
      manager_username,
      username = manager_username,
      password,
      manager_password = password,
      email,
      contact_number,
      contactNumber = contact_number,
      phone = contact_number,
      status = 'Active'
    } = req.body;

    // Use flexible field mapping
    const finalBranchId = branchId || branch_id;
    const finalFirstName = firstName || first_name;
    const finalLastName = lastName || last_name;
    const finalUsername = username || manager_username;
    const finalPassword = manager_password || password;
    const finalContactNumber = contactNumber || contact_number || phone;

    console.log('🔍 Update validation:');
    console.log('- managerId:', managerId, '(valid:', !!managerId, ')');
    console.log('- finalBranchId:', finalBranchId, '(valid:', !!finalBranchId, ')');
    console.log('- finalFirstName:', finalFirstName, '(valid:', !!finalFirstName, ')');
    console.log('- finalLastName:', finalLastName, '(valid:', !!finalLastName, ')');
    console.log('- finalUsername:', finalUsername, '(valid:', !!finalUsername, ')');
    console.log('- Password provided:', !!finalPassword);

    // Validation
    if (!managerId) {
      console.log('❌ Missing manager ID in URL params');
      return res.status(400).json({
        success: false,
        message: 'Manager ID is required'
      });
    }

    if (!finalFirstName || !finalLastName || !finalUsername) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and username are required'
      });
    }

    console.log('🔌 Creating database connection...');
    connection = await createConnection();
    console.log('✅ Database connection established');

    // Check if manager exists
    console.log('🔍 Checking if manager exists:', managerId);
    const [existingManager] = await connection.execute(
      'SELECT branch_manager_id, branch_id, manager_username FROM branch_manager WHERE branch_manager_id = ?',
      [managerId]
    );

    if (existingManager.length === 0) {
      console.log('❌ Manager not found:', managerId);
      return res.status(404).json({
        success: false,
        message: 'Branch manager not found'
      });
    }

    console.log('✅ Manager found:', existingManager[0]);

    // Check if new username is already taken by another manager
    if (finalUsername !== existingManager[0].manager_username) {
      console.log('🔍 Checking username availability:', finalUsername);
      const [usernameExists] = await connection.execute(
        'SELECT branch_manager_id FROM branch_manager WHERE manager_username = ? AND branch_manager_id != ?',
        [finalUsername, managerId]
      );

      if (usernameExists.length > 0) {
        console.log('❌ Username already exists:', finalUsername);
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // If branch_id is provided, validate it
    if (finalBranchId) {
      console.log('🔍 Validating branch ID:', finalBranchId);
      const [branchExists] = await connection.execute(
        'SELECT branch_id, branch_name FROM branch WHERE branch_id = ?',
        [finalBranchId]
      );

      if (branchExists.length === 0) {
        console.log('❌ Branch not found:', finalBranchId);
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      console.log('✅ Branch validated:', branchExists[0]);
    }

    // Prepare update fields
    let updateFields = [];
    let updateValues = [];

    if (finalBranchId) {
      updateFields.push('branch_id = ?');
      updateValues.push(finalBranchId);
    }

    updateFields.push('first_name = ?');
    updateValues.push(finalFirstName);

    updateFields.push('last_name = ?');
    updateValues.push(finalLastName);

    updateFields.push('manager_username = ?');
    updateValues.push(finalUsername);

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email || null);
    }

    if (finalContactNumber !== undefined) {
      updateFields.push('contact_number = ?');
      updateValues.push(finalContactNumber || null);
    }

    updateFields.push('status = ?');
    updateValues.push(status);

    updateFields.push('updated_at = NOW()');

    // Handle password update if provided
    if (finalPassword) {
      console.log('🔐 Hashing new password...');
      const hashedPassword = await bcrypt.hash(finalPassword, 12);
      updateFields.push('manager_password_hash = ?');
      updateValues.push(hashedPassword);
      console.log('✅ Password hashed successfully');
    }

    // Add manager ID for WHERE clause
    updateValues.push(managerId);

    console.log('🔄 Updating branch manager...');
    console.log('📝 Update fields:', updateFields.join(', '));

    const [updateResult] = await connection.execute(
      `UPDATE branch_manager SET ${updateFields.join(', ')} WHERE branch_manager_id = ?`,
      updateValues
    );

    console.log('✅ Manager updated successfully, affected rows:', updateResult.affectedRows);

    if (updateResult.affectedRows === 0) {
      console.log('⚠️ No rows were updated');
      return res.status(404).json({
        success: false,
        message: 'Branch manager not found or no changes made'
      });
    }

    // Get updated manager data
    console.log('📊 Fetching updated manager data...');
    const [updatedManager] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.first_name,
        bm.last_name,
        bm.manager_username,
        bm.email,
        bm.contact_number,
        bm.status,
        bm.created_at,
        bm.updated_at,
        b.branch_id,
        b.branch_name,
        b.area,
        b.location
      FROM branch_manager bm
      LEFT JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.branch_manager_id = ?`,
      [managerId]
    );

    console.log('✅ Updated manager data retrieved:', updatedManager[0]);

    res.json({
      success: true,
      message: 'Branch manager updated successfully',
      data: {
        managerId: parseInt(managerId),
        branchId: updatedManager[0].branch_id,
        branchName: updatedManager[0].branch_name,
        managerName: `${updatedManager[0].first_name} ${updatedManager[0].last_name}`,
        username: updatedManager[0].manager_username,
        email: updatedManager[0].email,
        contactNumber: updatedManager[0].contact_number,
        status: updatedManager[0].status,
        area: updatedManager[0].area,
        location: updatedManager[0].location,
        updatedAt: updatedManager[0].updated_at,
        action: 'updated'
      }
    });

  } catch (error) {
    console.error('❌ Update branch manager error:', error);
    console.error('Error stack:', error.stack);

    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch ID - foreign key constraint failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update branch manager',
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