import { createConnection } from '../../../config/database.js';

// Decline applicant and delete all related data
export const declineApplicant = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate decline reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A detailed decline reason (at least 10 characters) is required'
      });
    }

    connection = await createConnection();
    await connection.beginTransaction();

    // Check if applicant exists and get their information
    const [applicantRows] = await connection.execute(
      `SELECT 
        a.applicant_id,
        a.applicant_full_name,
        a.applicant_contact_number,
        oi.email_address
      FROM applicant a
      LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
      WHERE a.applicant_id = ?`,
      [id]
    );

    if (applicantRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    const applicant = applicantRows[0];

    // Log the decline action before deletion
    console.log(`🗑️ Declining and deleting applicant: ${applicant.applicant_full_name} (ID: ${id})`);
    console.log(`📝 Decline reason: ${reason}`);

    // Delete all related data in the correct order (foreign key constraints)
    
    // 1. Delete from application table first (references applicant)
    await connection.execute(
      'DELETE FROM application WHERE applicant_id = ?',
      [id]
    );

    // 2. Delete from other_information table
    await connection.execute(
      'DELETE FROM other_information WHERE applicant_id = ?',
      [id]
    );

    // 3. Delete from business_information table
    await connection.execute(
      'DELETE FROM business_information WHERE applicant_id = ?',
      [id]
    );

    // 4. Delete from spouse table
    await connection.execute(
      'DELETE FROM spouse WHERE applicant_id = ?',
      [id]
    );

    // 5. Delete from credential table (if any exists)
    await connection.execute(
      'DELETE FROM credential WHERE applicant_id = ?',
      [id]
    );

    // 6. Finally delete from applicant table
    const [deleteResult] = await connection.execute(
      'DELETE FROM applicant WHERE applicant_id = ?',
      [id]
    );

    if (deleteResult.affectedRows === 0) {
      throw new Error('No applicant records were deleted');
    }

    await connection.commit();

    console.log(`✅ Applicant ${applicant.applicant_full_name} declined and all data deleted successfully`);

    res.json({
      success: true,
      message: 'Applicant declined and all data deleted successfully',
      data: {
        applicant_id: id,
        full_name: applicant.applicant_full_name,
        email: applicant.email_address,
        decline_reason: reason,
        declined_at: new Date().toISOString(),
        deleted: true
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error declining applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline applicant',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};