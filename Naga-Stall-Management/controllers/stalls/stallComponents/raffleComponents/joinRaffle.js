import { createConnection } from '../../../../config/database.js'

// Join raffle when applicant applies (triggers timer if first participant)
export const joinRaffle = async (req, res) => {
  let connection;
  try {
    const { stallId } = req.params;
    const { applicantId, applicationId } = req.body;

    console.log(`🎯 Applicant ${applicantId} joining raffle for stall ${stallId}`);

    connection = await createConnection();

    // Get raffle info
    const [raffleInfo] = await connection.execute(
      `SELECT r.raffle_id, r.duration_hours, r.raffle_status, r.start_time, r.end_time,
              s.stall_no, b.branch_name
       FROM raffle r
       INNER JOIN stall s ON r.stall_id = s.stall_id
       INNER JOIN section sec ON s.section_id = sec.section_id
       INNER JOIN floor f ON sec.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       WHERE r.stall_id = ?`,
      [stallId]
    );

    if (!raffleInfo.length) {
      return res.status(404).json({
        success: false,
        message: 'Raffle not found for this stall'
      });
    }

    const raffle = raffleInfo[0];

    // Check if raffle is still accepting participants
    if (raffle.raffle_status === 'Ended') {
      return res.status(400).json({
        success: false,
        message: 'Raffle has ended'
      });
    }

    if (raffle.raffle_status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Raffle has been cancelled'
      });
    }

    // Check if raffle has expired
    if (raffle.end_time && new Date() > new Date(raffle.end_time)) {
      // Auto-update status to ended
      await connection.execute(
        'UPDATE raffle SET raffle_status = "Ended" WHERE raffle_id = ?',
        [raffle.raffle_id]
      );
      await connection.execute(
        'UPDATE stall SET raffle_auction_status = "Ended" WHERE stall_id = ?',
        [stallId]
      );
      
      return res.status(400).json({
        success: false,
        message: 'Raffle time has expired'
      });
    }

    // Check if applicant already joined
    const [existingParticipant] = await connection.execute(
      'SELECT participant_id FROM raffle_participants WHERE raffle_id = ? AND applicant_id = ?',
      [raffle.raffle_id, applicantId]
    );

    if (existingParticipant.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Applicant has already joined this raffle'
      });
    }

    let isFirstParticipant = false;
    let startTime = raffle.start_time;
    let endTime = raffle.end_time;

    // If this is the first participant, start the timer
    if (raffle.raffle_status === 'Waiting for Participants') {
      isFirstParticipant = true;
      startTime = new Date();
      endTime = new Date(startTime.getTime() + (raffle.duration_hours * 60 * 60 * 1000));

      console.log(`🚀 First participant! Starting timer: ${raffle.duration_hours} hours`);
      console.log(`⏰ Start: ${startTime}, End: ${endTime}`);

      // Update raffle with timer
      await connection.execute(
        `UPDATE raffle 
         SET start_time = ?, end_time = ?, raffle_status = 'Active', total_participants = 1
         WHERE raffle_id = ?`,
        [startTime, endTime, raffle.raffle_id]
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
         (stall_id, raffle_id, action_type, new_end_time, new_duration_hours, performed_by_manager)
         SELECT ?, ?, 'Created', ?, ?, r.created_by_manager
         FROM raffle r WHERE r.raffle_id = ?`,
        [stallId, raffle.raffle_id, endTime, raffle.duration_hours, raffle.raffle_id]
      );
    } else {
      // Just increment participant count
      await connection.execute(
        'UPDATE raffle SET total_participants = total_participants + 1 WHERE raffle_id = ?',
        [raffle.raffle_id]
      );
    }

    // Add participant
    await connection.execute(
      'INSERT INTO raffle_participants (raffle_id, applicant_id, application_id) VALUES (?, ?, ?)',
      [raffle.raffle_id, applicantId, applicationId]
    );

    // Get updated participant count
    const [participantCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM raffle_participants WHERE raffle_id = ?',
      [raffle.raffle_id]
    );

    console.log(`✅ Applicant joined raffle. Total participants: ${participantCount[0].count}`);

    res.json({
      success: true,
      message: isFirstParticipant 
        ? `Joined raffle! Timer started: ${raffle.duration_hours} hours remaining`
        : 'Successfully joined raffle',
      data: {
        raffleId: raffle.raffle_id,
        stallNo: raffle.stall_no,
        participantCount: participantCount[0].count,
        status: isFirstParticipant ? 'Active' : raffle.raffle_status,
        startTime: startTime,
        endTime: endTime,
        isFirstParticipant: isFirstParticipant
      }
    });

  } catch (error) {
    console.error('❌ Join raffle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join raffle',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};