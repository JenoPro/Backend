import { createConnection } from '../../../config/database.js'

// Get stalls by filter
export const getStallsByFilter = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      });
    }

    const { status, size, available, priceMin, priceMax } = req.query;
    let whereClause = 'WHERE bm.branch_manager_id = ?';
    let queryParams = [branchManagerId];

    if (status) {
      whereClause += ' AND s.status = ?';
      queryParams.push(status);
    }

    if (size) {
      whereClause += ' AND s.size = ?';
      queryParams.push(size);
    }

    if (available !== undefined) {
      whereClause += ' AND s.is_available = ?';
      queryParams.push(available === 'true' ? 1 : 0);
    }

    if (priceMin) {
      whereClause += ' AND s.rental_price >= ?';
      queryParams.push(parseFloat(priceMin));
    }

    if (priceMax) {
      whereClause += ' AND s.rental_price <= ?';
      queryParams.push(parseFloat(priceMax));
    }

    const [stalls] = await connection.execute(
      `SELECT 
        s.*,
        s.stall_id as id,
        sec.section_name,
        f.floor_name,
        b.branch_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      ${whereClause}
      ORDER BY s.created_at DESC`,
      queryParams
    );

    res.json({
      success: true,
      message: 'Filtered stalls retrieved successfully',
      data: stalls,
      count: stalls.length,
      filters: { status, size, available, priceMin, priceMax }
    });

  } catch (error) {
    console.error('❌ Get stalls by filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filtered stalls',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
};