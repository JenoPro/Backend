import { createConnection } from '../../../config/database.js'

// Search applicants
export const searchApplicants = async (req, res) => {
  let connection;
  try {
    const { 
      search, 
      status, 
      business_type, 
      preferred_area,
      page = 1, 
      limit = 10 
    } = req.query;

    connection = await createConnection();

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Add search conditions
    if (search) {
      whereClause += ` AND (
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        email LIKE ? OR 
        business_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND application_status = ?';
      queryParams.push(status);
    }

    if (business_type) {
      whereClause += ' AND business_type = ?';
      queryParams.push(business_type);
    }

    if (preferred_area) {
      whereClause += ' AND preferred_area = ?';
      queryParams.push(preferred_area);
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM applicant ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get paginated results
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
      ${whereClause}
      ORDER BY applied_date DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    res.json({
      success: true,
      message: 'Applicants search completed',
      data: applicants,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: total,
        total_pages: Math.ceil(total / limit)
      },
      filters: { search, status, business_type, preferred_area }
    });

  } catch (error) {
    console.error('❌ Search applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search applicants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};