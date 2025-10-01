import { createConnection } from '../../../../config/database.js'

// Get all active auctions for a branch manager
export const getActiveAuctions = async (req, res) => {
  let connection;
  try {
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    connection = await createConnection();

    // Get all auctions for this branch manager
    const [auctions] = await connection.execute(
      `SELECT 
        a.auction_id,
        a.stall_id,
        s.stall_no,
        s.stall_location,
        s.rental_price,
        a.starting_price,
        a.current_highest_bid,
        a.duration_hours,
        a.start_time,
        a.end_time,
        a.auction_status,
        a.total_bids,
        a.highest_bidder_id,
        a.winner_applicant_id,
        hb.applicant_full_name as highest_bidder_name,
        w.applicant_full_name as winner_name,
        b.branch_name,
        f.floor_name,
        sec.section_name,
        CASE 
          WHEN a.end_time IS NULL THEN 'Waiting for bidders'
          WHEN NOW() >= a.end_time THEN 'Expired'
          ELSE CONCAT(
            FLOOR(TIMESTAMPDIFF(SECOND, NOW(), a.end_time) / 3600), 'h ',
            FLOOR((TIMESTAMPDIFF(SECOND, NOW(), a.end_time) % 3600) / 60), 'm ',
            (TIMESTAMPDIFF(SECOND, NOW(), a.end_time) % 60), 's'
          )
        END as time_remaining,
        TIMESTAMPDIFF(SECOND, NOW(), a.end_time) as seconds_remaining
      FROM auction a
      INNER JOIN stall s ON a.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      LEFT JOIN applicant hb ON a.highest_bidder_id = hb.applicant_id
      LEFT JOIN applicant w ON a.winner_applicant_id = w.applicant_id
      WHERE bm.branch_manager_id = ?
      ORDER BY 
        CASE a.auction_status
          WHEN 'Active' THEN 1
          WHEN 'Waiting for Bidders' THEN 2
          WHEN 'Ended' THEN 3
          ELSE 4
        END,
        a.created_at DESC`,
      [branchManagerId]
    );

    console.log(`📋 Found ${auctions.length} auctions for branch manager ${branchManagerId}`);

    res.json({
      success: true,
      message: 'Auctions retrieved successfully',
      data: auctions,
      counts: {
        total: auctions.length,
        active: auctions.filter(a => a.auction_status === 'Active').length,
        waiting: auctions.filter(a => a.auction_status === 'Waiting for Bidders').length,
        ended: auctions.filter(a => a.auction_status === 'Ended').length
      }
    });

  } catch (error) {
    console.error('❌ Get active auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve auctions',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Get auction details including bid history
export const getAuctionDetails = async (req, res) => {
  let connection;
  try {
    const { auctionId } = req.params;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    connection = await createConnection();

    // Get auction info
    const [auctionInfo] = await connection.execute(
      `SELECT 
        a.auction_id,
        a.stall_id,
        s.stall_no,
        s.stall_location,
        s.rental_price,
        a.starting_price,
        a.current_highest_bid,
        a.duration_hours,
        a.start_time,
        a.end_time,
        a.auction_status,
        a.total_bids,
        a.highest_bidder_id,
        a.winner_applicant_id,
        a.created_by_manager,
        hb.applicant_full_name as highest_bidder_name,
        hb.applicant_contact_number as highest_bidder_contact,
        w.applicant_full_name as winner_name,
        b.branch_name,
        f.floor_name,
        sec.section_name,
        CASE 
          WHEN a.end_time IS NULL THEN 'Waiting for bidders'
          WHEN NOW() >= a.end_time THEN 'Expired'
          ELSE CONCAT(
            FLOOR(TIMESTAMPDIFF(SECOND, NOW(), a.end_time) / 3600), 'h ',
            FLOOR((TIMESTAMPDIFF(SECOND, NOW(), a.end_time) % 3600) / 60), 'm ',
            (TIMESTAMPDIFF(SECOND, NOW(), a.end_time) % 60), 's'
          )
        END as time_remaining,
        TIMESTAMPDIFF(SECOND, NOW(), a.end_time) as seconds_remaining
      FROM auction a
      INNER JOIN stall s ON a.stall_id = s.stall_id
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN applicant hb ON a.highest_bidder_id = hb.applicant_id
      LEFT JOIN applicant w ON a.winner_applicant_id = w.applicant_id
      WHERE a.auction_id = ?`,
      [auctionId]
    );

    if (!auctionInfo.length) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const auction = auctionInfo[0];

    // Check if this branch manager owns this auction
    if (auction.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this auction'
      });
    }

    // Get bid history
    const [bidHistory] = await connection.execute(
      `SELECT 
        ab.bid_id,
        ab.applicant_id,
        a.applicant_full_name,
        a.applicant_contact_number,
        a.applicant_address,
        ab.bid_amount,
        ab.bid_time,
        ab.is_winning_bid
      FROM auction_bids ab
      INNER JOIN applicant a ON ab.applicant_id = a.applicant_id
      WHERE ab.auction_id = ?
      ORDER BY ab.bid_time DESC`,
      [auctionId]
    );

    // Get unique bidders count
    const [uniqueBidders] = await connection.execute(
      `SELECT COUNT(DISTINCT applicant_id) as count 
       FROM auction_bids 
       WHERE auction_id = ?`,
      [auctionId]
    );

    res.json({
      success: true,
      message: 'Auction details retrieved successfully',
      data: {
        ...auction,
        bidHistory: bidHistory,
        uniqueBiddersCount: uniqueBidders[0].count
      }
    });

  } catch (error) {
    console.error('❌ Get auction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve auction details',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};