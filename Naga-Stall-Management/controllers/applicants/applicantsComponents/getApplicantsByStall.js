import { createConnection } from '../../../config/database.js'

// Get applicants who applied for a specific stall (for detailed stall management)
export const getApplicantsByStall = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const { stall_id } = req.params;
    const { application_status } = req.query;

    if (!stall_id) {
      return res.status(400).json({
        success: false,
        message: 'Stall ID is required'
      });
    }

    let applicantQuery = `
      SELECT 
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
        -- Raffle/Auction specific data
        r.raffle_id,
        r.participants_count as raffle_participants,
        r.status as raffle_status,
        r.raffle_start_time,
        r.raffle_end_time,
        au.auction_id,
        au.current_bid,
        au.highest_bidder_id,
        au.bid_count,
        au.status as auction_status,
        au.auction_start_time,
        au.auction_end_time
      FROM applicant a
      INNER JOIN application app ON a.applicant_id = app.applicant_id
      LEFT JOIN raffle r ON app.stall_id = r.stall_id
      LEFT JOIN auction au ON app.stall_id = au.stall_id
      WHERE app.stall_id = ?
    `;

    const params = [stall_id];

    // Filter by application status if provided
    if (application_status) {
      applicantQuery += " AND app.application_status = ?";
      params.push(application_status);
    }

    applicantQuery += " ORDER BY app.application_date ASC"; // First come, first served for raffles

    const [applicants] = await connection.execute(applicantQuery, params);

    // Get stall details
    const [stallDetails] = await connection.execute(
      `SELECT 
        s.stall_id,
        s.stall_no,
        s.rental_price,
        s.price_type,
        s.stall_location,
        s.is_available,
        s.status,
        s.raffle_auction_deadline,
        s.deadline_active,
        sec.section_name,
        f.floor_name,
        b.branch_id,
        b.branch_name,
        b.area_name,
        b.city_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE s.stall_id = ?`,
      [stall_id]
    );

    if (stallDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found'
      });
    }

    const stall = stallDetails[0];

    // Additional statistics for raffle/auction stalls
    let additionalStats = {};
    
    if (stall.price_type === 'Raffle' || stall.price_type === 'Auction') {
      // Count applications by status
      const [statusCounts] = await connection.execute(
        `SELECT 
          application_status,
          COUNT(*) as count
        FROM application 
        WHERE stall_id = ?
        GROUP BY application_status`,
        [stall_id]
      );

      additionalStats.application_status_counts = statusCounts;

      // Check if deadline is active and remaining time
      if (stall.deadline_active && stall.raffle_auction_deadline) {
        const now = new Date();
        const deadline = new Date(stall.raffle_auction_deadline);
        const timeRemaining = deadline - now;
        
        additionalStats.deadline_info = {
          deadline: stall.raffle_auction_deadline,
          is_active: stall.deadline_active,
          time_remaining_ms: timeRemaining > 0 ? timeRemaining : 0,
          is_expired: timeRemaining <= 0
        };
      }
    }

    res.json({
      success: true,
      message: 'Stall applicants retrieved successfully',
      data: {
        stall: stall,
        applicants: applicants,
        statistics: {
          total_applicants: applicants.length,
          ...additionalStats
        }
      }
    });

  } catch (error) {
    console.error('❌ Get stall applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stall applicants',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};