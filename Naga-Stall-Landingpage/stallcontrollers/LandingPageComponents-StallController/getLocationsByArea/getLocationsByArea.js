import { createConnection } from "../../../config/database.js";

// Get locations by area or branch (supports both for backward compatibility)
export const getLocationsByArea = async (req, res) => {
  let connection;
  try {
    const { area, branch } = req.query;

    // Support both branch (new) and area (legacy) parameters
    const filterParam = branch || area;
    const filterType = branch ? 'branch' : 'area';
    const filterColumn = branch ? 'branch_name' : 'area';

    if (!filterParam) {
      console.log("❌ No area or branch parameter provided");
      return res.status(400).json({
        success: false,
        message: "Area or branch parameter is required",
      });
    }

    connection = await createConnection();

    // Query locations based on branch_name (preferred) or area (legacy)
    const [locations] = await connection.execute(
      `SELECT DISTINCT location, branch_name as branch FROM branch WHERE ${filterColumn} = ? AND status = "Active" ORDER BY location`,
      [filterParam]
    );

    // Format the data to include both location and branch information
    const locationList = locations.map((row) => ({
      id: row.location, // For compatibility
      location: row.location,
      branch: row.branch, // Include branch name in response
      value: row.location,
    }));
    
    console.log(
      `✅ Found locations in ${filterType} '${filterParam}':`,
      locationList.map((l) => l.location)
    );

    res.json({
      success: true,
      message: `Locations in ${filterParam} retrieved successfully`,
      data: locationList,
      [filterType]: filterParam, // Include the filter parameter in response
    });
  } catch (error) {
    console.error("❌ Get locations by area/branch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve locations",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
