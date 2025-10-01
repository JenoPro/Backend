import { createConnection } from '../../../../config/database.js'

// Place bid in auction (triggers timer if first bid)
export const placeBid = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const { applicantId, applicationId, bidAmount } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bid amount is required and must be greater than 0'
      });
    }

    console.log(`💰 Applicant ${applicantId} placing bid ₱${bidAmount} for stall ${stallId}`);

    connection = await createConnection();

    // Get auction info
    const [auctionInfo] = await connection.execute(
      `SELECT a.auction_id, a.starting_price, a.current_highest_bid, a.duration_hours, 
              a.auction_status, a.start_time, a.end_time, a.total_bids, a.highest_bidder_id,
              s.stall_no, b.branch_name
       FROM auction a
       INNER JOIN stall s ON a.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       WHERE a.stall_id = ?`,
      [stallId]
    );

    if (!auctionInfo.length) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found for this stall'
      });
    }

    const auction = auctionInfo[0];

    // Check auction status
    if (auction.auction_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Auction has ended'
      });
    }

    if (auction.auction_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Auction has been cancelled'
      });
    }

    // Check if auction has expired
    if (auction.end_time && new Date() > new Date(auction.end_time)) {
      // Auto-update status to ended
      await connection.execute(
        'UPDATE auction SET auction_status = "Ended" WHERE auction_id = ?',
        [auction.auction_id]
      );
      await connection.execute(
        'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
        [stallId]
      );
      
      return res.status(400).json({
        success: false,
        message: 'Auction time has expired'
      });
    }

    // Validate bid amount
    const minimumBid = auction.current_highest_bid ? 
      parseFloat(auction.current_highest_bid) + 1 : 
      parseFloat(auction.starting_price);

    if (parseFloat(bidAmount) < minimumBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least ₱${minimumBid}`,
        data: {
          minimumBid: minimumBid,
          currentHighestBid: auction.current_highest_bid,
          startingPrice: auction.starting_price
        }
      });
    }

    // Check if this is the same bidder trying to outbid themselves
    if (auction.highest_bidder_id === parseInt(applicantId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already the highest bidder'
      });
    }

    let isFirstBid = false;
    let startTime = auction.start_time;
    let endTime = auction.end_time;

    // If this is the first bid, start the timer
    if (auction.auction_status === 'Waiting for Bidders') {
      isFirstBid = true;
      startTime = new Date();
      endTime = new Date(startTime.getTime() + (auction.duration_hours * 60 * 60 * 1000));

      console.log(`🚀 First bid! Starting timer: ${auction.duration_hours} hours`);
      console.log(`⏰ Start: ${startTime}, End: ${endTime}`);

      // Update auction with timer
      await connection.execute(
        `UPDATE auction 
         SET start_time = ?, end_time = ?, auction_status = 'Active', 
             current_highest_bid = ?, highest_bidder_id = ?, total_bids = 1
         WHERE auction_id = ?`,
        [startTime, endTime, bidAmount, applicantId, auction.auction_id]
      );

      // Update stall status
      await connection.execute(
        `UPDATE stall 
         SET raffle_auction_status = 'Active',
             raffle_auction_start_time = ?,
             raffle_auction_end_time = ?
         WHERE stall_id = ?`,
        [startTime, endTime, stallId]
      );

      // Log the action
      await connection.execute(
        `INSERT INTO raffle_auction_log 
         (stall_id, auction_id, action_type, new_end_time, new_duration_hours, performed_by_manager)
         SELECT ?, ?, 'Created', ?, ?, a.created_by_manager
         FROM auction a WHERE a.auction_id = ?`,
        [stallId, auction.auction_id, endTime, auction.duration_hours, auction.auction_id]
      );
    } else {
      // Update current highest bid and bidder
      await connection.execute(
        `UPDATE auction 
         SET current_highest_bid = ?, highest_bidder_id = ?, total_bids = total_bids + 1
         WHERE auction_id = ?`,
        [bidAmount, applicantId, auction.auction_id]
      );
    }

    // Mark previous winning bids as no longer winning
    await connection.execute(
      'UPDATE auction_bids SET is_winning_bid = 0 WHERE auction_id = ?',
      [auction.auction_id]
    );

    // Add new bid record
    await connection.execute(
      `INSERT INTO auction_bids 
       (auction_id, applicant_id, application_id, bid_amount, bid_time, is_winning_bid)
       VALUES (?, ?, ?, ?, NOW(), 1)`,
      [auction.auction_id, applicantId, applicationId, bidAmount]
    );

    // Get updated bid count
    const [bidCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM auction_bids WHERE auction_id = ?',
      [auction.auction_id]
    );

    // Get bidder info
    const [bidderInfo] = await connection.execute(
      'SELECT applicant_full_name FROM applicant WHERE applicant_id = ?',
      [applicantId]
    );

    console.log(`✅ Bid placed successfully. New highest bid: ₱${bidAmount}`);

    res.json({
      success: true,
      message: isFirstBid 
        ? `First bid placed! Auction started: ${auction.duration_hours} hours remaining`
        : 'Bid placed successfully! You are now the highest bidder',
      data: {
        auctionId: auction.auction_id,
        stallNo: auction.stall_no,
        bidAmount: parseFloat(bidAmount),
        previousHighestBid: auction.current_highest_bid,
        totalBids: bidCount[0].count,
        bidderName: bidderInfo[0]?.applicant_full_name,
        status: isFirstBid ? 'Active' : auction.auction_status,
        startTime: startTime,
        endTime: endTime,
        isFirstBid: isFirstBid
      }
    });

  } catch (error) {
    console.error('❌ Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place bid',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};