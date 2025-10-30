import { createConnection } from '../../../config/database.js'

// Get participants by stall (for specific stall management)
export const getParticipantsByStall = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const { stall_id } = req.params;

    if (!stall_id) {
      return res.status(400).json({
        success: false,
        message: 'Stall ID is required'
      });
    }

    console.log(`🔍 Fetching participants for stall ID: ${stall_id}`);

    // First, let's get basic participant data without potentially missing tables
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
        -- Branch details
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
      WHERE s.stall_id = ?
      ORDER BY 
        CASE app.application_status 
          WHEN 'Approved' THEN 1 
          WHEN 'Pending' THEN 2 
          ELSE 3 
        END,
        app.application_date DESC`,
      [stall_id]
    );

    console.log(`✅ Found ${participants.length} participants for stall ${stall_id}`);

    if (participants.length === 0) {
      return res.json({
        success: true,
        message: 'No participants found for this stall',
        data: [],
        count: 0,
        stallId: stall_id
      });
    }

    // Get stall info from first record
    const stallInfo = {
      stallId: participants[0].stall_id,
      stallNumber: participants[0].stall_no,
      status: participants[0].stall_status,
      rentalPrice: participants[0].rental_price,
      branch: {
        branchName: participants[0].branch_name,
        area: participants[0].area,
        location: participants[0].branch_location,
        floor: participants[0].floor_name,
        section: participants[0].section_name
      }
    };

    // Format participants data
    const formattedParticipants = participants.map(participant => {
      // Split full name into first and last name for frontend compatibility
      const nameParts = participant.applicant_full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        participantId: participant.participant_id,
        personalInfo: {
          firstName: firstName,
          lastName: lastName,
          fullName: participant.applicant_full_name,
          contactNumber: participant.contact_number,
          address: participant.address,
          birthdate: participant.applicant_birthdate,
          civilStatus: participant.applicant_civil_status,
          educationalAttainment: participant.applicant_educational_attainment
        },
        businessInfo: {
          name: 'N/A',
          type: 'N/A'
        },
        applicationInfo: {
          applicationId: participant.application_id,
          status: participant.application_status,
          applicationDate: participant.application_date
        },
        mobileAccess: {
          hasCredentials: false, // Default to false for now
          username: null,
          credentialCreated: null
        }
      };
    });

    // Count by status
    const statusCounts = {
      approved: formattedParticipants.filter(p => p.applicationInfo.status === 'Approved').length,
      pending: formattedParticipants.filter(p => p.applicationInfo.status === 'Pending').length,
      declined: formattedParticipants.filter(p => p.applicationInfo.status === 'Declined').length
    };

    console.log(`✅ Returning ${formattedParticipants.length} participants for stall ${stallInfo.stallNumber}`);

    res.json({
      success: true,
      message: `Participants for stall ${stallInfo.stallNumber} retrieved successfully`,
      data: formattedParticipants,
      count: formattedParticipants.length,
      stallInfo: stallInfo,
      statusSummary: statusCounts
    });

  } catch (error) {
    console.error('❌ Get participants by stall error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participants by stall',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};