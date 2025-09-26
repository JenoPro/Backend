import { createConnection } from '../../../config/database.js'
import bcrypt from 'bcrypt'

// Create branch manager
export const createBranchManager = async (req, res) => {
  let connection;
  try {
    console.log('🔧 Creating branch manager - Request received')
    console.log('📄 Request method:', req.method)
    console.log('📄 Request URL:', req.url)
    console.log('📄 Content-Type:', req.headers['content-type'])
    console.log('📋 Request body keys:', Object.keys(req.body))
    console.log('📋 Request body data:', JSON.stringify(req.body, null, 2))

    const {
      branch_id,
      branchId = branch_id,        // Accept both formats
      first_name,
      firstName = first_name,      // Accept both formats
      last_name,
      lastName = last_name,        // Accept both formats
      manager_username,
      username = manager_username, // Accept both formats
      password,
      manager_password = password, // Accept both formats
      email,
      contact_number,
      contactNumber = contact_number, // Accept both formats
      phone = contact_number,         // Accept phone as well
      address = null,               // Default to null if not provided
      status = 'Active'
    } = req.body;

    // Use flexible field mapping
    const finalBranchId = branchId || branch_id
    const finalFirstName = firstName || first_name
    const finalLastName = lastName || last_name
    const finalUsername = username || manager_username
    const finalPassword = manager_password || password
    const finalContactNumber = contactNumber || contact_number || phone
    const finalAddress = address || null  // Ensure null instead of undefined

    console.log('🔍 Field validation after mapping:')
    console.log('- finalBranchId:', finalBranchId, '(type:', typeof finalBranchId, ', valid:', !!finalBranchId, ')')
    console.log('- finalFirstName:', finalFirstName, '(type:', typeof finalFirstName, ', valid:', !!finalFirstName, ')')
    console.log('- finalLastName:', finalLastName, '(type:', typeof finalLastName, ', valid:', !!finalLastName, ')')
    console.log('- finalUsername:', finalUsername, '(type:', typeof finalUsername, ', valid:', !!finalUsername, ')')
    console.log('- finalPassword:', finalPassword ? '[PROVIDED]' : 'NULL', '(valid:', !!finalPassword, ')')
    console.log('- email:', email, '(type:', typeof email, ', valid:', !!email, ')')
    console.log('- finalContactNumber:', finalContactNumber, '(valid:', !!finalContactNumber, ')')
    console.log('- finalAddress:', finalAddress, '(valid:', !!finalAddress, ')')
    console.log('- status:', status, '(valid:', !!status, ')')
    
    // Validation
    if (!finalBranchId || !finalFirstName || !finalLastName || !finalUsername || !finalPassword || !email) {
      const missingFields = []
      if (!finalBranchId) missingFields.push('branch_id/branchId')
      if (!finalFirstName) missingFields.push('first_name/firstName')
      if (!finalLastName) missingFields.push('last_name/lastName')
      if (!finalUsername) missingFields.push('manager_username/username')
      if (!finalPassword) missingFields.push('password/manager_password')
      if (!email) missingFields.push('email')

      console.log('❌ Validation failed - Missing fields:', missingFields)
      console.log('📋 Available fields in request:', Object.keys(req.body))
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        availableFields: Object.keys(req.body),
        missingFields: missingFields
      });
    }
    
    connection = await createConnection();
    
    // Check if branch exists
    const [branchExists] = await connection.execute(
      'SELECT branch_id, branch_name FROM branch WHERE branch_id = ?',
      [finalBranchId]
    );
    
    if (branchExists.length === 0) {
      console.log('❌ Branch not found:', finalBranchId)
      return res.status(400).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    console.log('✅ Branch found:', branchExists[0].branch_name)
    
    // Check if username already exists
    const [existingUser] = await connection.execute(
      'SELECT branch_manager_id FROM branch_manager WHERE manager_username = ?',
      [finalUsername]
    );
    
    if (existingUser.length > 0) {
      console.log('❌ Username already exists:', finalUsername)
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    console.log('✅ Username available:', finalUsername)
    
    // Check if branch already has a manager
    const [existingManager] = await connection.execute(
      'SELECT branch_manager_id FROM branch_manager WHERE branch_id = ?',
      [finalBranchId]
    );
    
    if (existingManager.length > 0) {
      console.log('❌ Branch already has a manager:', finalBranchId)
      return res.status(400).json({
        success: false,
        message: 'Branch already has an assigned manager'
      });
    }
    
    console.log('✅ Branch has no existing manager')
    
    // Hash password properly
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(finalPassword, saltRounds);
    console.log('✅ Password hashed successfully')
    
    // Insert new branch manager
    const [result] = await connection.execute(
      `INSERT INTO branch_manager (
        branch_id, first_name, last_name, manager_username, manager_password_hash, 
        email, contact_number, address, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [finalBranchId, finalFirstName, finalLastName, finalUsername, hashedPassword, email, finalContactNumber, finalAddress, status]
    );
    
    const managerId = result.insertId;
    
    // Get the created manager details (without password)
    const [createdManager] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.branch_id,
        bm.first_name,
        bm.last_name,
        bm.manager_username,
        bm.email,
        bm.contact_number,
        bm.address,
        bm.status,
        bm.created_at,
        b.branch_name,
        b.area,
        b.location
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.branch_manager_id = ?`,
      [managerId]
    );
    
    console.log('✅ Branch manager created successfully:', finalUsername);
    
    res.status(201).json({
      success: true,
      message: 'Branch manager created successfully',
      data: createdManager[0]
    });
    
  } catch (error) {
    console.error('❌ Create branch manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch manager',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};