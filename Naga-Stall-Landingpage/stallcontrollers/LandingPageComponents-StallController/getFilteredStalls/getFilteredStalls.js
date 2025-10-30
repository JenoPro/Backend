import { createConnection } from "../../../config/database.js";

// Get filtered stalls (supports both area and branch parameters)
export const getFilteredStalls = async (req, res) => {
  let connection;
  try {
    const {
      area,
      branch,
      location,
      section,
      search,
      minPrice,
      maxPrice,
      priceRange,
      availability,
      sortBy = "default",
      limit = 50,
    } = req.query;

    connection = await createConnection();

    let query = `
      SELECT 
        s.stall_id as id,
        s.stall_no as stallNumber,
        s.stall_location as location,
        s.size as dimensions,
        s.rental_price,
        s.price_type,
        s.status,
        s.description,
        s.stall_image as imageUrl,
        s.is_available as isAvailable,
        sec.section_name as section,
        f.floor_name as floor,
        f.floor_number,
        b.area,
        b.location as branchLocation,
        b.branch_name as branch,
        bm.first_name as manager_first_name,
        bm.last_name as manager_last_name
      FROM stall s
      INNER JOIN section sec ON s.section_id = sec.section_id
      INNER JOIN floor f ON sec.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      LEFT JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE s.status = 'Active' AND s.is_available = 1
    `;

    const queryParams = [];

    // Support both branch (new) and area (legacy) filters
    const filterParam = branch || area;
    const filterColumn = branch ? "branch_name" : "area";

    if (filterParam) {
      query += ` AND b.${filterColumn} = ?`;
      queryParams.push(filterParam);
    }

    // Location filter
    if (location) {
      query += " AND b.location = ?";
      queryParams.push(location);
    }

    // Section filter
    if (section) {
      query += " AND sec.section_name = ?";
      queryParams.push(section);
    }

    // Availability filter
    if (availability !== undefined) {
      const isAvailable = availability === "true" || availability === true;
      query += " AND s.is_available = ?";
      queryParams.push(isAvailable ? 1 : 0);
    }

    // Search filter (enhanced to include branch names)
    if (search) {
      query += ` AND (
        s.stall_no LIKE ? OR 
        s.stall_location LIKE ? OR 
        s.description LIKE ? OR
        b.area LIKE ? OR
        b.branch_name LIKE ? OR
        b.location LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    // Price range filters
    if (minPrice && !isNaN(minPrice)) {
      query += " AND s.rental_price >= ?";
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice && !isNaN(maxPrice)) {
      query += " AND s.rental_price <= ?";
      queryParams.push(parseFloat(maxPrice));
    }

    // Handle priceRange parameter (e.g., "1000-5000")
    if (priceRange && typeof priceRange === "string") {
      const [min, max] = priceRange.split("-").map((p) => parseFloat(p.trim()));
      if (!isNaN(min)) {
        query += " AND s.rental_price >= ?";
        queryParams.push(min);
      }
      if (!isNaN(max)) {
        query += " AND s.rental_price <= ?";
        queryParams.push(max);
      }
    }

    // Sorting
    let orderBy = "s.created_at DESC";
    if (sortBy === "price-low") {
      orderBy = "s.rental_price ASC";
    } else if (sortBy === "price-high") {
      orderBy = "s.rental_price DESC";
    } else if (sortBy === "newest") {
      orderBy = "s.created_at DESC";
    } else if (sortBy === "oldest") {
      orderBy = "s.created_at ASC";
    }

    query += ` ORDER BY ${orderBy} LIMIT ?`;
    queryParams.push(parseInt(limit));

    const [stalls] = await connection.execute(query, queryParams);

    // Format stalls to match the expected frontend response structure
    const formattedStalls = stalls.map((stall) => {
      // Safely format the price
      let formattedPrice = "Contact for pricing";
      if (stall.rental_price !== null && stall.rental_price !== undefined && !isNaN(stall.rental_price)) {
        const price = parseFloat(stall.rental_price);
        if (price > 0) {
          formattedPrice = `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/month`;
        }
      }

      return {
        id: stall.id,
        stallNumber: stall.stallNumber,
        branch: stall.branch,
        branchLocation: stall.branchLocation,
        price: formattedPrice,
        dimensions: stall.dimensions || "Contact for details",
        floor: stall.floor,
        section: stall.section,
        isAvailable: Boolean(stall.isAvailable),
        description: stall.description || "Perfect for business",
        imageUrl: stall.imageUrl || "stall-image.jpg",
      };
    });

    console.log(
      `✅ Found ${formattedStalls.length} filtered stalls ${
        filterParam ? `in ${branch ? "branch" : "area"} '${filterParam}'` : ""
      }`
    );

    res.json({
      success: true,
      message: "Filtered stalls retrieved successfully",
      data: formattedStalls,
      filters: {
        area,
        branch,
        location,
        section,
        search,
        minPrice,
        maxPrice,
        priceRange,
        availability,
        sortBy,
        limit,
      },
      count: formattedStalls.length,
    });
  } catch (error) {
    console.error("❌ Get filtered stalls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve filtered stalls",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
};
