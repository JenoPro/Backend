import { createConnection } from '../../../config/database.js';

// Store credentials for mobile app access
export const storeCredentials = async (req, res) => {
  let connection;
  try {
    const {
      applicant_id,
      username,
      password,
      email,
      full_name,
      contact_number
    } = req.body;

    // Validate required fields
    if (!applicant_id || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Applicant ID, username, and password are required'
      });
    }

    connection = await createConnection();

    // Check if applicant exists
    const [applicantRows] = await connection.execute(
      'SELECT applicant_id FROM applicant WHERE applicant_id = ?',
      [applicant_id]
    );

    if (applicantRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found'
      });
    }

    // Check if username already exists
    const [existingCredential] = await connection.execute(
      'SELECT registrationid FROM credential WHERE user_name = ?',
      [username]
    );

    if (existingCredential.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists in mobile app credentials'
      });
    }

    // Hash the password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    // Store credentials
    const [result] = await connection.execute(
      `INSERT INTO credential (
        applicant_id, user_name, password_hash, created_date, is_active
      ) VALUES (?, ?, ?, NOW(), 1)`,
      [applicant_id, username, passwordHash]
    );

    console.log(`✅ Credentials stored for mobile app access: ${username}`);

    res.status(201).json({
      success: true,
      message: 'Credentials stored for mobile app access',
      data: {
        registration_id: result.insertId,
        applicant_id: applicant_id,
        username: username,
        created_at: new Date().toISOString(),
        is_active: true
      }
    });

  } catch (error) {
    console.error('❌ Error storing credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store credentials',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};

// Get all credentials (for admin purposes)
export const getAllCredentials = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const [credentials] = await connection.execute(`
      SELECT 
        c.registrationid,
        c.applicant_id,
        c.user_name,
        c.created_date,
        c.last_login,
        c.is_active,
        a.applicant_full_name,
        oi.email_address
      FROM credential c
      INNER JOIN applicant a ON c.applicant_id = a.applicant_id
      LEFT JOIN other_information oi ON a.applicant_id = oi.applicant_id
      ORDER BY c.created_date DESC
    `);

    res.json({
      success: true,
      data: credentials,
      count: credentials.length
    });

  } catch (error) {
    console.error('❌ Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credentials',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};