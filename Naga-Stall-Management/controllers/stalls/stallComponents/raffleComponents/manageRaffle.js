import { createConnection } from '../../../../config/database.js'

// Extend raffle timer (emergency purposes)
export const extendRaffleTimer = async (req, res) => {
  let connection;
  try {
    const { raffleId } = req.params;
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

    console.log(`⏰ Extending raffle ${raffleId} timer by ${additionalHours} hours`);

    connection = await createConnection();

    // Get raffle info and verify ownership
    const [raffleInfo] = await connection.execute(
      `SELECT r.raffle_id, r.stall_id, r.end_time, r.duration_hours, r.raffle_status,
              r.created_by_manager, s.stall_no, b.branch_name
       FROM raffle r
       INNER JOIN stall s ON r.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       WHERE r.raffle_id = ?`,
      [raffleId]
    );

    if (!raffleInfo.length) {
      return res.status(404).json({
        success: false,
        message: 'Raffle not found'
      });
    }

    const raffle = raffleInfo[0];

    // Only the branch manager who created the raffle can extend it
    if (raffle.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this raffle can extend it'
      });
    }

    // Can't extend ended or cancelled raffles
    if (raffle.raffle_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend ended raffle'
      });
    }

    if (raffle.raffle_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend cancelled raffle'
      });
    }

    // Calculate new end time
    const currentEndTime = new Date(raffle.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalHours * 60 * 60 * 1000));
    const newDurationHours = raffle.duration_hours + additionalHours;

    // Update raffle
    await connection.execute(
      `UPDATE raffle 
       SET end_time = ?, duration_hours = ?, updated_at = NOW()
       WHERE raffle_id = ?`,
      [newEndTime, newDurationHours, raffleId]
    );

    // Update stall
    await connection.execute(
      `UPDATE stall 
       SET raffle_auction_end_time = ?, raffle_auction_duration_hours = ?
       WHERE stall_id = ?`,
      [newEndTime, newDurationHours, raffle.stall_id]
    );

    // Log the extension
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, raffle_id, action_type, old_end_time, new_end_time, 
        old_duration_hours, new_duration_hours, reason, performed_by_manager)
       VALUES (?, ?, 'Timer Extended', ?, ?, ?, ?, ?, ?)`,
      [raffle.stall_id, raffleId, currentEndTime, newEndTime, 
       raffle.duration_hours, newDurationHours, reason || 'Emergency extension', branchManagerId]
    );

    console.log(`✅ Raffle timer extended. New end time: ${newEndTime}`);

    res.json({
      success: true,
      message: `Raffle timer extended by ${additionalHours} hours`,
      data: {
        raffleId: raffleId,
        stallNo: raffle.stall_no,
        oldEndTime: currentEndTime,
        newEndTime: newEndTime,
        oldDurationHours: raffle.duration_hours,
        newDurationHours: newDurationHours,
        additionalHours: additionalHours,
        reason: reason || 'Emergency extension'
      }
    });

  } catch (error) {
    console.error('❌ Extend raffle timer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend raffle timer',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Cancel raffle
export const cancelRaffle = async (req, res) => {
  let connection;
  try {
    const { raffleId } = req.params;
    const { reason } = req.body;
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    console.log(`❌ Cancelling raffle ${raffleId}`);

    connection = await createConnection();

    // Get raffle info and verify ownership
    const [raffleInfo] = await connection.execute(
      `SELECT r.raffle_id, r.stall_id, r.raffle_status, r.created_by_manager, 
              s.stall_no, b.branch_name
       FROM raffle r
       INNER JOIN stall s ON r.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       WHERE r.raffle_id = ?`,
      [raffleId]
    );

    if (!raffleInfo.length) {
      return res.status(404).json({
        success: false,
        message: 'Raffle not found'
      });
    }

    const raffle = raffleInfo[0];

    // Only the branch manager who created the raffle can cancel it
    if (raffle.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this raffle can cancel it'
      });
    }

    // Can't cancel already ended raffles
    if (raffle.raffle_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ended raffle'
      });
    }

    if (raffle.raffle_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Raffle is already cancelled'
      });
    }

    // Update raffle status
    await connection.execute(
      'UPDATE raffle SET raffle_status = "Cancelled", updated_at = NOW() WHERE raffle_id = ?',
      [raffleId]
    );

    // Update stall status
    await connection.execute(
      'UPDATE stall SET raffle_auction_status = "Cancelled" WHERE stall_id = ?',
      [raffle.stall_id]
    );

    // Log the cancellation
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, raffle_id, action_type, reason, performed_by_manager)
       VALUES (?, ?, 'Cancelled', ?, ?)`,
      [raffle.stall_id, raffleId, reason || 'Cancelled by manager', branchManagerId]
    );

    console.log(`✅ Raffle cancelled for stall ${raffle.stall_no}`);

    res.json({
      success: true,
      message: `Raffle cancelled for stall ${raffle.stall_no}`,
      data: {
        raffleId: raffleId,
        stallNo: raffle.stall_no,
        reason: reason || 'Cancelled by manager'
      }
    });

  } catch (error) {
    console.error('❌ Cancel raffle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel raffle',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};