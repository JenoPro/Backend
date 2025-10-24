import { createConnection } from '../../../config/database.js'

// Create new section
export const createSection = async (req, res) => {
  const { floor_id, section_name, status } = req.body;
  const userType = req.user?.userType || req.user?.role;
  const userId = req.user?.userId;

  console.log("CREATE SECTION DEBUG:");
  console.log("- User Type:", userType);
  console.log("- User ID:", userId);
  console.log("- Floor ID:", floor_id);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID not found in authentication token",
    });
  }

  // Authorization check based on user type
  if (userType === "branch_manager" || userType === "branch-manager") {
    // Branch manager authorization (existing logic)
    const branch_manager_id = req.user?.branchManagerId || userId;
    if (!branch_manager_id) {
      return res.status(401).json({ 
        success: false, 
        message: "Branch manager ID not found" 
      });
    }
  } else if (userType === "employee") {
    // Employee authorization - check permissions
    const permissions = req.user?.permissions || [];
    const hasSectionsPermission = Array.isArray(permissions)
      ? permissions.includes("sections") || permissions.includes("stalls")
      : permissions.sections || permissions.stalls || false;

    console.log("🔍 Employee permission check for section creation:", {
      permissions,
      hasSectionsPermission,
    });

    if (!hasSectionsPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Employee does not have permission to create sections.",
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: `Access denied. User type '${userType}' cannot create sections.`,
    });
  }

  if (!section_name || typeof section_name !== "string") {
    return res.status(400).json({ 
      success: false, 
      message: "Section name required" 
    });
  }
  
  let connection;
  try {
    connection = await createConnection();
    
    // Validate floor_id exists and belongs to user's branch
    let floorQuery, floorParams;
    
    if (userType === "branch_manager" || userType === "branch-manager") {
      // Branch manager: Check floor belongs to their branch
      const branch_manager_id = req.user?.branchManagerId || userId;
      floorQuery = `SELECT f.* FROM floor f
                   INNER JOIN branch b ON f.branch_id = b.branch_id
                   INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
                   WHERE f.floor_id = ? AND bm.branch_manager_id = ?`;
      floorParams = [floor_id, branch_manager_id];
    } else if (userType === "employee") {
      // Employee: Check floor belongs to their branch
      const branchId = req.user?.branchId;
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID not found for employee",
        });
      }
      floorQuery = `SELECT f.* FROM floor f
                   WHERE f.floor_id = ? AND f.branch_id = ?`;
      floorParams = [floor_id, branchId];
    }

    const [floor] = await connection.execute(floorQuery, floorParams);
    
    if (floor.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Floor not found or not accessible by this user",
      });
    }
    
    const [result] = await connection.execute(
      "INSERT INTO section (floor_id, section_name, status, created_at) VALUES (?, ?, ?, NOW())",
      [floor_id, section_name, status || 'Active']
    );
    
    const section_id = result.insertId;
    
    console.log(`✅ Section created successfully by ${userType}:`, {
      section_id,
      floor_id,
      section_name
    });

    res.json({
      success: true,
      message: "Section created successfully",
      data: {
        section_id,
        floor_id,
        section_name,
        status: status || 'Active',
      },
    });
  } catch (err) {
    console.error("❌ Create section error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error", 
      error: err.message 
    });
  } finally {
    if (connection) await connection.end();
  }
};