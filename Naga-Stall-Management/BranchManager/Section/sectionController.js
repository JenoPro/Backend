import { createConnection } from "../../config/database.js";

export async function createSection(req, res) {
  const { floor_id, section_name, section_code, description, status } =
    req.body;
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!section_name || typeof section_name !== "string")
    return res
      .status(400)
      .json({ success: false, message: "Section name required" });
  // Validate floor_id exists and belongs to branch_manager
  let db;
  try {
    db = await createConnection();
    const [floor] = await db.execute(
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
    // Validate unique section_code within floor
    const [existing] = await db.execute(
      "SELECT * FROM section WHERE floor_id = ? AND section_code = ?",
      [floor_id, section_code]
    );
    if (existing.length > 0)
      return res.status(409).json({
        success: false,
        message: "Section code already exists for this floor",
      });
    const [result] = await db.execute(
      "INSERT INTO section (floor_id, section_name, section_code, description, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [floor_id, section_name, section_code, description, status]
    );
    const section_id = result.insertId;
    res.json({
      success: true,
      message: "Section created successfully",
      data: {
        section_id,
        floor_id,
        section_name,
        section_code,
        description,
        status,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err });
  } finally {
    if (db) await db.end();
  }
}

export async function getSections(req, res) {
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  let db;
  try {
    db = await createConnection();
    // Get all sections for floors owned by this branch manager
    const [sections] = await db.execute(
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
    if (db) await db.end();
  }
}
