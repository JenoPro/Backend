import { createConnection } from "../../../config/database.js";

// Get all stalls for the authenticated user (branch manager or employee with stalls permission)
export const getAllStalls = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const userType = req.user?.userType || req.user?.role;
    const userId = req.user?.userId;

    console.log("🔍 getAllStalls - User details:", {
      userType,
      userId,
      branchId: req.user?.branchId,
      permissions: req.user?.permissions,
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in authentication token",
      });
    }

    let stalls = [];

    // Handle different user types (check both userType and role for compatibility)
    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager: Get all stalls in their branch
      const branchManagerId = req.user?.branchManagerId || userId;

      console.log("Fetching stalls for branch manager ID:", branchManagerId);

      const [result] = await connection.execute(
        `SELECT 
          s.*,
          s.stall_id as id,
          sec.section_name,
          f.floor_name,
          f.floor_number,
          bm.first_name as manager_first_name,
          bm.last_name as manager_last_name,
          b.area,
          b.location as branch_location,
          b.branch_name
        FROM stall s
        INNER JOIN section sec ON s.section_id = sec.section_id
        INNER JOIN floor f ON sec.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
        WHERE bm.branch_manager_id = ? AND s.status != 'Inactive' AND s.is_available = 1
        ORDER BY s.created_at DESC`,
        [branchManagerId]
      );

      stalls = result;
    } else if (userType === "employee") {
      // Employee: Check permissions first
      const permissions = req.user?.permissions || [];

      // Check if permissions is an array (from employee login) or object (legacy)
      let hasStallsPermission = false;
      if (Array.isArray(permissions)) {
        hasStallsPermission = permissions.includes("stalls");
      } else {
        hasStallsPermission = permissions.stalls || false;
      }

      console.log("🔍 Employee permission check:", {
        permissions,
        isArray: Array.isArray(permissions),
        hasStallsPermission,
      });

      if (!hasStallsPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Employee does not have stalls permission.",
        });
      }

      // Get employee's branch ID
      const branchId = req.user?.branchId;

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID not found for employee",
        });
      }

      console.log("Fetching stalls for employee in branch ID:", branchId);

      // Get all stalls in the employee's branch
      const [result] = await connection.execute(
        `SELECT 
          s.*,
          s.stall_id as id,
          sec.section_name,
          f.floor_name,
          f.floor_number,
          b.area,
          b.location as branch_location,
          b.branch_name
        FROM stall s
        INNER JOIN section sec ON s.section_id = sec.section_id
        INNER JOIN floor f ON sec.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE b.branch_id = ? AND s.status != 'Inactive' AND s.is_available = 1
        ORDER BY s.created_at DESC`,
        [branchId]
      );

      stalls = result;
    } else if (userType === "admin") {
      // Admin: Get all stalls
      console.log("Fetching all stalls for admin");

      const [result] = await connection.execute(
        `SELECT 
          s.*,
          s.stall_id as id,
          sec.section_name,
          f.floor_name,
          f.floor_number,
          b.area,
          b.location as branch_location,
          b.branch_name
        FROM stall s
        INNER JOIN section sec ON s.section_id = sec.section_id
        INNER JOIN floor f ON sec.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        ORDER BY s.created_at DESC`
      );

      stalls = result;
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. User type '${userType}' is not authorized to access stalls.`,
      });
    }

    console.log(
      `✅ Found ${stalls.length} stalls for ${userType} (ID: ${userId})`
    );

    res.json({
      success: true,
      message: "Stalls retrieved successfully",
      data: stalls,
      count: stalls.length,
    });
  } catch (error) {
    console.error("❌ Get all stalls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stalls",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
