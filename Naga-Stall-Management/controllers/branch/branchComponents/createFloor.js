import { createConnection } from '../../../config/database.js'

// Create new floor
export const createFloor = async (req, res) => {
  const { floor_number, floor_name, status } = req.body;
  const userType = req.user?.userType || req.user?.role;
  const userId = req.user?.userId;

  console.log("CREATE FLOOR DEBUG:");
  console.log("- User Type:", userType);
  console.log("- User ID:", userId);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID not found in authentication token",
    });
  }

  // Authorization check based on user type
  let branch_id;
  if (userType === "branch_manager" || userType === "branch-manager") {
    // Branch manager authorization (existing logic)
    const branch_manager_id = req.user?.branchManagerId || userId;
    if (!branch_manager_id) {
      return res.status(401).json({ 
        success: false, 
        message: "Branch manager ID not found" 
      });
    }

    let connection;
    try {
      connection = await createConnection();
      
      // Get the branch_id for this branch manager
      const [branchResult] = await connection.execute(
        "SELECT branch_id FROM branch_manager WHERE branch_manager_id = ?",
        [branch_manager_id]
      );

      if (branchResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Branch not found for this manager",
        });
      }

      branch_id = branchResult[0].branch_id;
    } catch (error) {
      console.error("❌ Error getting branch for manager:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get branch information",
      });
    } finally {
      if (connection) await connection.end();
    }
  } else if (userType === "employee") {
    // Employee authorization - check permissions
    const permissions = req.user?.permissions || [];
    const hasFloorsPermission = Array.isArray(permissions)
      ? permissions.includes("floors") || permissions.includes("stalls")
      : permissions.floors || permissions.stalls || false;

    console.log("🔍 Employee permission check for floor creation:", {
      permissions,
      hasFloorsPermission,
    });

    if (!hasFloorsPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Employee does not have permission to create floors.",
      });
    }

    // Get employee's branch ID
    branch_id = req.user?.branchId;
    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: "Branch ID not found for employee",
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: `Access denied. User type '${userType}' cannot create floors.`,
    });
  }

  if (!floor_name || typeof floor_name !== "string") {
    return res.status(400).json({ 
      success: false, 
      message: "Floor name required" 
    });
  }
  
  let connection;
  try {
    connection = await createConnection();
    
    // Validate unique floor_number for the branch
    const [existing] = await connection.execute(
      `SELECT f.* FROM floor f
       WHERE f.branch_id = ? AND f.floor_number = ?`,
      [branch_id, floor_number]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Floor number already exists for this branch",
      });
    }

    const [result] = await connection.execute(
      "INSERT INTO floor (branch_id, floor_number, floor_name, status, created_at) VALUES (?, ?, ?, ?, NOW())",
      [branch_id, floor_number, floor_name, status || 'Active']
    );
    
    const floor_id = result.insertId;
    
    console.log(`✅ Floor created successfully by ${userType}:`, {
      floor_id,
      floor_number,
      floor_name,
      branch_id
    });

    res.json({
      success: true,
      message: "Floor created successfully",
      data: { floor_id, floor_number, floor_name, status: status || 'Active' },
    });
  } catch (err) {
    console.error("❌ Create floor error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error", 
      error: err.message 
    });
  } finally {
    if (connection) await connection.end();
  }
};