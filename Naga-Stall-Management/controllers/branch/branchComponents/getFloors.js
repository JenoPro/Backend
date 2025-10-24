import { createConnection } from '../../../config/database.js'

// Get all floors for authenticated user (branch manager or employee)
export const getFloors = async (req, res) => {
  const userType = req.user?.userType || req.user?.role;
  const userId = req.user?.userId;

  console.log("🏢 GET FLOORS DEBUG:");
  console.log("- User Type:", userType);
  console.log("- User ID:", userId);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID not found in authentication token",
    });
  }

  let connection;
  try {
    connection = await createConnection();
    let floors = [];

    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager: Get floors for their branch
      const branch_manager_id = req.user?.branchManagerId || userId;
      
      const [result] = await connection.execute(
        `SELECT f.* FROM floor f
         INNER JOIN branch b ON f.branch_id = b.branch_id
         INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
         WHERE bm.branch_manager_id = ?`,
        [branch_manager_id]
      );
      floors = result;
    } else if (userType === "employee") {
      // Employee: Get floors for their branch
      const branchId = req.user?.branchId;
      
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID not found for employee",
        });
      }

      const [result] = await connection.execute(
        `SELECT f.* FROM floor f WHERE f.branch_id = ?`,
        [branchId]
      );
      floors = result;
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. User type '${userType}' cannot access floors.`,
      });
    }

    console.log(`✅ Found ${floors.length} floors for ${userType} (ID: ${userId})`);

    res.json({
      success: true,
      message: "Floors retrieved successfully",
      data: floors,
    });
  } catch (err) {
    console.error("❌ Get floors error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error", 
      error: err.message 
    });
  } finally {
    if (connection) await connection.end();
  }
};