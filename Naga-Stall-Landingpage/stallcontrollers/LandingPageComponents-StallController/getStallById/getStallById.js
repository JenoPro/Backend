import { createConnection } from "../../../config/database.js";

// Get stall by ID
export const getStallById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await createConnection();

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name as section,
        f.floor_name as floor,
        f.floor_number,
        b.area,
        b.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE s.stall_id = ? AND s.status = 'Active' AND s.is_available = 1
    `,
      [id]
    );

    if (stalls.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stall not found or not available",
      });
    }

    res.json({
      success: true,
      message: "Stall retrieved successfully",
      data: stalls[0],
    });
  } catch (error) {
    console.error("❌ Get stall by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stall",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
