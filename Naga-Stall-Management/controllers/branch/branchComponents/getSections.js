import { createConnection } from '../../../config/database.js'

// Get all sections for authenticated branch manager
export const getSections = async (req, res) => {
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  
  let connection;
  try {
    connection = await createConnection();
    // Get all sections for floors owned by this branch manager
    const [sections] = await connection.execute(
      `SELECT s.* FROM section s
       INNER JOIN floor f ON s.floor_id = f.floor_id
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE bm.branch_manager_id = ?`,
      [branch_manager_id]
    );
    res.json({
      success: true,
      message: "Sections retrieved successfully",
      data: sections,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err });
  } finally {
    if (connection) await connection.end();
  }
};