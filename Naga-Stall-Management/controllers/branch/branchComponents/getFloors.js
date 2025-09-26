import { createConnection } from '../../../config/database.js'

// Get all floors for authenticated branch manager
export const getFloors = async (req, res) => {
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  
  let connection;
  try {
    connection = await createConnection();
    const [floors] = await connection.execute(
      `SELECT f.* FROM floor f
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE bm.branch_manager_id = ?`,
      [branch_manager_id]
    );
    res.json({
      success: true,
      message: "Floors retrieved successfully",
      data: floors,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err });
  } finally {
    if (connection) await connection.end();
  }
};