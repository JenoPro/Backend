import { createConnection } from '../../../config/database.js'

// Create new branch
export const createBranch = async (req, res) => {
  let connection;
  try {
    const {
      branch_name,
      area,
      location,
      address,
      contact_number,
      email,
      status = 'Active'
    } = req.body;
    
    // Validation
    if (!branch_name || !area || !location) {
      return res.status(400).json({
        success: false,
        message: 'Branch name, area, and location are required'
      });
    }
    
    connection = await createConnection();
    
    // Check if branch already exists
    const [existingBranch] = await connection.execute(
      'SELECT branch_id FROM branch WHERE branch_name = ? OR (area = ? AND location = ?)',
      [branch_name, area, location]
    );
    
    if (existingBranch.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Branch with this name or location already exists'
      });
    }
    
    // Get admin_id (assuming there's only one admin for now)
    const [adminResult] = await connection.execute(
      'SELECT admin_id FROM admin WHERE status = "Active" LIMIT 1'
    );
    
    if (adminResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active admin found'
      });
    }
    
    const admin_id = adminResult[0].admin_id;
    
    // Insert new branch
    const [result] = await connection.execute(
      `INSERT INTO branch (branch_name, area, location, address, contact_number, email, status, admin_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [branch_name, area, location, address, contact_number, email, status, admin_id]
    );
    
    const branchId = result.insertId;
    
    // Get the created branch details
    const [createdBranch] = await connection.execute(
      'SELECT * FROM branch WHERE branch_id = ?',
      [branchId]
    );
    
    console.log('✅ Branch created successfully:', branch_name);
    
    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: createdBranch[0]
    });
    
  } catch (error) {
    console.error('❌ Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};