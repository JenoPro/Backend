import { createConnection } from '../../../../config/database.js'

// Select winner for raffle (manual selection or auto when timer expires)
export const selectRaffleWinner = async (req, res) => {
  let connection;
  try {
    const { raffleId } = req.params;
    const { method = 'random' } = req.body; // 'random' or 'manual'
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token'
      });
    }

    console.log(`🎯 Selecting winner for raffle ${raffleId} using ${method} method`);

    connection = await createConnection();

    // Get raffle info and verify ownership
    const [raffleInfo] = await connection.execute(
      `SELECT r.raffle_id, r.stall_id, r.raffle_status, r.total_participants,
              r.created_by_manager, r.winner_applicant_id, s.stall_no, s.rental_price
       FROM raffle r
       INNER JOIN stall s ON r.stall_id = s.stall_id
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

    // Only the branch manager who created the raffle can select winner
    if (raffle.created_by_manager !== branchManagerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the branch manager who created this raffle can select winner'
      });
    }

    // Check if winner already selected
    if (raffle.winner_applicant_id) {
      return res.status(400).json({
        success: false,
        message: 'Winner has already been selected for this raffle'
      });
    }

    // Check if there are participants
    if (raffle.total_participants === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants in this raffle'
      });
    }

    // Get all participants
    const [participants] = await connection.execute(
      `SELECT rp.participant_id, rp.applicant_id, rp.application_id,
              a.applicant_full_name, a.applicant_contact_number
       FROM raffle_participants rp
       INNER JOIN applicant a ON rp.applicant_id = a.applicant_id
       WHERE rp.raffle_id = ?`,
      [raffleId]
    );

    let winner;

    if (participants.length === 1) {
      // Automatic winner if only one participant
      winner = participants[0];
      console.log(`👑 Automatic winner (only participant): ${winner.applicant_full_name}`);
    } else {
      // Random selection
      const randomIndex = Math.floor(Math.random() * participants.length);
      winner = participants[randomIndex];
      console.log(`👑 Random winner selected: ${winner.applicant_full_name} (${randomIndex + 1}/${participants.length})`);
    }

    // Update raffle with winner
    await connection.execute(
      `UPDATE raffle 
       SET winner_applicant_id = ?, winner_selection_date = NOW(), 
           raffle_status = 'Ended', winner_selected = 1, updated_at = NOW()
       WHERE raffle_id = ?`,
      [winner.applicant_id, raffleId]
    );

    // Update participant as winner
    await connection.execute(
      'UPDATE raffle_participants SET is_winner = 1 WHERE participant_id = ?',
      [winner.participant_id]
    );

    // Update stall status
    await connection.execute(
      'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
      [raffle.stall_id]
    );

    // Create raffle result record
    await connection.execute(
      `INSERT INTO raffle_result 
       (raffle_id, winner_applicant_id, winner_application_id, total_participants,
        selection_method, awarded_by_manager, result_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Confirmed')`,
      [raffleId, winner.applicant_id, winner.application_id, 
       raffle.total_participants, method, branchManagerId]
    );

    // Update application status to approved
    await connection.execute(
      'UPDATE application SET application_status = "Approved" WHERE application_id = ?',
      [winner.application_id]
    );

    // Log the winner selection
    await connection.execute(
      `INSERT INTO raffle_auction_log 
       (stall_id, raffle_id, action_type, performed_by_manager)
       VALUES (?, ?, 'Winner Selected', ?)`,
      [raffle.stall_id, raffleId, branchManagerId]
    );

    console.log(`✅ Winner selected and raffle completed for stall ${raffle.stall_no}`);

    res.json({
      success: true,
      message: `Winner selected! ${winner.applicant_full_name} won stall ${raffle.stall_no}`,
      data: {
        raffleId: raffleId,
        stallNo: raffle.stall_no,
        winner: {
          applicantId: winner.applicant_id,
          name: winner.applicant_full_name,
          contact: winner.applicant_contact_number,
          applicationId: winner.application_id
        },
        totalParticipants: raffle.total_participants,
        selectionMethod: method,
        rentalPrice: raffle.rental_price
      }
    });

  } catch (error) {
    console.error('❌ Select raffle winner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select raffle winner',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Auto-select winner when timer expires (can be called by cron job)
export const autoSelectWinnerForExpiredRaffles = async (req, res) => {
  let connection;
  try {
    console.log('🔄 Checking for expired raffles...');

    connection = await createConnection();

    // Find all expired raffles that haven't selected winners yet
    const [expiredRaffles] = await connection.execute(
      `SELECT r.raffle_id, r.stall_id, r.total_participants, r.created_by_manager,
              s.stall_no
       FROM raffle r
       INNER JOIN stall s ON r.stall_id = s.stall_id
       WHERE r.raffle_status = 'Active'
       AND r.end_time <= NOW()
       AND r.winner_applicant_id IS NULL`
    );

    console.log(`Found ${expiredRaffles.length} expired raffles`);

    const results = [];

    for (const raffle of expiredRaffles) {
      try {
        if (raffle.total_participants === 0) {
          // No participants - just end the raffle
          await connection.execute(
            'UPDATE raffle SET raffle_status = "Ended" WHERE raffle_id = ?',
            [raffle.raffle_id]
          );
          await connection.execute(
            'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
            [raffle.stall_id]
          );

          results.push({
            raffleId: raffle.raffle_id,
            stallNo: raffle.stall_no,
            status: 'ended_no_participants'
          });

          console.log(`📝 Raffle ${raffle.raffle_id} ended - no participants`);
          continue;
        }

        // Get participants for this raffle
        const [participants] = await connection.execute(
          `SELECT rp.participant_id, rp.applicant_id, rp.application_id,
                  a.applicant_full_name
           FROM raffle_participants rp
           INNER JOIN applicant a ON rp.applicant_id = a.applicant_id
           WHERE rp.raffle_id = ?`,
          [raffle.raffle_id]
        );

        let winner;
        if (participants.length === 1) {
          winner = participants[0];
        } else {
          const randomIndex = Math.floor(Math.random() * participants.length);
          winner = participants[randomIndex];
        }

        // Update raffle with winner
        await connection.execute(
          `UPDATE raffle 
           SET winner_applicant_id = ?, winner_selection_date = NOW(), 
               raffle_status = 'Ended', winner_selected = 1
           WHERE raffle_id = ?`,
          [winner.applicant_id, raffle.raffle_id]
        );

        // Update participant as winner
        await connection.execute(
          'UPDATE raffle_participants SET is_winner = 1 WHERE participant_id = ?',
          [winner.participant_id]
        );

        // Update stall status
        await connection.execute(
          'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
          [raffle.stall_id]
        );

        // Create raffle result record
        await connection.execute(
          `INSERT INTO raffle_result 
           (raffle_id, winner_applicant_id, winner_application_id, total_participants,
            selection_method, awarded_by_manager, result_status)
           VALUES (?, ?, ?, ?, 'Random', ?, 'Confirmed')`,
          [raffle.raffle_id, winner.applicant_id, winner.application_id, 
           raffle.total_participants, raffle.created_by_manager]
        );

        // Update application status
        await connection.execute(
          'UPDATE application SET application_status = "Approved" WHERE application_id = ?',
          [winner.application_id]
        );

        results.push({
          raffleId: raffle.raffle_id,
          stallNo: raffle.stall_no,
          winner: winner.applicant_full_name,
          totalParticipants: raffle.total_participants,
          status: 'winner_selected'
        });

        console.log(`👑 Auto-selected winner for raffle ${raffle.raffle_id}: ${winner.applicant_full_name}`);

      } catch (error) {
        console.error(`❌ Error processing raffle ${raffle.raffle_id}:`, error);
        results.push({
          raffleId: raffle.raffle_id,
          stallNo: raffle.stall_no,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${expiredRaffles.length} expired raffles`,
      data: results
    });

  } catch (error) {
    console.error('❌ Auto select winners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-select winners for expired raffles',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};