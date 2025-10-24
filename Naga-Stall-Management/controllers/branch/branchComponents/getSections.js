import { createConnection } from '../../../config/database.js'

// Get all sections for authenticated user (branch manager or employee)
export const getSections = async (req, res) => {
  const userType = req.user?.userType || req.user?.role;
  const userId = req.user?.userId;

  console.log("🏗️ GET SECTIONS DEBUG:");
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
    let sections = [];

    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager: Get sections for their branch
      const branch_manager_id = req.user?.branchManagerId || userId;
      
      const [result] = await connection.execute(
        `SELECT s.* FROM section s
         INNER JOIN floor f ON s.floor_id = f.floor_id
         INNER JOIN branch b ON f.branch_id = b.branch_id
         INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
         WHERE bm.branch_manager_id = ?`,
        [branch_manager_id]
      );
      sections = result;
    } else if (userType === "employee") {
      // Employee: Get sections for their branch
      const branchId = req.user?.branchId;
      
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID not found for employee",
        });
      }

      const [result] = await connection.execute(
        `SELECT s.* FROM section s
         INNER JOIN floor f ON s.floor_id = f.floor_id
         WHERE f.branch_id = ?`,
        [branchId]
      );
      sections = result;
    } else {
      return res.status(403).json({
        success: false,
        message: `Access denied. User type '${userType}' cannot access sections.`,
      });
    }

    console.log(`✅ Found ${sections.length} sections for ${userType} (ID: ${userId})`);

    res.json({
      success: true,
      message: "Sections retrieved successfully",
      data: sections,
    });
  } catch (err) {
    console.error("❌ Get sections error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error", 
      error: err.message 
    });
  } finally {
    if (connection) await connection.end();
  }
};