import { createConnection } from "../../../config/database.js";

// Get all stalls for the authenticated branch manager
export const getAllStalls = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    console.log("🔍 Getting stalls for authenticated user...");
    console.log("📋 User info:", {
      userId: req.user?.userId,
      branch_id: req.user?.branch_id,
      userType: req.user?.userType,
      username: req.user?.username,
    });

    let query;
    let params = [];

    // If user is admin, get all stalls
    if (req.user?.userType === "admin") {
      query = `
        SELECT 
          s.*,
          s.stall_id as id,
          sec.section_name,
          sec.section_code,
          sec.section_id,
          f.floor_name,
          f.floor_number,
          f.floor_id,
          b.area,
          b.location as branch_location,
          b.branch_name,
          b.branch_id
        FROM stall s
        INNER JOIN section sec ON s.section_id = sec.section_id
        INNER JOIN floor f ON sec.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE s.status = 'Active'
        ORDER BY s.created_at DESC
      `;
    } else if (req.user?.userType === "branch_manager" && req.user?.branch_id) {
      // If user is branch manager, only get stalls from their branch
      query = `
        SELECT 
          s.*,
          s.stall_id as id,
          sec.section_name,
          sec.section_code,
          sec.section_id,
          f.floor_name,
          f.floor_number,
          f.floor_id,
          b.area,
          b.location as branch_location,
          b.branch_name,
          b.branch_id
        FROM stall s
        INNER JOIN section sec ON s.section_id = sec.section_id
        INNER JOIN floor f ON sec.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE s.status = 'Active' AND b.branch_id = ?
        ORDER BY s.created_at DESC
      `;
      params = [req.user.branch_id];
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Branch manager authentication required.",
      });
    }

    console.log("📝 Executing query:", query);
    console.log("📋 Query params:", params);

    const [stalls] = await connection.execute(query, params);

    console.log(`✅ Found ${stalls.length} stalls`);
    if (stalls.length > 0) {
      console.log(
        "� Sample stalls:",
        stalls.slice(0, 2).map((s) => ({
          id: s.stall_id,
          no: s.stall_no,
          branch: s.branch_name,
        }))
      );
    }

    res.json({
      success: true,
      message: "Stalls retrieved successfully",
      data: stalls,
      branch_info:
        req.user?.userType === "branch_manager"
          ? {
              branch_id: req.user.branch_id,
              branch_name: stalls[0]?.branch_name || "Unknown",
            }
          : null,
      count: stalls.length,
    });
  } catch (error) {
    console.error("❌ Get stalls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stalls",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
