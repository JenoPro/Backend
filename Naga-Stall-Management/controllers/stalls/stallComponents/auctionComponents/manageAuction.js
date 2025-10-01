import { createConnection } from '../../../../config/database.js'

// Extend auction timer (emergency purposes)
export const extendAuctionTimer = async (req, res) => {
  let connection;
  try {
    const { auctionId } = req.params;
    const { additionalHours, reason } = req.body;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    if (!additionalHours || additionalHours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Additional hours must be a positive number'
      });
    }

    console.log(`⏰ Extending auction ${auctionId} timer by ${additionalHours} hours`);

    connection = await createConnection();

    // Get auction info and verify ownership
    const [auctionInfo] = await connection.execute(
      `SELECT a.auction_id, a.stall_id, a.end_time, a.duration_hours, a.auction_status,
              a.created_by_manager, s.stall_no, b.branch_name
       FROM auction a
       INNER JOIN stall s ON a.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
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

    // Only the branch manager who created the auction can extend it
    if (auction.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this auction can extend it'
      });
    }

    // Can't extend ended or cancelled auctions
    if (auction.auction_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend ended auction'
      });
    }

    if (auction.auction_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend cancelled auction'
      });
    }

    // Calculate new end time
    const currentEndTime = new Date(auction.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalHours * 60 * 60 * 1000));
    const newDurationHours = auction.duration_hours + additionalHours;

    // Update auction
    await connection.execute(
      `UPDATE auction 
       SET end_time = ?, duration_hours = ?, updated_at = NOW()
       WHERE auction_id = ?`,
      [newEndTime, newDurationHours, auctionId]
    );

    // Update stall
    await connection.execute(
      `UPDATE stall 
       SET raffle_auction_end_time = ?, raffle_auction_duration_hours = ?
       WHERE stall_id = ?`,
      [newEndTime, newDurationHours, auction.stall_id]
    );

    // Log the extension
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, auction_id, action_type, old_end_time, new_end_time, 
        old_duration_hours, new_duration_hours, reason, performed_by_manager)
       VALUES (?, ?, 'Timer Extended', ?, ?, ?, ?, ?, ?)`,
      [auction.stall_id, auctionId, currentEndTime, newEndTime, 
       auction.duration_hours, newDurationHours, reason || 'Emergency extension', branchManagerId]
    );

    console.log(`✅ Auction timer extended. New end time: ${newEndTime}`);

    res.json({
      success: true,
      message: `Auction timer extended by ${additionalHours} hours`,
      data: {
        auctionId: auctionId,
        stallNo: auction.stall_no,
        oldEndTime: currentEndTime,
        newEndTime: newEndTime,
        oldDurationHours: auction.duration_hours,
        newDurationHours: newDurationHours,
        additionalHours: additionalHours,
        reason: reason || 'Emergency extension'
      }
    });

  } catch (error) {
    console.error('❌ Extend auction timer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend auction timer',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Cancel auction
export const cancelAuction = async (req, res) => {
  let connection;
  try {
    const { auctionId } = req.params;
    const { reason } = req.body;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    console.log(`❌ Cancelling auction ${auctionId}`);

    connection = await createConnection();

    // Get auction info and verify ownership
    const [auctionInfo] = await connection.execute(
      `SELECT a.auction_id, a.stall_id, a.auction_status, a.created_by_manager, 
              s.stall_no, b.branch_name
       FROM auction a
       INNER JOIN stall s ON a.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
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

    // Only the branch manager who created the auction can cancel it
    if (auction.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this auction can cancel it'
      });
    }

    // Can't cancel already ended auctions
    if (auction.auction_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ended auction'
      });
    }

    if (auction.auction_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Auction is already cancelled'
      });
    }

    // Update auction status
    await connection.execute(
      'UPDATE auction SET auction_status = "Cancelled", updated_at = NOW() WHERE auction_id = ?',
      [auctionId]
    );

    // Update stall status
    await connection.execute(
      'UPDATE stall SET raffle_auction_status = "Cancelled" WHERE stall_id = ?',
      [auction.stall_id]
    );

    // Log the cancellation
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, auction_id, action_type, reason, performed_by_manager)
       VALUES (?, ?, 'Cancelled', ?, ?)`,
      [auction.stall_id, auctionId, reason || 'Cancelled by manager', branchManagerId]
    );

    console.log(`✅ Auction cancelled for stall ${auction.stall_no}`);

    res.json({
      success: true,
      message: `Auction cancelled for stall ${auction.stall_no}`,
      data: {
        auctionId: auctionId,
        stallNo: auction.stall_no,
        reason: reason || 'Cancelled by manager'
      }
    });

  } catch (error) {
    console.error('❌ Cancel auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel auction',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};