import { createConnection } from "../../../config/database.js";

// Get stalls by location
export const getStallsByLocation = async (req, res) => {
  let connection;
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Location parameter is required",
      });
    }

    connection = await createConnection();

    const [stalls] = await connection.execute(
      `
      SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name as section,
        f.floor_name as floor,
        f.floor_number,s
        b.area,
        b.location as branch_location,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE b.location = ? AND s.status = 'Active' AND s.is_available = 1
      ORDER BY s.stall_no, s.created_at DESC
    `,
      [location]
    );

    res.json({
      success: true,
      message: `Stalls at ${location} retrieved successfully`,
      data: stalls,
      location: location,
    });
  } catch (error) {
    console.error("❌ Get stalls by location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stalls by location",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
