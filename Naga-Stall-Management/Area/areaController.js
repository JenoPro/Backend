import { createConnection } from "../config/database.js";

// Get all areas and locations from branch managers
export async function getAllAreas(req, res) {
  let connection;
  try {
    connection = await createConnection();
    const [areas] = await connection.execute(`
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE status = 'Active'
      ORDER BY area, location
    `);

    res.json({
      success: true,
      data: areas,
      message: "Areas retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching areas:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get areas by city
export async function getAreasByCity(req, res) {
  let connection;
  try {
    const { city } = req.params;
    connection = await createConnection();

    const [areas] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE area = ? AND status = 'Active'
      ORDER BY location
    `,
      [city]
    );

    if (areas.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No areas found for city: ${city}`,
      });
    }

    res.json({
      success: true,
      data: areas,
      message: `Areas in ${city} retrieved successfully`,
    });
  } catch (error) {
    console.error("Error fetching areas by city:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas by city",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get area by ID (branch manager by ID)
export async function getAreaById(req, res) {
  let connection;
  try {
    const { id } = req.params;
    connection = await createConnection();

    const [areas] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        area as city,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name,
        first_name,
        last_name,
        email,
        status,
        created_at
      FROM branch_manager
      WHERE branch_manager_id = ? AND status = 'Active'
    `,
      [id]
    );

    if (areas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    // Get statistics for this area
    const [floorCount] = await connection.execute(
      "SELECT COUNT(*) as floor_count FROM floor WHERE branch_manager_id = ?",
      [id]
    );

    const [sectionCount] = await connection.execute(
      `SELECT COUNT(*) as section_count 
       FROM section s
       JOIN floor f ON s.floor_id = f.floor_id
       WHERE f.branch_manager_id = ?`,
      [id]
    );

    const [stallCount] = await connection.execute(
      `SELECT COUNT(*) as stall_count 
       FROM stall st
       JOIN section s ON st.section_id = s.section_id
       JOIN floor f ON s.floor_id = f.floor_id
       WHERE f.branch_manager_id = ?`,
      [id]
    );

    const areaData = {
      ...areas[0],
      stats: {
        floor_count: floorCount[0].floor_count,
        section_count: sectionCount[0].section_count,
        stall_count: stallCount[0].stall_count,
      },
    };

    res.json({
      success: true,
      data: areaData,
      message: "Area retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching area by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch area",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get unique cities
export async function getCities(req, res) {
  let connection;
  try {
    connection = await createConnection();
    const [cities] = await connection.execute(`
      SELECT DISTINCT area as city, COUNT(*) as branch_count
      FROM branch_manager
      WHERE status = 'Active'
      GROUP BY area
      ORDER BY area
    `);

    res.json({
      success: true,
      data: cities,
      message: "Cities retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get locations within a city
export async function getLocationsByCity(req, res) {
  let connection;
  try {
    const { city } = req.params;
    connection = await createConnection();

    const [locations] = await connection.execute(
      `
      SELECT 
        branch_manager_id as ID,
        location as branch,
        CONCAT(first_name, ' ', last_name) as manager_name
      FROM branch_manager
      WHERE area = ? AND status = 'Active'
      ORDER BY location
    `,
      [city]
    );

    res.json({
      success: true,
      data: locations,
      message: `Locations in ${city} retrieved successfully`,
    });
  } catch (error) {
    console.error("Error fetching locations by city:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get floors for the authenticated branch manager
export async function getFloors(req, res) {
  let connection;
  try {
    connection = await createConnection();

    console.log("🔍 Getting floors for authenticated user...");
    console.log("📋 User info:", {
      userId: req.user?.userId,
      branch_id: req.user?.branch_id,
      userType: req.user?.userType,
      username: req.user?.username,
    });

    let query;
    let params = [];

    // If user is admin, get all floors
    if (req.user?.userType === "admin") {
      query = `
        SELECT 
          f.floor_id,
          f.floor_name,
          f.floor_number,
          f.description,
          f.status,
          f.created_at,
          f.updated_at,
          b.branch_name,
          b.area,
          b.location,
          b.branch_id
        FROM floor f
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE f.status = 'Active' AND b.status = 'Active'
        ORDER BY b.branch_name, f.floor_number ASC
      `;
    } else if (req.user?.userType === "branch_manager" && req.user?.branch_id) {
      // If user is branch manager, only get floors from their branch
      query = `
        SELECT 
          f.floor_id,
          f.floor_name,
          f.floor_number,
          f.description,
          f.status,
          f.created_at,
          f.updated_at,
          b.branch_name,
          b.area,
          b.location,
          b.branch_id
        FROM floor f
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE f.status = 'Active' 
          AND b.status = 'Active'
          AND b.branch_id = ?
        ORDER BY f.floor_number ASC
      `;
      params = [req.user.branch_id];
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Branch manager authentication required.",
      });
    }

    console.log("📝 Executing query:", query);
    console.log("📋 Query params:", params);

    const [floors] = await connection.execute(query, params);

    console.log(`✅ Found ${floors.length} floors`);
    if (floors.length > 0) {
      console.log("📊 Sample floors:", floors.slice(0, 2));
    }

    res.json({
      success: true,
      data: floors,
      message: "Floors retrieved successfully",
      branch_info:
        req.user?.userType === "branch_manager"
          ? {
              branch_id: req.user.branch_id,
              branch_name: floors[0]?.branch_name || "Unknown",
            }
          : null,
      count: floors.length,
    });
  } catch (error) {
    console.error("❌ Error fetching floors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch floors",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Get sections for the authenticated branch manager
export async function getSections(req, res) {
  let connection;
  try {
    connection = await createConnection();

    console.log("🔍 Getting sections for authenticated user...");
    console.log("📋 User info:", {
      userId: req.user?.userId,
      branch_id: req.user?.branch_id,
      userType: req.user?.userType,
      username: req.user?.username,
    });

    let query;
    let params = [];

    // If user is admin, get all sections
    if (req.user?.userType === "admin") {
      query = `
        SELECT 
          s.section_id,
          s.section_name,
          s.section_code,
          s.description,
          s.status,
          s.created_at,
          s.updated_at,
          f.floor_name,
          f.floor_number,
          f.floor_id,
          b.branch_name,
          b.area,
          b.location,
          b.branch_id
        FROM section s
        INNER JOIN floor f ON s.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE s.status = 'Active' AND f.status = 'Active' AND b.status = 'Active'
        ORDER BY b.branch_name, f.floor_number ASC, s.section_name ASC
      `;
    } else if (req.user?.userType === "branch_manager" && req.user?.branch_id) {
      // If user is branch manager, only get sections from their branch
      query = `
        SELECT 
          s.section_id,
          s.section_name,
          s.section_code,
          s.description,
          s.status,
          s.created_at,
          s.updated_at,
          f.floor_name,
          f.floor_number,
          f.floor_id,
          b.branch_name,
          b.area,
          b.location,
          b.branch_id
        FROM section s
        INNER JOIN floor f ON s.floor_id = f.floor_id
        INNER JOIN branch b ON f.branch_id = b.branch_id
        WHERE s.status = 'Active' 
          AND f.status = 'Active' 
          AND b.status = 'Active'
          AND b.branch_id = ?
        ORDER BY f.floor_number ASC, s.section_name ASC
      `;
      params = [req.user.branch_id];
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Branch manager authentication required.",
      });
    }

    console.log("📝 Executing query:", query);
    console.log("📋 Query params:", params);

    const [sections] = await connection.execute(query, params);

    console.log(`✅ Found ${sections.length} sections`);
    if (sections.length > 0) {
      console.log("📊 Sample sections:", sections.slice(0, 2));
    }

    res.json({
      success: true,
      data: sections,
      message: "Sections retrieved successfully",
      branch_info:
        req.user?.userType === "branch_manager"
          ? {
              branch_id: req.user.branch_id,
              branch_name: sections[0]?.branch_name || "Unknown",
            }
          : null,
      count: sections.length,
    });
  } catch (error) {
    console.error("❌ Error fetching sections:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sections",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}

// Debug function to check Satellite_Manager data
export async function debugSatelliteManager(req, res) {
  let connection;
  try {
    connection = await createConnection();

    console.log("🐛 Debug: Checking Satellite_Manager data structure");

    // Check all branch managers
    const [allManagers] = await connection.execute(
      `SELECT 
        bm.branch_manager_id,
        bm.manager_username,
        bm.branch_id,
        b.branch_name,
        b.area,
        b.location
      FROM branch_manager bm
      INNER JOIN branch b ON bm.branch_id = b.branch_id
      ORDER BY bm.branch_manager_id`
    );

    console.log("📋 All Branch Managers:");
    allManagers.forEach((manager) => {
      console.log(
        `   ID: ${manager.branch_manager_id}, Username: ${manager.manager_username}, Branch: ${manager.branch_name} (ID: ${manager.branch_id})`
      );
    });

    // Check floors for branch_id 3 (Satellite)
    const [satelliteFloors] = await connection.execute(
      `SELECT 
        f.floor_id,
        f.floor_name,
        f.floor_number,
        f.branch_id,
        b.branch_name
      FROM floor f
      INNER JOIN branch b ON f.branch_id = b.branch_id
      WHERE f.branch_id = 3
      ORDER BY f.floor_number`
    );

    console.log("🏢 Satellite Branch Floors:");
    satelliteFloors.forEach((floor) => {
      console.log(
        `   Floor ID: ${floor.floor_id}, Number: ${floor.floor_number}, Name: ${floor.floor_name}`
      );
    });

    // Check sections for Satellite floors
    const [satelliteSections] = await connection.execute(
      `SELECT 
        s.section_id,
        s.section_name,
        s.section_code,
        s.floor_id,
        f.floor_number,
        f.branch_id
      FROM section s
      INNER JOIN floor f ON s.floor_id = f.floor_id
      WHERE f.branch_id = 3 AND s.status = 'Active'
      ORDER BY f.floor_number, s.section_name`
    );

    console.log("📦 Satellite Branch Sections:");
    satelliteSections.forEach((section) => {
      console.log(
        `   Section ID: ${section.section_id}, Name: ${section.section_name}, Code: ${section.section_code}, Floor: ${section.floor_number}`
      );
    });

    // Test the same query used in getSections for Satellite_Manager
    const satelliteManagerId = 3; // Based on your database dump
    const [sectionsQuery] = await connection.execute(
      `SELECT 
        s.section_id,
        s.section_name,
        s.section_code,
        s.status,
        f.floor_name,
        f.floor_number,
        f.floor_id,
        b.branch_id,
        b.branch_name,
        bm.branch_manager_id,
        bm.manager_username
      FROM section s
      INNER JOIN floor f ON s.floor_id = f.floor_id
      INNER JOIN branch b ON f.branch_id = b.branch_id
      INNER JOIN branch_manager bm ON b.branch_id = bm.branch_id
      WHERE bm.branch_manager_id = ? AND s.status = 'Active'
      ORDER BY f.floor_number ASC, s.section_name ASC`,
      [satelliteManagerId]
    );

    console.log(
      `🔍 getSections Query Result for Manager ID ${satelliteManagerId}:`
    );
    console.log(`   Found ${sectionsQuery.length} sections`);
    sectionsQuery.forEach((section) => {
      console.log(
        `   Section: ${section.section_name} (ID: ${section.section_id}) on Floor ${section.floor_number}`
      );
    });

    res.json({
      success: true,
      debug: {
        allManagers: allManagers,
        satelliteFloors: satelliteFloors,
        satelliteSections: satelliteSections,
        getSectionsQueryResult: sectionsQuery,
      },
      message: "Debug data retrieved",
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
}
