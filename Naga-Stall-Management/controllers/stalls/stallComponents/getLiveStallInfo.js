import { createConnection } from '../../../config/database.js'

// Get live stall information to determine if chat or bidding system should be shown
export const getLiveStallInfo = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const userId = req.user?.userId || req.user?.applicant_id;

    if (!stallId) {
      return res.status(400).json({
        success: false,
        message: 'Stall ID is required'
      });
    }

    connection = await createConnection();

    // Get stall information with raffle/auction details
    const [stallInfo] = await connection.execute(
      `SELECT 
        s.stall_id,
        s.stall_no,
        s.stall_location,
        s.rental_price,
        s.price_type,
        s.raffle_auction_status,
        s.raffle_auction_duration_hours,
        s.description,
        s.stall_image,
        sec.section_name,
        f.floor_name,
        b.branch_name,
        
        -- Raffle information
        r.raffle_id,
        r.start_time as raffle_start_time,
        r.end_time as raffle_end_time,
        r.raffle_status,
        r.total_participants,
        r.winner_applicant_id as raffle_winner_id,
        
        -- Auction information
        a.auction_id,
        a.starting_price,
        a.current_highest_bid,
        a.highest_bidder_id,
        a.start_time as auction_start_time,
        a.end_time as auction_end_time,
        a.auction_status,
        a.total_bids,
        
        -- Time remaining calculation
        CASE 
          WHEN s.price_type = 'Raffle' AND r.end_time IS NOT NULL THEN
            CASE 
              WHEN NOW() >= r.end_time THEN 'EXPIRED'
              ELSE CONCAT(
                FLOOR(TIMESTAMPDIFF(SECOND, NOW(), r.end_time) / 3600), 'h ',
                FLOOR((TIMESTAMPDIFF(SECOND, NOW(), r.end_time) % 3600) / 60), 'm'
              )
            END
          WHEN s.price_type = 'Auction' AND a.end_time IS NOT NULL THEN
            CASE 
              WHEN NOW() >= a.end_time THEN 'EXPIRED'
              ELSE CONCAT(
                FLOOR(TIMESTAMPDIFF(SECOND, NOW(), a.end_time) / 3600), 'h ',
                FLOOR((TIMESTAMPDIFF(SECOND, NOW(), a.end_time) % 3600) / 60), 'm'
              )
            END
          ELSE 'WAITING'
        END as time_remaining,
        
        CASE 
          WHEN s.price_type = 'Raffle' AND r.end_time IS NOT NULL THEN
            TIMESTAMPDIFF(SECOND, NOW(), r.end_time)
          WHEN s.price_type = 'Auction' AND a.end_time IS NOT NULL THEN
            TIMESTAMPDIFF(SECOND, NOW(), a.end_time)
          ELSE -1
        END as seconds_remaining

      FROM stall s
      LEFT JOIN section sec ON s.section_id = sec.section_id
      LEFT JOIN floor f ON sec.floor_id = f.floor_id
      LEFT JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN raffle r ON s.stall_id = r.stall_id
      LEFT JOIN auction a ON s.stall_id = a.stall_id
      WHERE s.stall_id = ? AND s.status = 'Active'`,
      [stallId]
    );

    if (stallInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or inactive'
      });
    }

    const stall = stallInfo[0];

    // Determine what interface should be shown
    let interfaceType = 'fixed_price'; // Default
    let liveSystemData = {};

    if (stall.price_type === 'Raffle') {
      interfaceType = 'raffle_chat';
      
      // Get raffle participants
      if (stall.raffle_id) {
        const [participants] = await connection.execute(
          `SELECT 
            rp.participant_id,
            a.applicant_full_name,
            a.email,
            rp.joined_at
          FROM raffle_participants rp
          INNER JOIN applicant a ON rp.applicant_id = a.applicant_id
          WHERE rp.raffle_id = ?
          ORDER BY rp.joined_at ASC`,
          [stall.raffle_id]
        );

        liveSystemData = {
          raffle_id: stall.raffle_id,
          status: stall.raffle_status || 'Waiting for Participants',
          total_participants: stall.total_participants || 0,
          participants: participants,
          start_time: stall.raffle_start_time,
          end_time: stall.raffle_end_time,
          time_remaining: stall.time_remaining,
          seconds_remaining: stall.seconds_remaining,
          winner_id: stall.raffle_winner_id,
          duration_hours: stall.raffle_auction_duration_hours
        };
      }
      
    } else if (stall.price_type === 'Auction') {
      interfaceType = 'auction_bidding';
      
      // Get recent bids
      if (stall.auction_id) {
        const [recentBids] = await connection.execute(
          `SELECT 
            ab.bid_id,
            ab.bid_amount,
            ab.bidder_id,
            a.applicant_full_name as bidder_name,
            ab.bid_time,
            CASE WHEN ab.bidder_id = ? THEN true ELSE false END as is_user_bid,
            CASE WHEN ab.bidder_id = auc.highest_bidder_id THEN true ELSE false END as is_highest_bid
          FROM auction_bids ab
          INNER JOIN applicant a ON ab.bidder_id = a.applicant_id
          INNER JOIN auction auc ON ab.auction_id = auc.auction_id
          WHERE ab.auction_id = ?
          ORDER BY ab.bid_amount DESC, ab.bid_time DESC
          LIMIT 10`,
          [userId, stall.auction_id]
        );

        liveSystemData = {
          auction_id: stall.auction_id,
          status: stall.auction_status || 'Waiting for Bidders',
          starting_price: stall.starting_price,
          current_highest_bid: stall.current_highest_bid,
          highest_bidder_id: stall.highest_bidder_id,
          total_bids: stall.total_bids || 0,
          recent_bids: recentBids,
          start_time: stall.auction_start_time,
          end_time: stall.auction_end_time,
          time_remaining: stall.time_remaining,
          seconds_remaining: stall.seconds_remaining,
          duration_hours: stall.raffle_auction_duration_hours,
          minimum_next_bid: (stall.current_highest_bid || stall.starting_price) + 50 // Minimum increment
        };
      }
    }

    res.json({
      success: true,
      message: 'Live stall information retrieved successfully',
      data: {
        stall_id: stall.stall_id,
        stall_no: stall.stall_no,
        stall_location: stall.stall_location,
        rental_price: stall.rental_price,
        price_type: stall.price_type,
        description: stall.description,
        stall_image: stall.stall_image,
        section_name: stall.section_name,
        floor_name: stall.floor_name,
        branch_name: stall.branch_name,
        
        // Interface configuration
        interface_type: interfaceType, // 'fixed_price', 'raffle_chat', 'auction_bidding'
        live_system_data: liveSystemData,
        
        // UI guidance
        show_chat: interfaceType === 'raffle_chat',
        show_bidding: interfaceType === 'auction_bidding',
        go_live_enabled: stall.price_type !== 'Fixed Price',
        live_status: stall.raffle_auction_status || 'Not Started'
      }
    });

  } catch (error) {
    console.error('❌ Get live stall info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve live stall information',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Start live session (activates chat for raffle or bidding for auction)
export const startLiveSession = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(401).json({
        success: false,
        message: 'Branch manager authentication required'
      });
    }

    connection = await createConnection();

    // Get stall information and verify ownership
    const [stallInfo] = await connection.execute(
      `SELECT 
        s.stall_id,
        s.stall_no,
        s.price_type,
        s.raffle_auction_status,
        s.created_by_manager,
        r.raffle_id,
        a.auction_id
      FROM stall s
      LEFT JOIN raffle r ON s.stall_id = r.stall_id
      LEFT JOIN auction a ON s.stall_id = a.stall_id
      WHERE s.stall_id = ? AND s.created_by_manager = ?`,
      [stallId, branchManagerId]
    );

    if (stallInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stall not found or you do not have permission to manage this stall'
      });
    }

    const stall = stallInfo[0];
    let responseMessage = '';
    let liveData = {};

    if (stall.price_type === 'Raffle' && stall.raffle_id) {
      // Update raffle status to indicate it's ready for participants
      await connection.execute(
        `UPDATE raffle 
         SET raffle_status = 'Ready for Participants', 
             updated_at = NOW() 
         WHERE raffle_id = ?`,
        [stall.raffle_id]
      );

      responseMessage = `Raffle for stall ${stall.stall_no} is now live! Participants can join and chat will be available.`;
      liveData = {
        type: 'raffle',
        raffle_id: stall.raffle_id,
        interface: 'chat',
        features: ['participant_join', 'live_chat', 'timer_display']
      };

    } else if (stall.price_type === 'Auction' && stall.auction_id) {
      // Update auction status to indicate it's ready for bidders
      await connection.execute(
        `UPDATE auction 
         SET auction_status = 'Ready for Bidders', 
             updated_at = NOW() 
         WHERE auction_id = ?`,
        [stall.auction_id]
      );

      responseMessage = `Auction for stall ${stall.stall_no} is now live! Bidding system is active.`;
      liveData = {
        type: 'auction',
        auction_id: stall.auction_id,
        interface: 'bidding',
        features: ['place_bids', 'bid_history', 'timer_display', 'highest_bid_tracker']
      };

    } else {
      return res.status(400).json({
        success: false,
        message: 'Cannot start live session for fixed price stalls or stalls without raffle/auction records'
      });
    }

    // Update stall status
    await connection.execute(
      `UPDATE stall 
       SET raffle_auction_status = 'Live' 
       WHERE stall_id = ?`,
      [stallId]
    );

    res.json({
      success: true,
      message: responseMessage,
      data: {
        stall_id: stallId,
        stall_no: stall.stall_no,
        price_type: stall.price_type,
        live_status: 'Live',
        live_system: liveData,
        frontend_action: {
          switch_interface: true,
          new_interface: liveData.interface,
          enable_features: liveData.features
        }
      }
    });

  } catch (error) {
    console.error('❌ Start live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start live session',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};