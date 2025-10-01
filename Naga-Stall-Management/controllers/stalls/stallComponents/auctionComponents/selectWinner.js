import { createConnection } from '../../../../config/database.js'

// Select winner for auction (manual confirmation or auto when timer expires)
export const selectAuctionWinner = async (req, res) => {
  let connection;
  try {
    const { auctionId } = req.params;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    console.log(`🎯 Confirming auction winner for auction ${auctionId}`);

    connection = await createConnection();

    // Get auction info and verify ownership
    const [auctionInfo] = await connection.execute(
      `SELECT a.auction_id, a.stall_id, a.auction_status, a.total_bids,
              a.created_by_manager, a.winner_applicant_id, a.highest_bidder_id,
              a.current_highest_bid, s.stall_no, s.rental_price
       FROM auction a
       INNER JOIN stall s ON a.stall_id = s.stall_id
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

    // Only the branch manager who created the auction can confirm winner
    if (auction.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this auction can confirm winner'
      });
    }

    // Check if winner already confirmed
    if (auction.winner_applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Winner has already been confirmed for this auction'
      });
    }

    // Check if there are bids
    if (auction.total_bids === 0) {
      return res.status(400).json({
        success: false,
        message: 'No bids placed in this auction'
      });
    }

    // Get winner info (highest bidder)
    const [winnerInfo] = await connection.execute(
      `SELECT ab.bid_id, ab.applicant_id, ab.application_id, ab.bid_amount,
              a.applicant_full_name, a.applicant_contact_number
       FROM auction_bids ab
       INNER JOIN applicant a ON ab.applicant_id = a.applicant_id
       WHERE ab.auction_id = ? AND ab.is_winning_bid = 1`,
      [auctionId]
    );

    if (!winnerInfo.length) {
      return res.status(400).json({
        success: false,
        message: 'No winning bid found'
      });
    }

    const winner = winnerInfo[0];

    // Update auction with confirmed winner
    await connection.execute(
      `UPDATE auction 
       SET winner_applicant_id = ?, winner_confirmed = 1, winning_bid_amount = ?,
           winner_selection_date = NOW(), auction_status = 'Ended', updated_at = NOW()
       WHERE auction_id = ?`,
      [winner.applicant_id, winner.bid_amount, auctionId]
    );

    // Update stall status
    await connection.execute(
      'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
      [auction.stall_id]
    );

    // Create auction result record
    const [bidCount] = await connection.execute(
      'SELECT COUNT(DISTINCT applicant_id) as bidders FROM auction_bids WHERE auction_id = ?',
      [auctionId]
    );

    await connection.execute(
      `INSERT INTO auction_result 
       (auction_id, winner_applicant_id, winner_application_id, winning_bid_amount,
        total_bids, total_bidders, awarded_by_manager, result_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
      [auctionId, winner.applicant_id, winner.application_id, winner.bid_amount,
       auction.total_bids, bidCount[0].bidders, branchManagerId]
    );

    // Update application status to approved
    await connection.execute(
      'UPDATE application SET application_status = "Approved" WHERE application_id = ?',
      [winner.application_id]
    );

    // Log the winner confirmation
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, auction_id, action_type, performed_by_manager)
       VALUES (?, ?, 'Winner Selected', ?)`,
      [auction.stall_id, auctionId, branchManagerId]
    );

    console.log(`✅ Winner confirmed for auction ${auctionId}: ${winner.applicant_full_name} with bid ₱${winner.bid_amount}`);

    res.json({
      success: true,
      message: `Winner confirmed! ${winner.applicant_full_name} won stall ${auction.stall_no} with bid ₱${winner.bid_amount}`,
      data: {
        auctionId: auctionId,
        stallNo: auction.stall_no,
        winner: {
          applicantId: winner.applicant_id,
          name: winner.applicant_full_name,
          contact: winner.applicant_contact_number,
          applicationId: winner.application_id,
          winningBid: parseFloat(winner.bid_amount)
        },
        totalBids: auction.total_bids,
        totalBidders: bidCount[0].bidders,
        rentalPrice: auction.rental_price
      }
    });

  } catch (error) {
    console.error('❌ Select auction winner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select auction winner',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Auto-select winner for expired auctions (can be called by cron job)
export const autoSelectWinnerForExpiredAuctions = async (req, res) => {
  let connection;
  try {
    console.log('🔄 Checking for expired auctions...');

    connection = await createConnection();

    // Find all expired auctions that haven't confirmed winners yet
    const [expiredAuctions] = await connection.execute(
      `SELECT a.auction_id, a.stall_id, a.total_bids, a.created_by_manager,
              a.highest_bidder_id, a.current_highest_bid, s.stall_no
       FROM auction a
       INNER JOIN stall s ON a.stall_id = s.stall_id
       WHERE a.auction_status = 'Active'
       AND a.end_time <= NOW()
       AND a.winner_applicant_id IS NULL`
    );

    console.log(`Found ${expiredAuctions.length} expired auctions`);

    const results = [];

    for (const auction of expiredAuctions) {
      try {
        if (auction.total_bids === 0) {
          // No bids - just end the auction
          await connection.execute(
            'UPDATE auction SET auction_status = "Ended" WHERE auction_id = ?',
            [auction.auction_id]
          );
          await connection.execute(
            'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
            [auction.stall_id]
          );

          results.push({
            auctionId: auction.auction_id,
            stallNo: auction.stall_no,
            status: 'ended_no_bids'
          });

          console.log(`📝 Auction ${auction.auction_id} ended - no bids`);
          continue;
        }

        // Get winner info (highest bidder)
        const [winnerInfo] = await connection.execute(
          `SELECT ab.applicant_id, ab.application_id, ab.bid_amount,
                  a.applicant_full_name
           FROM auction_bids ab
           INNER JOIN applicant a ON ab.applicant_id = a.applicant_id
           WHERE ab.auction_id = ? AND ab.is_winning_bid = 1`,
          [auction.auction_id]
        );

        if (winnerInfo.length === 0) {
          console.error(`❌ No winning bid found for auction ${auction.auction_id}`);
          continue;
        }

        const winner = winnerInfo[0];

        // Update auction with confirmed winner
        await connection.execute(
          `UPDATE auction 
           SET winner_applicant_id = ?, winner_confirmed = 1, winning_bid_amount = ?,
               winner_selection_date = NOW(), auction_status = 'Ended'
           WHERE auction_id = ?`,
          [winner.applicant_id, winner.bid_amount, auction.auction_id]
        );

        // Update stall status
        await connection.execute(
          'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
          [auction.stall_id]
        );

        // Create auction result record
        const [bidCount] = await connection.execute(
          'SELECT COUNT(DISTINCT applicant_id) as bidders FROM auction_bids WHERE auction_id = ?',
          [auction.auction_id]
        );

        await connection.execute(
          `INSERT INTO auction_result 
           (auction_id, winner_applicant_id, winner_application_id, winning_bid_amount,
            total_bids, total_bidders, awarded_by_manager, result_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
          [auction.auction_id, winner.applicant_id, winner.application_id, winner.bid_amount,
           auction.total_bids, bidCount[0].bidders, auction.created_by_manager]
        );

        // Update application status
        await connection.execute(
          'UPDATE application SET application_status = "Approved" WHERE application_id = ?',
          [winner.application_id]
        );

        results.push({
          auctionId: auction.auction_id,
          stallNo: auction.stall_no,
          winner: winner.applicant_full_name,
          winningBid: parseFloat(winner.bid_amount),
          totalBids: auction.total_bids,
          status: 'winner_selected'
        });

        console.log(`👑 Auto-confirmed winner for auction ${auction.auction_id}: ${winner.applicant_full_name} (₱${winner.bid_amount})`);

      } catch (error) {
        console.error(`❌ Error processing auction ${auction.auction_id}:`, error);
        results.push({
          auctionId: auction.auction_id,
          stallNo: auction.stall_no,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${expiredAuctions.length} expired auctions`,
      data: results
    });

  } catch (error) {
    console.error('❌ Auto select winners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-select winners for expired auctions',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};