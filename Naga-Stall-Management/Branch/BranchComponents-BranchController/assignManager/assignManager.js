import { createConnection } from '../../../config/database.js'
import bcrypt from 'bcrypt'

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