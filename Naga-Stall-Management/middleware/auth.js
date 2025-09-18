import jwt from "jsonwebtoken";
import process from "process";
import { createConnection } from "../config/database.js";

const { verify } = jwt;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  verify(
    token,
    process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production",
    async (err, decoded) => {
      if (err) {
        console.error("Token verification error:", err);

        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Token expired",
          });
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({
            success: false,
            message: "Invalid token",
          });
        } else {
          return res.status(403).json({
            success: false,
            message: "Token verification failed",
          });
        }
      }

      // Add decoded user information to request
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        userType: decoded.userType, // 'admin' or 'branch_manager'
        area: decoded.area,
        location: decoded.location,
        branchManagerId: decoded.branchManagerId || decoded.userId,
        // IMPORTANT: Add branch_id for branch managers
        branch_id: decoded.branch_id, // Get branch_id directly from token
        // Keep legacy role field for backward compatibility
        role: decoded.userType === "admin" ? "admin" : "branch_manager",
      };

      // FALLBACK: If branch_id is missing from token but user is branch_manager,
      // look it up from database (for old tokens)
      if (decoded.userType === "branch_manager" && !decoded.branch_id) {
        console.log(
          "⚠️ branch_id missing from token, looking up from database..."
        );
        let connection;
        try {
          connection = await createConnection();
          const [branchManagers] = await connection.execute(
            `SELECT bm.branch_id 
             FROM branch_manager bm 
             WHERE bm.branch_manager_id = ? AND bm.status = 'Active'`,
            [decoded.branchManagerId || decoded.userId]
          );

          if (branchManagers.length > 0) {
            req.user.branch_id = branchManagers[0].branch_id;
            console.log(
              "✅ Found branch_id from database:",
              req.user.branch_id
            );
          } else {
            console.log("❌ Branch manager not found in database");
          }
        } catch (dbError) {
          console.error("❌ Database lookup error:", dbError);
        } finally {
          if (connection) await connection.end();
        }
      }

      console.log(
        "Authenticated user:",
        req.user.username,
        "Type:",
        req.user.userType,
        "Branch ID:",
        req.user.branch_id || "N/A"
      );
      next();
    }
  );
};

// Updated role authorization for naga_stall system
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check both userType and legacy role for compatibility
    const userRole = req.user.userType || req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(
          " or "
        )}, but user has: ${userRole}`,
      });
    }

    next();
  };
};

// Specific middleware for branch manager authentication
const authenticateBranchManager = (req, res, next) => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.userType !== "branch_manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Branch manager access required.",
      });
    }

    // Ensure branch manager ID is available for stall filtering
    if (!req.user.branchManagerId) {
      return res.status(400).json({
        success: false,
        message: "Branch manager ID not found in token",
      });
    }

    next();
  });
};

// Specific middleware for admin authentication
const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin access required.",
      });
    }

    next();
  });
};

// General authentication that accepts both admin and branch manager
const authenticateUser = authenticateToken;

export default {
  authenticateToken,
  authenticateUser,
  authenticateBranchManager,
  authenticateAdmin,
  authorizeRole,
};
