import { createConnection } from '../../../config/database.js'

// Get all participants (approved applicants who are currently using stalls)
export const getAllParticipants = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

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
        sec.section_name
      FROM applicant a
      INNER JOIN application app ON a.applicant_id = app.applicant_id
      INNER JOIN stall s ON app.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.application_status = 'Approved' 
        AND s.status = 'Occupied'
      ORDER BY app.application_date DESC`
    );

    // Format the response data
    const formattedParticipants = participants.map(participant => {
      // Split full name into first and last name for frontend compatibility
      const nameParts = participant.applicant_full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        participantInfo: {
          id: participant.participant_id,
          firstName: firstName,
          lastName: lastName,
          fullName: participant.applicant_full_name,
          contactNumber: participant.contact_number,
          address: participant.address,
          birthdate: participant.applicant_birthdate,
          civilStatus: participant.applicant_civil_status,
          educationalAttainment: participant.applicant_educational_attainment,
          status: participant.application_status,
          appliedDate: participant.application_date
        },
        businessInfo: {
          type: 'N/A',
          name: 'N/A'
        },
        stallInfo: {
          stallId: participant.stall_id,
          stallNumber: participant.stall_no,
          status: participant.stall_status,
          rentalPrice: participant.rental_price
        },
        branchInfo: {
          branchName: participant.branch_name,
          area: participant.area,
          location: participant.branch_location,
          floor: participant.floor_name,
          section: participant.section_name
        },
        applicationInfo: {
          applicationId: participant.application_id,
          applicationDate: participant.application_date,
          currentStatus: participant.application_status
        },
        mobileAccess: {
          hasCredentials: false, // Default to false since we removed mobile_credentials table join
          username: null,
          credentialCreated: null
        }
      };
    });

    console.log(`✅ Found ${formattedParticipants.length} active participants`);

    res.json({
      success: true,
      message: 'Active participants retrieved successfully',
      data: formattedParticipants,
      count: formattedParticipants.length,
      summary: {
        totalParticipants: formattedParticipants.length,
        withMobileAccess: 0, // Default since we removed mobile_credentials
        withoutMobileAccess: formattedParticipants.length
      }
    });

  } catch (error) {
    console.error('❌ Get all participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};