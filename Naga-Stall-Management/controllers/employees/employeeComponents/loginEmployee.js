const Database = require("../../../../database/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const process = require("process");

/**
 * Employee login functionality - Updated to use JWT tokens
 */

class LoginEmployee {
  static async execute(req, res) {
    const db = new Database();

    try {
      const { username, password, ipAddress, userAgent } = req.body;

      console.log("🔐 Employee login attempt for username:", username);

      if (!username || !password) {
        console.log("❌ Missing username or password");
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Get employee by username
      const employee = await db.query(
        `SELECT 
                    e.employee_id,
                    e.employee_username,
                    e.employee_password_hash,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.permissions,
                    e.status,
                    e.password_reset_required,
                    b.branch_name,
                    b.branch_id
                FROM employee e
                LEFT JOIN branch b ON e.branch_id = b.branch_id
                WHERE e.employee_username = ?`,
        [username]
      );

      console.log("🔍 Found employees:", employee.length);

      if (employee.length === 0) {
        console.log("❌ No employee found with username:", username);
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      const emp = employee[0];

      // Check if employee is active
      if (emp.status !== "Active") {
        console.log("❌ Employee account is not active:", username);
        return res.status(401).json({
          success: false,
          message: "Account is not active. Contact your administrator.",
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(
        password,
        emp.employee_password_hash
      );
      if (!passwordValid) {
        console.log("❌ Invalid password for employee:", username);
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Parse permissions
      const permissions = emp.permissions ? JSON.parse(emp.permissions) : {};

      // Generate JWT token (consistent with admin/branch manager login)
      const token = jwt.sign(
        {
          userId: emp.employee_id,
          username: emp.employee_username,
          email: emp.email,
          role: "employee",
          type: "employee",
          userType: "employee",
          branchId: emp.branch_id,
          permissions: permissions,
        },
        process.env.JWT_SECRET ||
          "your-super-secret-jwt-key-change-this-in-production",
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Generate session token for database record (not for authentication)
      const sessionToken = this.generateSessionToken();

      // Create session record
      await db.query(
        `INSERT INTO employee_session 
                (employee_id, session_token, ip_address, user_agent, is_active) 
                VALUES (?, ?, ?, ?, true)`,
        [emp.employee_id, sessionToken, ipAddress, userAgent]
      );

      // Update last login
      await db.query(
        "UPDATE employee SET last_login = NOW() WHERE employee_id = ?",
        [emp.employee_id]
      );

      // Log login activity
      await db.query(
        `INSERT INTO employee_activity_log 
                (employee_id, action_type, action_description, ip_address, user_agent) 
                VALUES (?, 'login', 'Employee logged in', ?, ?)`,
        [emp.employee_id, ipAddress, userAgent]
      );

      console.log("✅ Employee login successful for:", username);
      console.log("🎯 JWT Token generated:", token.substring(0, 50) + "...");
      console.log("🎯 JWT Token length:", token.length);
      console.log("🎯 Session Token generated:", sessionToken);
      console.log("🎯 Token payload:", {
        userId: emp.employee_id,
        role: "employee",
        type: "employee",
        userType: "employee",
        permissions: permissions,
      });

      // Remove password hash from response
      const { employee_password_hash, ...employeeData } = emp;

      // Return response in format expected by frontend
      res.json({
        success: true,
        message: "Login successful",
        data: {
          token: token, // ✅ JWT token at data.token level (as frontend expects)
          employee: {
            employee_id: emp.employee_id,
            employee_username: emp.employee_username,
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            branch_id: emp.branch_id,
            branch_name: emp.branch_name,
            permissions: permissions,
            password_reset_required: emp.password_reset_required,
            full_name: `${emp.first_name} ${emp.last_name}`,
            role: "employee",
            type: "employee",
            userType: "employee"
          },
          // Keep session info for backward compatibility
          session: {
            token: sessionToken,
            expires_in: "24h",
          }
        }
      });
    } catch (error) {
      console.error("❌ Error in employee login:", error);
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
      });
    }
  }

  static generateSessionToken() {
    // Generate a random UUID-like string for database session tracking
    const crypto = require('crypto');
    return crypto.randomUUID();
  }
}

module.exports = LoginEmployee;
