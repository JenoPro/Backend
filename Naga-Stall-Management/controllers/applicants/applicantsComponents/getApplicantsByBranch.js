import { createConnection } from '../../../config/database.js'

// Get applicants who applied for stalls in a specific branch (for branch managers)
export const getApplicantsByBranch = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const { branch_id } = req.params;
    const { application_status, stall_id, price_type, search } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    let query = `
      SELECT DISTINCT
        a.applicant_id,
        a.first_name,
        a.last_name,
        a.email,
        a.contact_number,
        a.address,
        a.business_type,
        a.business_name,
        a.business_description,
        a.preferred_area,
        a.preferred_location,
        a.application_status,
        a.applied_date,
        a.created_at,
        a.updated_at,
        -- Application details
        app.application_id,
        app.application_date,
        app.application_status as current_application_status,
        -- Stall details
        s.stall_id,
        s.stall_no,
        s.rental_price,
        s.price_type,
        s.stall_location,
        s.is_available,
        s.status as stall_status,
        -- Branch location details
        sec.section_name,
        f.floor_name,
        b.branch_name,
        b.area_name,
        b.city_name
      FROM applicant a
      INNER JOIN application app ON a.applicant_id = app.applicant_id
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE b.branch_id = ?
    `;

    const params = [branch_id];

    // Filter by application status if provided
    if (application_status) {
      query += " AND app.application_status = ?";
      params.push(application_status);
    }

    // Filter by specific stall if provided
    if (stall_id) {
      query += " AND s.stall_id = ?";
      params.push(stall_id);
    }

    // Filter by price type (Fixed, Raffle, Auction) if provided
    if (price_type) {
      query += " AND s.price_type = ?";
      params.push(price_type);
    }

    // Search functionality across multiple fields
    if (search) {
      query += ` AND (
        a.first_name LIKE ? OR 
        a.last_name LIKE ? OR
        a.email LIKE ? OR 
        a.business_name LIKE ? OR 
        a.business_type LIKE ? OR
        s.stall_no LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY app.application_date DESC";

    const [applicants] = await connection.execute(query, params);

    // Get branch details for context
    const [branchDetails] = await connection.execute(
      `SELECT 
        branch_id,
        branch_name,
        area_name,
        city_name,
        branch_address
      FROM branch 
      WHERE branch_id = ?`,
      [branch_id]
    );

    // Group applications by applicant for better organization
    const groupedApplicants = {};
    applicants.forEach(row => {
      const applicantId = row.applicant_id;
      
      if (!groupedApplicants[applicantId]) {
        groupedApplicants[applicantId] = {
          applicant_id: row.applicant_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          contact_number: row.contact_number,
          address: row.address,
          business_type: row.business_type,
          business_name: row.business_name,
          business_description: row.business_description,
          preferred_area: row.preferred_area,
          preferred_location: row.preferred_location,
          application_status: row.application_status,
          applied_date: row.applied_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
          applications: []
        };
      }

      groupedApplicants[applicantId].applications.push({
        application_id: row.application_id,
        application_date: row.application_date,
        application_status: row.current_application_status,
        stall: {
          stall_id: row.stall_id,
          stall_no: row.stall_no,
          rental_price: row.rental_price,
          price_type: row.price_type,
          stall_location: row.stall_location,
          is_available: row.is_available,
          stall_status: row.stall_status,
          section_name: row.section_name,
          floor_name: row.floor_name
        }
      });
    });

    const result = Object.values(groupedApplicants);

    res.json({
      success: true,
      message: 'Branch applicants retrieved successfully',
      data: {
        branch: branchDetails[0] || null,
        applicants: result,
        count: result.length,
        total_applications: applicants.length
      },
      filters: {
        branch_id: branch_id,
        application_status: application_status || 'all',
        stall_id: stall_id || 'all',
        price_type: price_type || 'all',
        search: search || ''
      }
    });

  } catch (error) {
    console.error('❌ Get branch applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve branch applicants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};