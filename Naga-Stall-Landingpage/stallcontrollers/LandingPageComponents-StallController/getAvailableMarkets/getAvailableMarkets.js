import { createConnection } from '../../../config/database.js'

// Get available markets
export const getAvailableMarkets = async (req, res) => {
  let connection
  try {
    connection = await createConnection()

    const [markets] = await connection.execute(`
      SELECT 
        bm.area,
        bm.location,
        COUNT(s.stall_id) as total_stalls,
        SUM(CASE WHEN s.is_available = 1 THEN 1 ELSE 0 END) as available_stalls,
        MIN(s.rental_price) as min_price,
        MAX(s.rental_price) as max_price,
        AVG(s.rental_price) as avg_price
      FROM branch_manager bm
      LEFT JOIN floor f ON bm.branch_manager_id = f.branch_manager_id
      LEFT JOIN section sec ON f.floor_id = sec.floor_id
      LEFT JOIN stall s ON sec.section_id = s.section_id AND s.status = 'Active'
      WHERE bm.status = 'Active'
      GROUP BY bm.area, bm.location, bm.branch_manager_id
      HAVING total_stalls > 0
      ORDER BY bm.area, bm.location
    `)

    res.json({
      success: true,
      message: 'Available markets retrieved successfully',
      data: markets,
      count: markets.length,
    })
  } catch (error) {
    console.error('❌ Get available markets error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available markets',
      error: error.message,
    })
  } finally {
    if (connection) await connection.end()
  }
}