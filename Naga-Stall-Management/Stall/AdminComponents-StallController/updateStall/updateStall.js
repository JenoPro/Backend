import { createConnection } from '../../../config/database.js'

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