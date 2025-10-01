import { createConnection } from '../../../../config/database.js'

// Create a new auction for a stall
export const createAuction = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const { durationHours = 48, startingPrice } = req.body; // Default 2 days
    
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;
    
    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    if (!startingPrice || startingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Starting price is required and must be greater than 0'
      });
    }

    console.log(`🏺 Creating auction for stall ${stallId} with ${durationHours} hours duration, starting at ₱${startingPrice}`);

    connection = await createConnection();

    // Verify stall belongs to this branch manager
    const [stallCheck] = await connection.execute(
      `SELECT s.stall_id, s.stall_no, s.price_type, s.rental_price, b.branch_name, bm.branch_manager_id
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

    if (stall.price_type !== 'Auction') {
      return res.status(400).json({
        success: false,
        message: 'Stall is not configured for auction'
      });
    }

    // Check if auction already exists
    const [existingAuction] = await connection.execute(
      'SELECT auction_id FROM auction WHERE stall_id = ?',
      [stallId]
    );

    if (existingAuction.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Auction already exists for this stall'
      });
    }

    // Create auction record
    const [result] = await connection.execute(
      `INSERT INTO auction (
        stall_id, starting_price, duration_hours, auction_status, created_by_manager, created_at
      ) VALUES (?, ?, ?, 'Waiting for Bidders', ?, NOW())`,
      [stallId, startingPrice, durationHours, branchManagerId]
    );

    // Update stall with auction info
    await connection.execute(
      `UPDATE stall 
       SET raffle_auction_duration_hours = ?,
           raffle_auction_status = 'Waiting for Bidders',
           created_by_manager = ?
       WHERE stall_id = ?`,
      [durationHours, branchManagerId, stallId]
    );

    console.log(`✅ Auction created with ID ${result.insertId} for stall ${stall.stall_no}`);

    res.status(201).json({
      success: true,
      message: `Auction created for stall ${stall.stall_no}. Timer will start when first bid is placed.`,
      data: {
        auctionId: result.insertId,
        stallId: stallId,
        stallNo: stall.stall_no,
        startingPrice: startingPrice,
        durationHours: durationHours,
        status: 'Waiting for Bidders',
        branchName: stall.branch_name
      }
    });

  } catch (error) {
    console.error('❌ Create auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create auction',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};