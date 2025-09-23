import { createConnection } from "../../config/database.js";

export async function createFloor(req, res) {
  const { floor_number, floor_name, description, status } = req.body;
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!floor_name || typeof floor_name !== "string")
    return res
      .status(400)
      .json({ success: false, message: "Floor name required" });
  // Validate unique floor_number for branch_manager
  let db;
  try {
    db = await createConnection();
    const [existing] = await db.execute(
      `SELECT f.* FROM floor f
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE bm.branch_manager_id = ? AND f.floor_number = ?`,
      [branch_manager_id, floor_number]
    );
    if (existing.length > 0)
      return res.status(409).json({
        success: false,
        message: "Floor number already exists for this branch manager",
      });

    // Get the branch_id for this branch manager
    const [branchResult] = await db.execute(
      "SELECT branch_id FROM branch_manager WHERE branch_manager_id = ?",
      [branch_manager_id]
    );

    if (branchResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found for this manager",
      });
    }

    const branch_id = branchResult[0].branch_id;

    const [result] = await db.execute(
      "INSERT INTO floor (branch_id, floor_number, floor_name, description, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [branch_id, floor_number, floor_name, description, status]
    );
    const floor_id = result.insertId;
    res.json({
      success: true,
      message: "Floor created successfully",
      data: { floor_id, floor_number, floor_name, description, status },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err });
  } finally {
    if (db) await db.end();
  }
}

export async function getFloors(req, res) {
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  let db;
  try {
    db = await createConnection();
    const [floors] = await db.execute(
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
    if (db) await db.end();
  }
}
