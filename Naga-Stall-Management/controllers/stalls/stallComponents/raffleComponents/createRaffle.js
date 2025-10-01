import { createConnection } from '../../../../config/database.js'

// Create a new raffle for a stall
export const createRaffle = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const { durationHours = 72 } = req.body; // Default 3 days
    
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;
    
    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    console.log(`🎯 Creating raffle for stall ${stallId} with ${durationHours} hours duration`);

    connection = await createConnection();

    // Verify stall belongs to this branch manager
    const [stallCheck] = await connection.execute(
      `SELECT s.stall_id, s.stall_no, s.price_type, b.branch_name, bm.branch_manager_id
       FROM stall s
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE s.stall_id = ? AND bm.branch_manager_id = ?`,
      [stallId, branchManagerId]
    );

    if (!stallCheck.length) {
      return res.status(403).json({
        success: false,
        message: 'Stall not found or not authorized for this branch manager'
      });
    }

    const stall = stallCheck[0];

    if (stall.price_type !== 'Raffle') {
      return res.status(400).json({
        success: false,
        message: 'Stall is not configured for raffle'
      });
    }

    // Check if raffle already exists
    const [existingRaffle] = await connection.execute(
      'SELECT raffle_id FROM raffle WHERE stall_id = ?',
      [stallId]
    );

    if (existingRaffle.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Raffle already exists for this stall'
      });
    }

    // Create raffle record
    const [result] = await connection.execute(
      `INSERT INTO raffle (
        stall_id, duration_hours, raffle_status, created_by_manager, created_at
      ) VALUES (?, ?, 'Waiting for Participants', ?, NOW())`,
      [stallId, durationHours, branchManagerId]
    );

    // Update stall with raffle info
    await connection.execute(
      `UPDATE stall 
       SET raffle_auction_duration_hours = ?,
           raffle_auction_status = 'Waiting for Participants',
           created_by_manager = ?
       WHERE stall_id = ?`,
      [durationHours, branchManagerId, stallId]
    );

    console.log(`✅ Raffle created with ID ${result.insertId} for stall ${stall.stall_no}`);

    res.status(201).json({
      success: true,
      message: `Raffle created for stall ${stall.stall_no}. Timer will start when first applicant applies.`,
      data: {
        raffleId: result.insertId,
        stallId: stallId,
        stallNo: stall.stall_no,
        durationHours: durationHours,
        status: 'Waiting for Participants',
        branchName: stall.branch_name
      }
    });

  } catch (error) {
    console.error('❌ Create raffle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create raffle',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};