import { createConnection } from '../../../config/database.js'

// Update applicant
export const updateApplicant = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const updateData = req.body;

    connection = await createConnection();

    // Check if applicant exists
    const [existingApplicant] = await connection.execute(
      'SELECT applicant_id FROM applicant WHERE applicant_id = ?',
      [id]
    );

    if (existingApplicant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'first_name', 'last_name', 'email', 'contact_number', 'address',
      'business_type', 'business_name', 'business_description',
      'preferred_area', 'preferred_location', 'application_status'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Add updated_at timestamp and applicant ID
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `UPDATE applicant SET ${updateFields.join(', ')} WHERE applicant_id = ?`;
    
    await connection.execute(updateQuery, updateValues);

    // Get updated applicant data
    const [updatedApplicant] = await connection.execute(
      'SELECT * FROM applicant WHERE applicant_id = ?',
      [id]
    );

    console.log('✅ Applicant updated successfully:', id);

    res.json({
      success: true,
      message: 'Applicant updated successfully',
      data: updatedApplicant[0]
    });

  } catch (error) {
    console.error('❌ Update applicant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update applicant',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};