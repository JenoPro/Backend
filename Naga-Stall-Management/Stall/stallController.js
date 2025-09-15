import { createConnection } from '../config/database.js'

// Get all stalls for the authenticated branch manager
export const getAllStalls = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    // Get the branch manager ID from the authenticated user
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    console.log('Fetching stalls for branch manager ID:', branchManagerId)

    // Query stalls with branch manager information
    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.branch_manager_id = ?
      ORDER BY s.created_at DESC
    `,
      [branchManagerId],
    )

    console.log(`Found ${stalls.length} stalls for branch manager ID: ${branchManagerId}`)

    res.json({
      success: true,
      message: 'Stalls retrieved successfully',
      data: stalls,
      branchManagerId: branchManagerId,
      count: stalls.length,
    })
  } catch (error) {
    console.error('❌ Get stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get stall by ID (only if it belongs to the authenticated branch manager)
export const getStallById = async (req, res) => {
  let connection
  try {
    const { id } = req.params
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ? AND s.branch_manager_id = ?
    `,
      [id, branchManagerId],
    )

    if (stalls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to access it',
      })
    }

    res.json({
      success: true,
      message: 'Stall retrieved successfully',
      data: stalls[0],
    })
  } catch (error) {
    console.error('❌ Get stall by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stall',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Add new stall (assigned to the authenticated branch manager)
export const addStall = async (req, res) => {
  let connection
  try {
    // Map frontend field names to backend field names
    const {
      stallNumber, // Frontend field
      price, // Frontend field -> rental_price
      floor, // Frontend field -> floor (simple text)
      section, // Frontend field -> section (simple text)
      size, // Frontend field -> size
      location, // Frontend field -> stall_location
      description, // Same field name
      image, // Frontend field -> stall_image
      isAvailable, // Frontend field -> status
      priceType, // Frontend field -> price_type
    } = req.body

    // Get the branch manager ID from the authenticated user
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    console.log('Adding stall for branch manager ID:', branchManagerId)
    console.log('Frontend data received:', req.body)

    // Validation for old structure
    if (!stallNumber || !price || !location || !size || !floor || !section) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: stallNumber, price, location, size, floor, section',
        received: {
          stallNumber: !!stallNumber,
          price: !!price,
          location: !!location,
          size: !!size,
          floor: !!floor,
          section: !!section,
        },
      })
    }

    connection = await createConnection()

    // Check if stall number already exists for this branch manager
    const [existingStall] = await connection.execute(
      'SELECT stall_id FROM stall WHERE stall_no = ? AND branch_manager_id = ?',
      [stallNumber, branchManagerId],
    )

    if (existingStall.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Stall number already exists in your branch',
      })
    }

    // Map frontend fields to database columns
    const stallData = {
      stall_no: stallNumber,
      stall_location: location,
      size: size,
      floor: floor, // Simple text field
      section: section, // Simple text field
      branch_manager_id: branchManagerId,
      rental_price: parseFloat(price),
      price_type: priceType || 'Fixed Price',
      status: isAvailable ? 'Active' : 'Inactive',
      stamp: 'APPROVED',
      description: description || null,
      stall_image: image || null,
      is_available: isAvailable ? 1 : 0,
    }

    console.log('Mapped database data:', stallData)

    // Insert new stall with old structure
    const [result] = await connection.execute(
      `
      INSERT INTO stall (
        branch_manager_id, stall_no, stall_location, size, floor, section,
        rental_price, price_type, status, stamp, description, stall_image, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        stallData.branch_manager_id,
        stallData.stall_no,
        stallData.stall_location,
        stallData.size,
        stallData.floor,
        stallData.section,
        stallData.rental_price,
        stallData.price_type,
        stallData.status,
        stallData.stamp,
        stallData.description,
        stallData.stall_image,
        stallData.is_available,
      ],
    )

    // Get the created stall with complete information
    const [newStall] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ?
    `,
      [result.insertId],
    )

    console.log('✅ Stall added successfully for branch manager:', branchManagerId)

    res.status(201).json({
      success: true,
      message: 'Stall added successfully',
      data: newStall[0],
    })
  } catch (error) {
    console.error('❌ Add stall error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add stall',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Update stall (only if it belongs to the authenticated branch manager)
export const updateStall = async (req, res) => {
  let connection
  try {
    const { id } = req.params
    const updateData = req.body
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    console.log('🔄 UPDATE STALL DEBUG:')
    console.log('- Stall ID:', id)
    console.log('- Branch Manager ID from token:', branchManagerId)
    console.log('- req.user object:', req.user)
    console.log('- Update data:', updateData)

    if (!branchManagerId) {
      console.log('❌ No branch manager ID found in token')
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    // Check if stall exists and belongs to this branch manager
    console.log('🔍 Checking if stall exists and belongs to branch manager...')
    const [existingStall] = await connection.execute(
      'SELECT stall_id, branch_manager_id FROM stall WHERE stall_id = ? AND branch_manager_id = ?',
      [id, branchManagerId],
    )

    console.log('- Query result:', existingStall)
    console.log('- Found stalls:', existingStall.length)

    if (existingStall.length === 0) {
      console.log('❌ Stall not found or permission denied')
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to update it',
      })
    }

    // Map frontend field names to database column names for update
    const fieldMapping = {
      stallNumber: 'stall_no',
      price: 'rental_price',
      location: 'stall_location',
      image: 'stall_image',
      isAvailable: 'status', // Special handling needed
      priceType: 'price_type',
      floor: 'floor', // Simple text field
      section: 'section', // Simple text field
      size: 'size',
      description: 'description',
      stamp: 'stamp',
    }

    // If updating stallNumber (stall_no), check if it already exists for this branch manager
    if (updateData.stallNumber) {
      const [duplicateCheck] = await connection.execute(
        'SELECT stall_id FROM stall WHERE stall_no = ? AND branch_manager_id = ? AND stall_id != ?',
        [updateData.stallNumber, branchManagerId, id],
      )

      if (duplicateCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Stall number already exists in your branch',
        })
      }
    }

    // Build dynamic update query with field mapping
    const updateFields = []
    const updateValues = []

    Object.keys(updateData).forEach((frontendField) => {
      const dbField = fieldMapping[frontendField]

      if (dbField && updateData[frontendField] !== undefined) {
        updateFields.push(`${dbField} = ?`)

        // Handle special field conversions
        if (frontendField === 'price' || frontendField === 'rental_price') {
          updateValues.push(parseFloat(updateData[frontendField]))
        } else if (frontendField === 'isAvailable') {
          updateValues.push(updateData[frontendField] ? 'Active' : 'Inactive')
          // Also update is_available flag
          updateFields.push('is_available = ?')
          updateValues.push(updateData[frontendField] ? 1 : 0)
        } else {
          updateValues.push(updateData[frontendField])
        }
      }
    })

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      })
    }

    // Add WHERE clause parameters
    updateValues.push(id)

    const updateQuery = `UPDATE stall SET ${updateFields.join(', ')} WHERE stall_id = ?`

    console.log('Update query:', updateQuery)
    console.log('Update values:', updateValues)

    await connection.execute(updateQuery, updateValues)

    // Get updated stall with complete information
    const [updatedStall] = await connection.execute(
      `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ?
    `,
      [id],
    )

    console.log('✅ Stall updated successfully:', updatedStall[0])

    res.json({
      success: true,
      message: 'Stall updated successfully',
      data: updatedStall[0],
    })
  } catch (error) {
    console.error('❌ Update stall error:', error)

    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Stall number already exists in your branch',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update stall',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Delete stall (only if it belongs to the authenticated branch manager)
export const deleteStall = async (req, res) => {
  let connection
  try {
    const { id } = req.params
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    // Check if stall exists and belongs to this branch manager
    const [existingStall] = await connection.execute(
      'SELECT stall_id, stall_no FROM stall WHERE stall_id = ? AND branch_manager_id = ?',
      [id, branchManagerId],
    )

    if (existingStall.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to delete it',
      })
    }

    // Delete the stall
    await connection.execute('DELETE FROM stall WHERE stall_id = ?', [id])

    console.log('✅ Stall deleted successfully:', existingStall[0].stall_no)

    res.json({
      success: true,
      message: 'Stall deleted successfully',
      data: { id: id, stallNumber: existingStall[0].stall_no },
    })
  } catch (error) {
    console.error('❌ Delete stall error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete stall',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get available stalls only (for the authenticated branch manager)
export const getAvailableStalls = async (req, res) => {
  let connection
  try {
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*, 
        bm.area, 
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.branch_manager_id = ? AND s.status = 'Active' AND s.is_available = 1
      ORDER BY s.stall_location, s.stall_no
    `,
      [branchManagerId],
    )

    res.json({
      success: true,
      message: 'Available stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
    })
  } catch (error) {
    console.error('❌ Get available stalls error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}

// Get stalls by filter (for the authenticated branch manager)
export const getStallsByFilter = async (req, res) => {
  let connection
  try {
    const { location, status, search, minPrice, maxPrice, floor, section } = req.query
    const branchManagerId = req.user?.branchManagerId || req.user?.userId

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      })
    }

    connection = await createConnection()

    let query = `
      SELECT 
        s.*,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      LEFT JOIN branch_manager bm ON s.branch_manager_id = bm.branch_manager_id
      WHERE s.branch_manager_id = ?
    `
    const queryParams = [branchManagerId]

    // Location filter
    if (location) {
      query += ' AND s.stall_location = ?'
      queryParams.push(location)
    }

    // Status filter
    if (status) {
      query += ' AND s.status = ?'
      queryParams.push(status)
    }

    // Floor filter (simple text field)
    if (floor) {
      query += ' AND s.floor = ?'
      queryParams.push(floor)
    }

    // Section filter (simple text field)
    if (section) {
      query += ' AND s.section = ?'
      queryParams.push(section)
    }

    // Search filter (search in stall number, location, description, floor, section)
    if (search) {
      query += ` AND (
        s.stall_no LIKE ? OR 
        s.stall_location LIKE ? OR 
        s.description LIKE ? OR
        s.floor LIKE ? OR
        s.section LIKE ?
      )`
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Price range filter
    if (minPrice !== undefined && !isNaN(minPrice)) {
      query += ' AND s.rental_price >= ?'
      queryParams.push(parseFloat(minPrice))
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      query += ' AND s.rental_price <= ?'
      queryParams.push(parseFloat(maxPrice))
    }

    query += ' ORDER BY s.created_at DESC'

    const [stalls] = await connection.execute(query, queryParams)

    res.json({
      success: true,
      message: 'Stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
      filters: {
        location,
        status,
        search,
        minPrice,
        maxPrice,
        floor,
        section,
      },
    })
  } catch (error) {
    console.error('❌ Get stalls by filter error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stalls',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}
