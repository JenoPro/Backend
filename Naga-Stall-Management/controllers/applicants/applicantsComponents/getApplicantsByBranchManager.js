import { createConnection } from '../../../config/database.js'

// Get applicants for stalls managed by a specific branch manager
export const getApplicantsByBranchManager = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const { branch_manager_id } = req.params;
    const { application_status, price_type, search } = req.query;

    if (!branch_manager_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch Manager ID is required'
      });
    }

    // First, get the branches managed by this branch manager
    const [branchManagerInfo] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.name as manager_name,
        bm.email as manager_email,
        b.branch_id,
        b.branch_name,
        b.area_name,
        b.city_name
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.branch_manager_id = ?`,
      [branch_manager_id]
    );

    if (branchManagerInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch Manager not found or not assigned to any branch'
      });
    }

    const managerData = branchManagerInfo[0];
    const branch_id = managerData.branch_id;

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
        s.raffle_auction_deadline,
        s.deadline_active,
        -- Branch location details
        sec.section_name,
        f.floor_name
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

    // Get summary statistics for the branch manager
    const [summaryStats] = await connection.execute(
      `SELECT 
        COUNT(DISTINCT app.applicant_id) as total_unique_applicants,
        COUNT(app.application_id) as total_applications,
        COUNT(DISTINCT s.stall_id) as stalls_with_applications,
        s.price_type,
        COUNT(*) as applications_by_type
      FROM application app
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE b.branch_id = ?
      GROUP BY s.price_type`,
      [branch_id]
    );

    // Get application status breakdown
    const [statusBreakdown] = await connection.execute(
      `SELECT 
        app.application_status,
        COUNT(*) as count
      FROM application app
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE b.branch_id = ?
      GROUP BY app.application_status`,
      [branch_id]
    );

    res.json({
      success: true,
      message: 'Branch manager applicants retrieved successfully',
      data: {
        branch_manager: managerData,
        applicants: applicants,
        statistics: {
          summary: summaryStats,
          status_breakdown: statusBreakdown,
          total_results: applicants.length
        }
      },
      filters: {
        branch_manager_id: branch_manager_id,
        application_status: application_status || 'all',
        price_type: price_type || 'all',
        search: search || ''
      }
    });

  } catch (error) {
    console.error('❌ Get branch manager applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve branch manager applicants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};