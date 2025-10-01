import { createConnection } from '../../../config/database.js'

// Get floors with their sections nested (useful for hierarchical display)
export const getFloorsWithSections = async (req, res) => {
  const branch_manager_id = req.user?.branchManagerId;
  if (!branch_manager_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  
  let connection;
  try {
    connection = await createConnection();
    
    // Get floors for this branch manager
    const [floors] = await connection.execute(
      `SELECT f.floor_id as id, f.floor_number, f.floor_name as name, 
              f.status, f.created_at
       FROM floor f
       INNER JOIN branch b ON f.branch_id = b.branch_id
       INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
       WHERE bm.branch_manager_id = ?
       ORDER BY f.floor_number ASC`,
      [branch_manager_id]
    );

    // Get sections for each floor and count stalls
    const floorsWithSections = await Promise.all(
      floors.map(async (floor) => {
        const [sections] = await connection.execute(
          `SELECT s.section_id as id, s.section_name as name,
                  s.status, s.created_at,
                  COUNT(st.stall_id) as stall_count
           FROM section s
           LEFT JOIN stall st ON s.section_id = st.section_id
           WHERE s.floor_id = ?
           GROUP BY s.section_id, s.section_name, s.status, s.created_at
           ORDER BY s.section_name ASC`,
          [floor.id]
        );
        
        return {
          ...floor,
          sections: sections
        };
      })
    );

    res.json({
      success: true,
      message: "Floors with sections retrieved successfully",
      data: floorsWithSections,
    });
  } catch (err) {
    console.error('Database error:', err);
    res
      .status(500)
      .json({ success: false, message: "Database error", error: err.message });
  } finally {
    if (connection) await connection.end();
  }
};