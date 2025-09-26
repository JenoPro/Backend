import bcrypt from 'bcrypt'
import { createConnection } from '../../../config/database.js'

// Create admin user (only for super admin or initial setup)
export const createAdminUser = async (req, res) => {
  let connection;
  try {
    const {
      admin_username,
      password,
      email,
      first_name,
      last_name,
      status = 'Active'
    } = req.body;

    // Validation
    if (!admin_username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and email are required'
      });
    }

    connection = await createConnection();

    // Check if username already exists
    const [existingAdmin] = await connection.execute(
      'SELECT admin_id FROM admin WHERE admin_username = ?',
      [admin_username]
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const [result] = await connection.execute(
      `INSERT INTO admin (admin_username, admin_password_hash, email, first_name, last_name, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [admin_username, password_hash, email, first_name, last_name, status]
    );

    const adminId = result.insertId;

    console.log('✅ Admin user created successfully:', admin_username);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: adminId,
        username: admin_username,
        email: email,
        first_name,
        last_name,
        status
      }
    });

  } catch (error) {
    console.error('❌ Create admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};