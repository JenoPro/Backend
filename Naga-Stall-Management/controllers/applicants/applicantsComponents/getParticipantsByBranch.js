import { createConnection } from '../../../config/database.js'

// Get participants by branch (approved applicants in a specific branch)
export const getParticipantsByBranch = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const { branch_name } = req.params;
    const { status } = req.query; // Optional status filter

    if (!branch_name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required'
      });
    }

    let statusFilter = '';
    let params = [branch_name];

    if (status) {
      statusFilter = 'AND app.application_status = ?';
      params.push(status);
    }

    const [participants] = await connection.execute(
      `SELECT 
        a.applicant_id as participant_id,
        a.applicant_full_name,
        a.applicant_contact_number as contact_number,
        a.applicant_address as address,
        a.applicant_birthdate,
        a.applicant_civil_status,
        a.applicant_educational_attainment,
        -- Application details
        app.application_id,
        app.application_status,
        app.application_date,
        -- Stall details
        s.stall_id,
        s.stall_no,
        s.status as stall_status,
        s.rental_price,
        -- Branch/Location details
        b.branch_name,
        b.area,
        b.location as branch_location,
        f.floor_name,
        sec.section_name,
        -- Branch Manager details
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM applicant a
      INNER JOIN application app ON a.applicant_id = app.applicant_id
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE b.branch_name = ? 
        AND app.application_status = 'Approved'
        AND s.status = 'Occupied'
        ${statusFilter}
      ORDER BY app.application_date DESC`,
      params
    );

    // Format the response
    const formattedParticipants = participants.map(participant => {
      // Split full name into first and last name for frontend compatibility
      const nameParts = participant.applicant_full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        participantId: participant.participant_id,
        name: participant.applicant_full_name,
        firstName: firstName,
        lastName: lastName,
        contactNumber: participant.contact_number,
        address: participant.address,
        businessName: 'N/A',
        businessType: 'N/A',
        status: participant.application_status,
        appliedDate: participant.application_date,
        stall: {
          stallId: participant.stall_id,
          stallNumber: participant.stall_no,
          status: participant.stall_status,
          rentalPrice: participant.rental_price,
          floor: participant.floor_name,
          section: participant.section_name
        },
        branch: {
          branchName: participant.branch_name,
          area: participant.area,
          location: participant.branch_location,
          manager: participant.manager_first_name && participant.manager_last_name 
            ? `${participant.manager_first_name} ${participant.manager_last_name}`
            : 'No manager assigned'
        },
        application: {
          applicationId: participant.application_id,
          applicationDate: participant.application_date,
          currentStatus: participant.application_status
        }
      };
    });

    console.log(`✅ Found ${formattedParticipants.length} participants in branch '${branch_name}'`);

    res.json({
      success: true,
      message: `Participants in ${branch_name} retrieved successfully`,
      data: formattedParticipants,
      count: formattedParticipants.length,
      branch: branch_name,
      filters: {
        branch: branch_name,
        status: status || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Get participants by branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participants by branch',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};