import { createConnection } from '../../../config/database.js';

// Update applicant status - CORRECTED VERSION
export const updateApplicantStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params; // This is applicant_id
    const { status, decline_reason, declined_at } = req.body;

    console.log('📊 Updating applicant status:', { id, status, decline_reason, declined_at });

    // Validate status - matches database enum values
    const validStatuses = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    connection = await createConnection();

    // First, get the applicant information and their application
    const [applicantData] = await connection.execute(
      `SELECT 
        a.applicant_id,
        a.applicant_full_name,
        oi.email_address,
        app.application_id,
        app.application_status
      FROM applicant a
      LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
      LEFT JOIN application app ON a.applicant_id = app.applicant_id
      WHERE a.applicant_id = ?
      ORDER BY app.application_date DESC
      LIMIT 1`,
      [id]
    );

    if (applicantData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    const applicant = applicantData[0];
    
    if (!applicant.application_id) {
      return res.status(404).json({
        success: false,
        message: 'No application found for this applicant'
      });
    }

    // Update the application status (this is where status is actually stored)
    const updateQuery = `
      UPDATE application 
      SET 
        application_status = ?, 
        updated_at = NOW() 
      WHERE application_id = ?
    `;

    console.log('🔍 Executing query:', updateQuery.replace(/\s+/g, ' ').trim());
    console.log('🔍 With parameters:', [status, applicant.application_id]);

    const [result] = await connection.execute(updateQuery, [status, applicant.application_id]);

    console.log('📊 Update result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No rows were updated. Application may not exist.'
      });
    }

    console.log(`✅ Application for ${applicant.applicant_full_name} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Applicant status updated successfully',
      data: {
        applicant_id: id,
        application_id: applicant.application_id,
        full_name: applicant.applicant_full_name,
        email: applicant.email_address,
        new_status: status,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Update applicant status error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update applicant status',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        code: error.code,
        sqlState: error.sqlState 
      })
    });
  } finally {
    if (connection) await connection.end();
  }
};