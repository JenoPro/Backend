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

    // Query stalls with proper relationship through section -> floor -> branch_manager
    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name,
        sec.section_code,
        f.floor_name,
        f.floor_number,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
      WHERE bm.branch_manager_id = ?
      ORDER BY s.created_at DESC
    `,
      [branchManagerId],
    )

    console.log(`Found ${stalls.length} stalls for branch manager ID: ${branchManagerId}`)
    
    // Debug: Check what stall IDs we're getting
    console.log('🔍 Stall IDs retrieved:', stalls.map(s => ({ id: s.stall_id, no: s.stall_no })))

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
        s.stall_id as id,
        sec.section_name,
        sec.section_code,
        f.floor_name,
        f.floor_number,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ? AND bm.branch_manager_id = ?
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
    console.log('Available fields:', Object.keys(req.body))

    // Map frontend field names to backend field names - be flexible with field names
    const {
      stallNumber, 
      stallNo = stallNumber, // Allow both stallNumber and stallNo
      price, 
      rental_price = price, // Allow both price and rental_price
      floor, 
      section, 
      size, 
      location, 
      stall_location = location, // Allow both location and stall_location
      description, 
      image, 
      stall_image = image, // Allow both image and stall_image
      isAvailable = true, // Default to available
      status, // Allow direct status
      priceType = 'Fixed Price', // Default price type
      price_type = priceType, // Allow both priceType and price_type
    } = req.body

    // Use the mapped values
    const stallNo_final = stallNo || stallNumber
    const price_final = rental_price || price
    const location_final = stall_location || location
    const image_final = stall_image || image
    const priceType_final = price_type || priceType || 'Fixed Price'
    
    // More flexible validation - floor and section are not required since they don't exist in DB
    if (!stallNo_final || !price_final || !location_final || !size) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: stallNumber/stallNo, price/rental_price, location/stall_location, size',
        received: {
          stallNumber: !!stallNumber,
          stallNo: !!stallNo,
          price: !!price,
          rental_price: !!rental_price,
          location: !!location,
          stall_location: !!stall_location,
          size: !!size,
          floor: !!floor,
          section: !!section,
        },
        availableFields: Object.keys(req.body),
      })
    }

    connection = await createConnection()

    // Check if stall number already exists for this branch manager
    const [existingStall] = await connection.execute(
      `SELECT s.stall_id 
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
       WHERE s.stall_no = ? AND bm.branch_manager_id = ?`,
      [stallNo_final, branchManagerId],
    )

    if (existingStall.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Stall number already exists in your branch',
      })
    }

    // Map frontend fields to database columns
    const stallData = {
      stall_no: stallNo_final,
      stall_location: location_final,
      size: size,
      // Note: floor and section are not database columns in the current schema
      section_id: 1, // Default section_id - this should be properly mapped in the future
      rental_price: parseFloat(price_final),
      price_type: priceType_final,
      status: isAvailable !== false ? 'Active' : 'Inactive',
      stamp: 'APPROVED',
      description: description || null,
      stall_image: image_final || null,
      is_available: isAvailable !== false ? 1 : 0,
    }

    console.log('Mapped database data:', stallData)

    // Insert new stall with proper section_id
    const [result] = await connection.execute(
      `
      INSERT INTO stall (
        section_id, stall_no, stall_location, size, dimensions,
        rental_price, price_type, status, stamp, description, stall_image, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        stallData.section_id,
        stallData.stall_no,
        stallData.stall_location,
        stallData.size,
        null, // dimensions field
        stallData.rental_price,
        stallData.price_type,
        stallData.status,
        stallData.stamp,
        stallData.description,
        stallData.stall_image,
        stallData.is_available,
      ],
    )

    console.log('🔍 Insert result:', result)
    console.log('🔍 Insert ID:', result.insertId)

    // If insertId is 0 or null, try to get the ID using LAST_INSERT_ID()
    let stallId = result.insertId
    if (!stallId || stallId === 0) {
      console.log('⚠️ Insert ID is 0 or null, trying LAST_INSERT_ID()')
      const [lastIdResult] = await connection.execute('SELECT LAST_INSERT_ID() as id')
      stallId = lastIdResult[0]?.id
      console.log('🔍 LAST_INSERT_ID result:', stallId)
    }

    // If we still don't have a valid ID, try to find it by stall_no
    if (!stallId || stallId === 0) {
      console.log('⚠️ Still no valid ID, searching by stall_no:', stallData.stall_no)
      const [findStallResult] = await connection.execute(
        'SELECT stall_id FROM stall WHERE stall_no = ? ORDER BY created_at DESC LIMIT 1',
        [stallData.stall_no]
      )
      stallId = findStallResult[0]?.stall_id
      console.log('🔍 Found stall by number:', stallId)
    }

    // Get the created stall with complete information
    const [newStall] = await connection.execute(
      `
      SELECT 
        s.*,
        sec.section_name,
        sec.section_code,
        f.floor_name,
        f.floor_number,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
      WHERE s.stall_id = ?
    `,
      [stallId],
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
      `SELECT s.stall_id, s.stall_no 
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
       WHERE s.stall_id = ? AND bm.branch_manager_id = ?`,
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
      // Note: floor and section are not database columns in the current schema
      // they are handled through section_id relationships
      size: 'size',
      description: 'description',
      stamp: 'stamp',
    }

    // If updating stallNumber (stall_no), check if it already exists for this branch manager
    if (updateData.stallNumber) {
      const [duplicateCheck] = await connection.execute(
        `SELECT s.stall_id 
         FROM stall s
         INNER JOIN section sec ON s.section_id = sec.section_id
         INNER JOIN floor f ON sec.floor_id = f.floor_id
         INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
         WHERE s.stall_no = ? AND bm.branch_manager_id = ? AND s.stall_id != ?`,
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
        sec.section_name,
        sec.section_code,
        f.floor_name,
        f.floor_number,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name,
        bm.area,
        bm.location as branch_location
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
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
      `SELECT s.stall_id, s.stall_no 
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch_manager bm ON f.branch_manager_id = bm.branch_manager_id
       WHERE s.stall_id = ? AND bm.branch_manager_id = ?`,
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
