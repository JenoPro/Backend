import { createConnection } from "../../../config/database.js";

// Get available areas
export const getAvailableAreas = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();

    const [areas] = await connection.execute(
      'SELECT DISTINCT area FROM branch WHERE status = "Active" ORDER BY area'
    );

    // Format the data to match frontend expectations
    // Frontend expects array of objects with 'area' property
    const areaList = areas.map((row) => ({
      area: row.area,
    }));

    console.log(
      `📍 Found ${areaList.length} available areas:`,
      areaList.map((a) => a.area)
    );

    res.json({
      success: true,
      message: "Available areas retrieved successfully",
      data: areaList,
    });
  } catch (error) {
    console.error("❌ Get available areas error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available areas",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
