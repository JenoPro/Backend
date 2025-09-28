import { createConnection } from '../../../config/database.js'

// Create new section
export const createSection = async (req, res) => {
  const { floor_id, section_name, status } = req.body;
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!section_name || typeof section_name !== "string")
    return res
      .status(400)
      .json({ success: false, message: "Section name required" });
  
  let connection;
  try {
    connection = await createConnection();
    
    // Validate floor_id exists and belongs to branch_manager
    const [floor] = await connection.execute(
      `SELECT f.* FROM floor f
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE f.floor_id = ? AND bm.branch_manager_id = ?`,
      [floor_id, branch_manager_id]
    );
    if (floor.length === 0)
      return res.status(404).json({
        success: false,
        message: "Floor not found or not owned by branch manager",
      });
    
    const [result] = await connection.execute(
      "INSERT INTO section (floor_id, section_name, status, created_at) VALUES (?, ?, ?, NOW())",
      [floor_id, section_name, status]
    );
    const section_id = result.insertId;
    res.json({
      success: true,
      message: "Section created successfully",
      data: {
        section_id,
        floor_id,
        section_name,
        status,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err });
  } finally {
    if (connection) await connection.end();
  }
};