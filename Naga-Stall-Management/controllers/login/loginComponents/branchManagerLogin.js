import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import process from 'process'
import { createConnection } from '../../../config/database.js'

const { compare } = bcrypt
const { sign } = jwt

// Branch Manager Login controller
export const branchManagerLogin = async (req, res) => {
  let connection;

  try {
    const { username, password } = req.body;

    console.log('🔐 Branch Manager login attempt:');
    console.log('- Username:', username);
    console.log('- Password length:', password ? password.length : 'undefined');

    // Validation - only username and password required
    if (!username || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    connection = await createConnection();

    // Query branch_manager table with JOIN to branch table for area/location
    console.log('🔍 Searching for branch manager with username:', username);

    const [branchManagers] = await connection.execute(
      `SELECT 
        bm.branch_manager_id, 
        bm.manager_username, 
        bm.manager_password_hash, 
        bm.branch_id,
        bm.first_name, 
        bm.last_name, 
        bm.email, 
        bm.status,
        b.area,
        b.location,
        b.branch_name
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      WHERE bm.manager_username = ? AND bm.status = ?`,
      [username, 'Active']
    );

    console.log('🔍 Found branch managers:', branchManagers.length);

    if (branchManagers.length === 0) {
      console.log('❌ No branch manager found with username:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive account',
      });
    }

    const branchManager = branchManagers[0];
    console.log('📍 Branch Manager found:', {
      id: branchManager.branch_manager_id,
      name: `${branchManager.first_name} ${branchManager.last_name}`,
      branch: branchManager.branch_name,
      area: branchManager.area,
      location: branchManager.location
    });

    // Verify password
    let isPasswordValid = false;

    if (branchManager.manager_password_hash.startsWith('$2b$') || branchManager.manager_password_hash.startsWith('$2a$')) {
      // Hashed password
      isPasswordValid = await compare(password, branchManager.manager_password_hash);
      console.log('🔐 Using bcrypt verification');
    } else {
      // Plain text password (temporary for testing)
      isPasswordValid = password === branchManager.manager_password_hash;
      console.log('🔓 Using plain text verification (NOT RECOMMENDED for production)');
    }

    console.log('🔍 Password verification result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for branch manager:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token with branch manager info
    const token = sign(
      {
        userId: branchManager.branch_manager_id,
        branchManagerId: branchManager.branch_manager_id,
        username: branchManager.manager_username,
        email: branchManager.email,
        role: 'branch_manager',
        type: 'branch_manager',
        userType: 'branch_manager',  // Add this field for consistency
        branchId: branchManager.branch_id,
        branchName: branchManager.branch_name,
        area: branchManager.area,
        location: branchManager.location,
        fullName: `${branchManager.first_name} ${branchManager.last_name}`
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ Branch Manager login successful for:', username);
    console.log('🎯 Token payload:', { 
      userId: branchManager.branch_manager_id, 
      role: 'branch_manager', 
      type: 'branch_manager',
      userType: 'branch_manager' 
    });

    res.json({
      success: true,
      message: 'Branch Manager login successful',
      token,
      user: {
        id: branchManager.branch_manager_id,
        branchManagerId: branchManager.branch_manager_id,
        username: branchManager.manager_username,
        email: branchManager.email,
        firstName: branchManager.first_name,
        lastName: branchManager.last_name,
        fullName: `${branchManager.first_name} ${branchManager.last_name}`,
        role: 'branch_manager',
        type: 'branch_manager',
        userType: 'branch_manager',  // Add this field for frontend consistency
        branch: {
          id: branchManager.branch_id,
          name: branchManager.branch_name,
          area: branchManager.area,
          location: branchManager.location
        }
      }
    });

  } catch (error) {
    console.error('❌ Branch Manager login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};