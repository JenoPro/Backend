import { createConnection } from '../../../config/database.js'

// Get applicant by ID
export const getApplicantById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await createConnection();

    const [applicants] = await connection.execute(
      `SELECT 
        applicant_id,
        first_name,
        last_name,
        email,
        contact_number,
        address,
        business_type,
        business_name,
        business_description,
        preferred_area,
        preferred_location,
        application_status,
        applied_date,
        created_at,
        updated_at
      FROM applicant
      WHERE applicant_id = ?`,
      [id]
    );

    if (applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    res.json({
      success: true,
      message: 'Applicant retrieved successfully',
      data: applicants[0]
    });

  } catch (error) {
    console.error('❌ Get applicant by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applicant',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};