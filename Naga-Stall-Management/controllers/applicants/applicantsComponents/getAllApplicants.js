import { createConnection } from '../../../config/database.js'

// Get all applicants
export const getAllApplicants = async (req, res) => {
  let connection;
  try {
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
      ORDER BY applied_date DESC`
    );

    res.json({
      success: true,
      message: 'Applicants retrieved successfully',
      data: applicants,
      count: applicants.length
    });

  } catch (error) {
    console.error('❌ Get all applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applicants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};