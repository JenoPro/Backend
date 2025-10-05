import { createConnection } from '../../../config/database.js';

// Approve applicant and store credentials for mobile app access
export const approveApplicant = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    console.log(`🎯 Attempting to approve applicant ID: ${id}`);
    console.log(`📝 Received credentials:`, { username, password: password ? '***' : 'undefined' });

    // Validate required fields
    if (!username || !password) {
      console.log('❌ Missing credentials for approval');
      return res.status(400).json({
        success: false,
        message: 'Username and password are required for approval'
      });
    }

    connection = await createConnection();
    await connection.beginTransaction();

    console.log(`🔍 Checking if applicant ID ${id} exists...`);

    console.log(`🔍 Checking if applicant ID ${id} exists...`);

    // Check if applicant exists
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

    console.log(`📊 Query result: Found ${applicantRows.length} applicant(s) for ID ${id}`);

    if (applicantRows.length === 0) {
      console.log(`❌ Applicant ID ${id} not found in database`);
      
      // Let's also check what applicants DO exist
      const [allApplicants] = await connection.execute(
        'SELECT applicant_id, applicant_full_name FROM applicant ORDER BY applicant_id'
      );
      console.log(`📋 Available applicants:`, allApplicants.map(a => `ID: ${a.applicant_id}, Name: ${a.applicant_full_name}`));
      
      return res.status(404).json({
        success: false,
        message: 'Applicant not found',
        available_applicants: allApplicants.map(a => ({ id: a.applicant_id, name: a.applicant_full_name }))
      });
    }

    const applicant = applicantRows[0];

    // Check if username already exists in credential table
    const [existingCredential] = await connection.execute(
      'SELECT registrationid FROM credential WHERE user_name = ?',
      [username]
    );

    if (existingCredential.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please generate a new username.'
      });
    }

    // Hash the password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    // Store credentials in credential table for mobile app access
    await connection.execute(
      `INSERT INTO credential (
        applicant_id, user_name, password_hash, created_date, is_active
      ) VALUES (?, ?, ?, NOW(), 1)`,
      [applicant.applicant_id, username, passwordHash]
    );

    // Update application status to approved (if there are applications)
    await connection.execute(
      `UPDATE application 
       SET application_status = 'Approved', updated_at = NOW()
       WHERE applicant_id = ? AND application_status = 'Pending'`,
      [applicant.applicant_id]
    );

    await connection.commit();

    console.log(`✅ Applicant ${applicant.applicant_full_name} approved successfully with credentials`);

    res.json({
      success: true,
      message: 'Applicant approved successfully',
      data: {
        applicant_id: applicant.applicant_id,
        full_name: applicant.applicant_full_name,
        email: applicant.email_address,
        username: username,
        approved_at: new Date().toISOString()
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error approving applicant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve applicant',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};