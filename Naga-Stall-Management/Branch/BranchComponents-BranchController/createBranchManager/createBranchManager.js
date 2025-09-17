import { createConnection } from '../../../config/database.js'
import bcrypt from 'bcrypt'

// Create branch manager (standalone endpoint)
export const createBranchManager = async (req, res) => {
  try {
    console.log('🔧 Creating branch manager - Request body:', JSON.stringify(req.body, null, 2))
    
    const {
      branch_id,
      manager_username,
      manager_password,  // Accept manager_password from frontend
      password,          // Also accept password for compatibility
      first_name,
      last_name,
      email,
      contact_number,
      status = 'Active'
    } = req.body
    
    // Use either manager_password or password field
    const managerPassword = manager_password || password
    
    console.log('🔍 Field validation:')
    console.log('- branch_id:', branch_id, '(valid:', !!branch_id, ')')
    console.log('- manager_username:', manager_username, '(valid:', !!manager_username, ')')
    console.log('- managerPassword:', managerPassword ? '[HIDDEN]' : 'NULL', '(valid:', !!managerPassword, ')')
    console.log('- first_name:', first_name, '(valid:', !!first_name, ')')
    console.log('- last_name:', last_name, '(valid:', !!last_name, ')')
    
    // Validation
    if (!branch_id || !manager_username || !managerPassword || !first_name || !last_name) {
      const missingFields = []
      if (!branch_id) missingFields.push('branch_id')
      if (!manager_username) missingFields.push('manager_username')
      if (!managerPassword) missingFields.push('password')
      if (!first_name) missingFields.push('first_name')
      if (!last_name) missingFields.push('last_name')
      
      console.log('❌ Validation failed - Missing fields:', missingFields)
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }
    
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
    
    // Check if manager username already exists
    const [existingManager] = await connection.execute(
      'SELECT branch_manager_id FROM branch_manager WHERE manager_username = ?',
      [manager_username]
    )
    
    if (existingManager.length > 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'Manager username already exists'
      })
    }
    
    // Check if branch already has a manager
    const [currentManager] = await connection.execute(
      'SELECT branch_manager_id FROM branch_manager WHERE branch_id = ? AND status = "Active"',
      [branch_id]
    )
    
    if (currentManager.length > 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'Branch already has an active manager'
      })
    }
    
    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(managerPassword, saltRounds)
    
    // Insert new branch manager
    const insertQuery = `
      INSERT INTO branch_manager (branch_id, manager_username, manager_password_hash, first_name, last_name, email, contact_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
    `
    
    const [result] = await connection.execute(insertQuery, [
      branch_id,
      manager_username,
      hashedPassword,
      first_name,
      last_name,
      email,
      contact_number
    ])
    
    await connection.end()
    
    res.status(201).json({
      success: true,
      message: 'Manager created successfully',
      data: {
        branch_manager_id: result.insertId,
        branch_id,
        manager_username,
        first_name,
        last_name,
        email,
        contact_number
      }
    })
    
  } catch (error) {
    console.error('Error creating branch manager:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create branch manager',
      error: error.message
    })
  }
}