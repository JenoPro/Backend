import { createConnection } from '../config/database.js'
import bcrypt from 'bcrypt'

// Get all branches
export const getAllBranches = async (req, res) => {
  try {
    const connection = await createConnection()
    
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
    `
    
    const [branches] = await connection.execute(query)
    await connection.end()
    
    res.json({
      success: true,
      data: branches,
      message: 'Branches retrieved successfully'
    })
    
  } catch (error) {
    console.error('Error fetching branches:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    })
  }
}

// Create new branch
export const createBranch = async (req, res) => {
  try {
    const {
      branch_name,
      area,
      location,
      address,
      contact_number,
      email,
      status = 'Active'
    } = req.body
    
    // Validation
    if (!branch_name || !area || !location) {
      return res.status(400).json({
        success: false,
        message: 'Branch name, area, and location are required'
      })
    }
    
    const connection = await createConnection()
    
    // Check if branch already exists
    const [existingBranch] = await connection.execute(
      'SELECT branch_id FROM branch WHERE branch_name = ? OR (area = ? AND location = ?)',
      [branch_name, area, location]
    )
    
    if (existingBranch.length > 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'Branch with this name or location already exists'
      })
    }
    
    // Get admin_id (assuming there's only one admin for now)
    const [adminResult] = await connection.execute(
      'SELECT admin_id FROM admin WHERE status = "Active" LIMIT 1'
    )
    
    if (adminResult.length === 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'No active admin found'
      })
    }
    
    const admin_id = adminResult[0].admin_id
    
    // Insert new branch
    const insertQuery = `
      INSERT INTO branch (admin_id, branch_name, area, location, address, contact_number, email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const [result] = await connection.execute(insertQuery, [
      admin_id,
      branch_name,
      area,
      location,
      address,
      contact_number,
      email,
      status
    ])
    
    await connection.end()
    
    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: {
        branch_id: result.insertId,
        branch_name,
        area,
        location,
        address,
        contact_number,
        email,
        status
      }
    })
    
  } catch (error) {
    console.error('Error creating branch:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: error.message
    })
  }
}

// Assign manager to branch
export const assignManager = async (req, res) => {
  try {
    const { id: branch_id } = req.params
    const {
      manager_username,
      password,
      first_name,
      last_name,
      email,
      contact_number
    } = req.body
    
    // Validation
    if (!manager_username || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, first name, and last name are required'
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
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
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
      message: 'Manager assigned successfully',
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
    console.error('Error assigning manager:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to assign manager',
      error: error.message
    })
  }
}

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

// Delete branch
export const deleteBranch = async (req, res) => {
  try {
    const { id: branch_id } = req.params
    
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
    
    // Check if branch has any stalls (through sections -> floors -> branch)
    const [stallsResult] = await connection.execute(`
      SELECT COUNT(*) as stall_count 
      FROM stall s
      JOIN section sec ON s.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      WHERE f.branch_id = ?
    `, [branch_id])
    
    if (stallsResult[0].stall_count > 0) {
      await connection.end()
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with existing stalls. Please remove all stalls first.'
      })
    }
    
    // Delete branch (this will cascade delete managers, employees, floors, sections)
    await connection.execute('DELETE FROM branch WHERE branch_id = ?', [branch_id])
    
    await connection.end()
    
    res.json({
      success: true,
      message: 'Branch deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting branch:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    })
  }
}