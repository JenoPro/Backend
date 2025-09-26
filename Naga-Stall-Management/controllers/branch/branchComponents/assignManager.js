import { createConnection } from '../../../config/database.js';
import bcrypt from 'bcrypt';

// Create and assign manager to branch
export const assignManager = async (req, res) => {
  let connection;
  try {
    console.log('📋 Received request body:', req.body);
    
    const { 
      branch_id, 
      first_name, 
      last_name, 
      manager_username, 
      manager_password,  // Frontend sends manager_password
      email,
      contact_number,
      status 
    } = req.body;
    
    // Validate required fields
    if (!branch_id || !first_name || !last_name || !manager_username || !manager_password) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Branch ID, first name, last name, username, and password are required'
      });
    }
    
    console.log('🔌 Creating database connection...');
    connection = await createConnection();
    console.log('✅ Database connection established');
    
    // Check if branch exists
    console.log('🔍 Checking if branch exists:', branch_id);
    const [branchExists] = await connection.execute(
      'SELECT branch_id, branch_name FROM branch WHERE branch_id = ?',
      [branch_id]
    );
    
    if (branchExists.length === 0) {
      console.log('❌ Branch not found:', branch_id);
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    console.log('✅ Branch found:', branchExists[0]);
    
    // Check if username already exists (excluding current branch's manager for updates)
    console.log('🔍 Checking username availability:', manager_username);
    const [usernameExists] = await connection.execute(
      'SELECT branch_manager_id, branch_id FROM branch_manager WHERE manager_username = ? AND branch_id != ?',
      [manager_username, branch_id]
    );
    
    if (usernameExists.length > 0) {
      console.log('❌ Username already exists:', manager_username);
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    console.log('✅ Username is available');
    
    // Check if branch already has a manager
    console.log('🔍 Checking for existing manager for branch:', branch_id);
    const [currentManager] = await connection.execute(
      'SELECT branch_manager_id, first_name, last_name FROM branch_manager WHERE branch_id = ?',
      [branch_id]
    );
    
    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(manager_password, 10); // Use manager_password from request
    console.log('✅ Password hashed successfully');
    
    if (currentManager.length > 0) {
      // Update existing manager
      console.log('🔄 Updating existing manager:', currentManager[0]);
      
      const [updateResult] = await connection.execute(
        `UPDATE branch_manager 
         SET first_name = ?, last_name = ?, manager_username = ?, manager_password_hash = ?, 
             email = ?, contact_number = ?, status = ?, updated_at = NOW()
         WHERE branch_id = ?`,
        [first_name, last_name, manager_username, hashedPassword, 
         email || null, contact_number || null, status || 'Active', branch_id]
      );
      
      console.log('✅ Manager updated successfully, affected rows:', updateResult.affectedRows);
      
      return res.json({
        success: true,
        message: 'Branch manager updated successfully',
        data: {
          branchId: branch_id,
          branchName: branchExists[0].branch_name,
          managerName: `${first_name} ${last_name}`,
          action: 'updated'
        }
      });
    } else {
      // Create new manager
      console.log('➕ Creating new manager for branch:', branch_id);
      
      const [insertResult] = await connection.execute(
        `INSERT INTO branch_manager 
         (branch_id, first_name, last_name, manager_username, manager_password_hash, email, contact_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [branch_id, first_name, last_name, manager_username, hashedPassword, 
         email || null, contact_number || null, status || 'Active']
      );
      
      console.log('✅ Manager created successfully, ID:', insertResult.insertId);
      
      return res.json({
        success: true,
        message: 'Branch manager assigned successfully',
        data: {
          managerId: insertResult.insertId,
          branchId: branch_id,
          branchName: branchExists[0].branch_name,
          managerName: `${first_name} ${last_name}`,
          action: 'created'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Assign manager error:', error);
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
      message: 'Failed to assign manager',
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