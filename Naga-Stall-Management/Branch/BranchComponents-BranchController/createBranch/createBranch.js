import { createConnection } from '../../../config/database.js'

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