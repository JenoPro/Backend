// Fixed backend controller
export const getStallsByFilter = async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    
    // Debug user information
    console.log('🔍 Filter request received from user:', {
      userId: req.user?.userId,
      branchManagerId: req.user?.branchManagerId,
      username: req.user?.username,
      userType: req.user?.userType,
      role: req.user?.role
    });
    
    // Debug query parameters
    console.log('🔍 Filter parameters received:', req.query);
    
    const branchManagerId = req.user?.branchManagerId || req.user?.userId;

    if (!branchManagerId) {
      console.log('❌ No branch manager ID found in token');
      return res.status(400).json({
        success: false,
        message: 'Branch manager ID not found in authentication token',
      });
    }
    
    console.log('✅ Using branch manager ID:', branchManagerId);

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
        s.stall_no as stallNumber,
        s.stall_location as location,
        s.rental_price,
        s.price_type,
        s.status,
        s.is_available as isAvailable,
        s.description,
        s.stall_image,
        sec.section_id,
        sec.section_name,
        f.floor_id,
        f.floor_name,
        b.branch_id,
        b.branch_name,
        CONCAT('₱', FORMAT(s.rental_price, 0)) as price
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      ${whereClause}
      ORDER BY s.created_at DESC`,
      queryParams
    );

    console.log('🔍 Query executed:', whereClause);
    console.log('🔍 Query parameters:', queryParams);
    console.log('✅ Query returned', stalls.length, 'stalls');

    // Format the data to match frontend expectations
    const formattedStalls = stalls.map(stall => ({
      ...stall,
      // Ensure price formatting matches frontend expectations
      price: stall.price_type === 'Fixed Price' 
        ? `Fixed Price - ₱${stall.rental_price.toLocaleString()}` 
        : `${stall.price_type} - ₱${stall.rental_price.toLocaleString()}`
    }));

    res.json({
      success: true,
      message: 'Filtered stalls retrieved successfully',
      data: formattedStalls,
      count: formattedStalls.length,
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