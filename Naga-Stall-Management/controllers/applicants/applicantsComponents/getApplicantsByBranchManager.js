import { createConnection } from '../../../config/database.js'

// Get applicants for stalls managed by a specific branch manager OR by employees in their assigned branch
export const getApplicantsByBranchManager = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    console.log("🔍 Request user info:", req.user);

    // Check if user is an employee or branch manager
    const userType = req.user?.userType || req.user?.role;
    const userId = req.user?.userId;
    const userBranchId = req.user?.branchId;

    console.log("🎯 User details:", { userType, userId, userBranchId });

    const { application_status, price_type, search } = req.query;

    let branch_id = null;
    let managerData = null;
    let branch_manager_id = null; // Add this for branch managers

    if (userType === 'employee') {
      // For employees, use their assigned branch directly
      if (!userBranchId) {
        return res.status(400).json({
          success: false,
          message: 'Employee not assigned to any branch'
        });
      }

      branch_id = userBranchId;

      // Get branch information for employee
      const [branchInfo] = await connection.execute(
        `SELECT 
          b.branch_id,
          b.branch_name,
          b.area,
          b.location,
          'Employee' as manager_name,
          'N/A' as manager_email
        FROM branch b
        WHERE b.branch_id = ?`,
        [branch_id]
      );

      if (branchInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      managerData = branchInfo[0];

    } else {
      // For branch managers, use the original logic
      branch_manager_id = req.params.branch_manager_id;
      
      if (!branch_manager_id) {
        branch_manager_id = req.user?.branchManagerId || req.user?.userId;
        console.log("🔍 No branch_manager_id in params, using authenticated user:", req.user);
        console.log("🎯 Extracted branch_manager_id:", branch_manager_id);
      }

      if (!branch_manager_id) {
        return res.status(400).json({
          success: false,
          message: 'Branch Manager ID not found in authentication token or URL parameters'
        });
      }

      // First, get the branches managed by this branch manager
      const [branchManagerInfo] = await connection.execute(
        `SELECT 
          bm.branch_manager_id,
          CONCAT(bm.first_name, ' ', bm.last_name) as manager_name,
          bm.email as manager_email,
          b.branch_id,
          b.branch_name,
          b.area,
          b.location
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

      managerData = branchManagerInfo[0];
      branch_id = managerData.branch_id;
    }

    let query = `
      SELECT DISTINCT
        a.applicant_id,
        a.applicant_full_name,
        a.applicant_contact_number,
        a.applicant_address,
        a.applicant_birthdate,
        a.applicant_civil_status,
        a.applicant_educational_attainment,
        a.created_at,
        a.updated_at,
        -- Business information from separate table
        bi.nature_of_business,
        bi.capitalization,
        bi.source_of_capital,
        bi.previous_business_experience,
        bi.relative_stall_owner,
        -- Other information from separate table
        oi.email_address,
        -- Spouse information from separate table
        sp.spouse_full_name,
        sp.spouse_birthdate,
        sp.spouse_educational_attainment,
        sp.spouse_contact_number,
        sp.spouse_occupation,
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
      LEFT JOIN business_information bi ON a.applicant_id = bi.applicant_id
      LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
      LEFT JOIN spouse sp ON a.applicant_id = sp.applicant_id
      WHERE b.branch_id = ?
    `;

    const params = [branch_id];

    if (application_status) {
      query += " AND app.application_status = ?";
      params.push(application_status);
    }

    if (price_type) {
      query += " AND s.price_type = ?";
      params.push(price_type);
    }

    if (search) {
      query += ` AND (
        a.applicant_full_name LIKE ? OR 
        oi.email_address LIKE ? OR 
        bi.nature_of_business LIKE ? OR 
        s.stall_no LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY app.application_date DESC";

    const [rows] = await connection.execute(query, params);

    // Group applications by applicant_id
    const applicantsMap = new Map();

    rows.forEach(row => {
      if (!applicantsMap.has(row.applicant_id)) {
        applicantsMap.set(row.applicant_id, {
          applicant_id: row.applicant_id,
          first_name: row.applicant_full_name ? row.applicant_full_name.split(' ')[0] : 'N/A',
          last_name: row.applicant_full_name ? row.applicant_full_name.split(' ').slice(1).join(' ') : 'N/A',
          full_name: row.applicant_full_name || 'N/A',
          email: row.email_address || 'N/A',
          contact_number: row.applicant_contact_number || 'N/A',
          address: row.applicant_address || 'N/A',
          business_type: row.nature_of_business || 'N/A',
          business_name: row.nature_of_business || 'N/A',
          business_description: row.nature_of_business || 'N/A',
          preferred_area: 'N/A',
          preferred_location: 'N/A',
          applicant_birthdate: row.applicant_birthdate,
          applicant_civil_status: row.applicant_civil_status,
          applicant_educational_attainment: row.applicant_educational_attainment,
          application_status: 'Pending',
          applied_date: row.application_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
          // Add spouse information
          spouse: row.spouse_full_name ? {
            spouse_full_name: row.spouse_full_name,
            spouse_birthdate: row.spouse_birthdate,
            spouse_educational_attainment: row.spouse_educational_attainment,
            spouse_contact_number: row.spouse_contact_number,
            spouse_occupation: row.spouse_occupation
          } : null,
          // Add business information
          business_information: row.nature_of_business ? {
            nature_of_business: row.nature_of_business,
            capitalization: row.capitalization,
            source_of_capital: row.source_of_capital,
            previous_business_experience: row.previous_business_experience,
            relative_stall_owner: row.relative_stall_owner
          } : null,
          // Add other information
          other_information: row.email_address ? {
            email_address: row.email_address
          } : null,
          applications: []
        });
      }

      // Add application details to the applicant
      applicantsMap.get(row.applicant_id).applications.push({
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
          floor_name: row.floor_name,
          raffle_auction_deadline: row.raffle_auction_deadline,
          deadline_active: row.deadline_active
        }
      });
    });

    // Convert Map to Array
    const applicants = Array.from(applicantsMap.values());

    // Get summary statistics
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
        branch_manager_id: userType === 'employee' ? 'N/A (Employee)' : branch_manager_id,
        user_type: userType,
        branch_id: branch_id,
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