import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";
import { initializeDatabase } from "./Naga-Stall-Management/config/database.js";
import { corsConfig } from "./Naga-Stall-Management/config/cors.js";
import { errorHandler } from "./Naga-Stall-Management/middleware/errorHandler.js";

// Import new consolidated routes
import authRoutes from "./Naga-Stall-Management/routes/authRoutes.js";
import stallRoutes from "./Naga-Stall-Management/routes/stallRoutes.js";
import branchRoutes from "./Naga-Stall-Management/routes/branchRoutes.js";
import applicantRoutes from "./Naga-Stall-Management/routes/applicantRoutes.js";
import employeeRoutes from "./Naga-Stall-Management/routes/employeeRoutes.js";

// Import floor/section functions for direct endpoints
import {
  getFloors,
  getSections,
  getFloorsWithSections,
  createFloor,
  createSection,
  createBranchManager,
} from "./Naga-Stall-Management/controllers/branch/branchController.js";
import authMiddleware from "./Naga-Stall-Management/middleware/auth.js";

// Legacy imports for Landing page and Mobile app (unchanged)
import landingStallRoutes from "./Naga-Stall-Landingpage/routes/stallRoutes.js";
import landingApplicantRoutes from "./Naga-Stall-Landingpage/routes/applicantRoutes.js";
import applicationRoutes from "./Naga-Stall-Landingpage/routes/applicationRoutes.js";

// Import Mobile app routes
import mobileRoutes from "./Naga-Stall-Mobile-Application/routes/loginRouter.js";
import mobileStallRoutes from "./Naga-Stall-Mobile-Application/routes/stallRoutes.js";

// Import specific landing page functions for public access
import {
  getAvailableAreas,
  getLocationsByArea,
  getStallsByArea,
  getFilteredStalls,
} from "./Naga-Stall-Landingpage/stallcontrollers/stallController.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// NEW ORGANIZED API ROUTES (Management System)
// Authentication routes
app.use("/api/auth", authRoutes);

// PUBLIC ENDPOINTS FOR LANDING PAGE (must be before protected routes)
app.get("/api/stalls/areas", getAvailableAreas); // GET /api/stalls/areas - Public access to areas for landing page
app.get("/api/stalls/locations", getLocationsByArea); // GET /api/stalls/locations?area=<area> - Public access to locations
app.get("/api/stalls/by-area", getStallsByArea); // GET /api/stalls/by-area?area=<area> - Public access to stalls by area
app.get("/api/stalls/filter", getFilteredStalls); // GET /api/stalls/filter?area=<area>&sortBy=<sort> - Public access to filtered stalls

// Feature-based routes (protected)
app.use("/api/stalls", stallRoutes); // Stall management
app.use("/api/branches", branchRoutes); // Branch management (for branch managers)
app.use("/api/applicants", applicantRoutes); // Applicant management - ONLY APPROVAL for mobile credentials
app.use("/api/employees", employeeRoutes); // Employee management

// Admin-specific routes (different URL structure expected by frontend)
app.use("/api/admin/branches", branchRoutes); // Admin branch management
// Add specific admin endpoints that frontend expects
app.post(
  "/api/admin/branch-managers",
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRole("admin"),
  createBranchManager
); // POST /api/admin/branch-managers

// Direct endpoints for floors and sections (required by frontend)
app.get("/api/floors", authMiddleware.authenticateToken, getFloors); // GET /api/floors - Get floors for branch manager
app.post("/api/floors", authMiddleware.authenticateToken, createFloor); // POST /api/floors - Create new floor
app.get("/api/sections", authMiddleware.authenticateToken, getSections); // GET /api/sections - Get sections for branch manager
app.post("/api/sections", authMiddleware.authenticateToken, createSection); // POST /api/sections - Create new section

// Legacy endpoint that frontend expects
app.get(
  "/api/branch-manager/floors-with-sections",
  authMiddleware.authenticateToken,
  getFloorsWithSections
); // GET /api/branch-manager/floors-with-sections

// ===== LEGACY ROUTES (Landing Page & Mobile - unchanged) =====
app.use("/api/mobile", mobileRoutes); // Mobile app login routes
app.use("/api/mobile", mobileStallRoutes); // Mobile app stall routes
app.use("/api/landing-stalls", landingStallRoutes);
app.use("/api/landing-applicants", landingApplicantRoutes);
app.use("/api/applications", applicationRoutes);

// ===== UTILITY ENDPOINTS =======

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Naga Stall Management Server is running",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: PORT,
      dbHost: process.env.DB_HOST || "localhost",
      dbName: process.env.DB_NAME || "naga_stall",
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Naga Stall Management API",
    version: "2.0.0",
    documentation: "/api/docs",
    health: "/api/health",
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log("🚀 Naga Stall Management Server starting...");
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://192.168.8.38:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("🌐 CORS enabled for frontend URLs");
  console.log("📋 API Endpoints:");

  // Authentication endpoints
  console.log("\n   === AUTHENTICATION ENDPOINTS ===");
  console.log("   POST /api/auth/admin/login - Admin login (super admin)");
  console.log("   POST /api/auth/branch_manager/login - Branch Manager login");
  console.log("   GET  /api/auth/verify-token - Verify JWT token");
  console.log("   POST /api/auth/logout - Logout (protected)");
  console.log("   GET  /api/auth/me - Get current user info (protected)");
  console.log(
    "   GET  /api/auth/branch-manager-info - Get branch manager info (protected)"
  );
  console.log("   GET  /api/auth/admin-info - Get admin info (protected)");
  console.log("   POST /api/auth/create-admin - Create admin user");
  console.log("   POST /api/auth/hash-password - Create password hash");
  console.log("   GET  /api/auth/test-db - Test database connection");

  // Branch management endpoints
  console.log("\n   === BRANCH MANAGEMENT ENDPOINTS (Protected) ===");
  console.log("   POST /api/branches - Create new branch");
  console.log("   GET  /api/branches - Get all branches");
  console.log("   DELETE /api/branches/:id - Delete branch");
  console.log("   GET  /api/branches/areas - Get all areas");
  console.log("   GET  /api/branches/area/:area - Get branches by area");
  console.log("   GET  /api/branches/managers - Get all branch managers");
  console.log("   POST /api/branches/managers - Create branch manager");
  console.log(
    "   GET  /api/branches/managers/:managerId - Get branch manager by ID"
  );
  console.log(
    "   PUT  /api/branches/managers/:managerId - Update branch manager"
  );
  console.log(
    "   DELETE /api/branches/managers/:managerId - Delete branch manager"
  );
  console.log(
    "   POST /api/branches/assign-manager - Assign manager to branch"
  );
  console.log(
    "   POST /api/branches/branch-managers - Assign manager to branch (alias)"
  );
  console.log("   GET  /api/branches/floors - Get floors for branch manager");
  console.log("   POST /api/branches/floors - Create new floor");
  console.log(
    "   GET  /api/branches/sections - Get sections for branch manager"
  );
  console.log("   POST /api/branches/sections - Create new section");
  console.log("   GET  /api/branches/cities - Get unique cities");
  console.log("   GET  /api/branches/city/:city - Get areas by city");
  console.log("   GET  /api/branches/locations/:city - Get locations by city");
  console.log(
    "   GET  /api/branches/area/:id - Get area by ID with statistics"
  );

  // Direct floor and section endpoints (required by frontend)
  console.log("\n   === FLOOR & SECTION ENDPOINTS (Protected) ===");
  console.log(
    "   GET  /api/floors - Get floors for authenticated branch manager"
  );
  console.log("   POST /api/floors - Create new floor");
  console.log(
    "   GET  /api/sections - Get sections for authenticated branch manager"
  );
  console.log("   POST /api/sections - Create new section");
  console.log(
    "   GET  /api/branch-manager/floors-with-sections - Get floors with nested sections (legacy endpoint)"
  );

  // Stall management endpoints
  console.log("\n   === STALL MANAGEMENT ENDPOINTS (Protected) ===");
  console.log("   POST /api/stalls - Add new stall");
  console.log(
    "   GET  /api/stalls - Get all stalls for authenticated branch manager"
  );
  console.log("   GET  /api/stalls/available - Get available stalls");
  console.log("   GET  /api/stalls/filter - Get stalls by filter");
  console.log("   GET  /api/stalls/:id - Get stall by ID");
  console.log("   PUT  /api/stalls/:id - Update stall");
  console.log("   DELETE /api/stalls/:id - Delete stall");

  // Applicant management endpoints
  console.log("\n   === APPLICANT MANAGEMENT ENDPOINTS ===");
  console.log("   POST /api/applicants - Create new applicant (public)");
  console.log("   GET  /api/applicants - Get all applicants (protected)");
  console.log("   GET  /api/applicants/search - Search applicants (protected)");
  console.log(
    "   GET  /api/applicants/my-stall-applicants - Get applicants for authenticated manager (protected)"
  );
  console.log("   GET  /api/applicants/:id - Get applicant by ID (protected)");
  console.log("   PUT  /api/applicants/:id - Update applicant (protected)");
  console.log(
    "   PUT  /api/applicants/:id/approve - Approve applicant with credentials (protected)"
  );
  console.log(
    "   PUT  /api/applicants/:id/decline - Decline applicant and delete data (protected)"
  );
  console.log(
    "   PUT  /api/applicants/:id/status - Update applicant status (protected)"
  );
  console.log(
    "   POST /api/applicants/credentials - Store mobile app credentials (protected)"
  );
  console.log(
    "   GET  /api/applicants/credentials - Get all credentials (protected)"
  );
  console.log("   DELETE /api/applicants/:id - Delete applicant (protected)");

  // Employee management endpoints
  console.log("\n   === EMPLOYEE MANAGEMENT ENDPOINTS ===");
  console.log(
    "   POST /api/employees - Create new employee with auto-generated credentials (protected)"
  );
  console.log(
    "   GET  /api/employees - Get all employees with filtering (protected)"
  );
  console.log("   GET  /api/employees/:id - Get employee by ID (protected)");
  console.log(
    "   PUT  /api/employees/:id - Update employee information (protected)"
  );
  console.log(
    "   DELETE /api/employees/:id - Soft delete employee (protected)"
  );
  console.log(
    "   GET  /api/employees/branch/:branchId - Get employees by branch (protected)"
  );
  console.log("   POST /api/employees/login - Employee login (public)");
  console.log("   POST /api/employees/logout - Employee logout (protected)");
  console.log(
    "   POST /api/employees/:id/reset-password - Reset employee password (protected)"
  );

  // Legacy landing page endpoints
  console.log("\n   === MOBILE APP ENDPOINTS ===");
  console.log("   POST /api/mobile/mobile-login - Mobile app login");
  console.log(
    "   POST /api/mobile/submit-application - Submit stall application"
  );
  console.log("   GET  /api/mobile/stalls?applicant_id=X - Get stalls (restricted to applied areas)");
  console.log("   GET  /api/mobile/stalls/type/:type?applicant_id=X - Get stalls by type (restricted to applied areas)");
  console.log("   GET  /api/mobile/stalls/area/:area?applicant_id=X - Get stalls by area (restricted to applied areas)");
  console.log("   GET  /api/mobile/stalls/:id?applicant_id=X - Get stall details by ID");
  console.log("   GET  /api/mobile/areas?applicant_id=X - Get areas (only where applicant has applications)");
  console.log("   GET  /api/mobile/stalls/search?applicant_id=X - Search stalls (restricted to applied areas)");

  console.log("\n   === LEGACY LANDING PAGE ENDPOINTS ===");
  console.log("   GET  /api/landing-stalls/* - Landing page stall endpoints");
  console.log(
    "   GET  /api/landing-applicants/* - Landing page applicant endpoints"
  );
  console.log("   GET  /api/applications/* - Application endpoints");

  // Utility endpoints
  console.log("\n   === UTILITY ENDPOINTS ===");
  console.log("   GET  /api/health - Health check");
  console.log("   GET  / - API information");

  console.log("\n📋 SAMPLE LOGIN CREDENTIALS:");
  console.log("   Branch Manager 1:");
  console.log("   - Area: Naga City");
  console.log("   - Location: Peoples Mall");
  console.log("   - Username: manager_naga_peoples");
  console.log("   - Password: [encrypted in database]");
  console.log("");
  console.log("   Branch Manager 2:");
  console.log("   - Area: Legazpi");
  console.log("   - Location: SM");
  console.log("   - Username: manager_legazpi_sm");
  console.log("   - Password: [encrypted in database]");

  try {
    await initializeDatabase();
    console.log("\n✅ Database initialization completed successfully");
    console.log(
      "📊 Stalls are filtered by branch_manager_id for each logged-in user"
    );
    console.log(
      "🎯 Backend reorganized by features (login, stalls, branches, applicants)"
    );
  } catch (error) {
    console.error("\n❌ Failed to initialize database:", error);
    process.exit(1);
  }
});

// Temporary test endpoints for debugging auction stalls
app.get('/api/test/auction-stalls', async (req, res) => {
  const { createConnection } = await import('./Naga-Stall-Management/config/database.js');
  let connection;
  try {
    connection = await createConnection();
    
    // Get all auction stalls with full details
    const [auctionStalls] = await connection.execute(`
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE st.price_type = 'Auction'
      AND st.is_available = 1 
      AND st.status = 'Active'
      ORDER BY b.branch_name, st.stall_no
    `);

    // Format like mobile app expects
    const formattedStalls = auctionStalls.map(stall => ({
      id: stall.stall_id,
      stallNumber: stall.stall_no,
      price: stall.rental_price ? stall.rental_price.toLocaleString() : '0',
      priceValue: stall.rental_price || 0,
      currentBid: stall.rental_price || 0,
      currentBidder: null,
      location: stall.branch_name || 'Unknown',
      floor: `${stall.floor_name} / ${stall.section_name}`,
      size: stall.size || 'Unknown',
      status: 'available',
      auctionDate: "To be announced",
      startTime: "To be announced",
      image: stall.stall_image || 'https://oldspitalfieldsmarket.com/cms/2017/10/OSM_FP_Stall_sq-1440x1440.jpg',
      stallDescription: stall.description || 'No description available',
      branchId: stall.branch_id,
      priceType: stall.price_type,
      stallLocation: stall.stall_location,
      
      // Original stall data for debugging
      original_data: stall
    }));

    res.json({
      success: true,
      message: 'Auction stalls test endpoint',
      data: {
        total_auction_stalls: auctionStalls.length,
        formatted_stalls: formattedStalls,
        raw_stalls: auctionStalls
      }
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Test endpoint for mobile login simulation
app.post('/api/test/mobile-login-sim', async (req, res) => {
  const { createConnection } = await import('./Naga-Stall-Management/config/database.js');
  let connection;
  try {
    connection = await createConnection();
    
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username required for simulation'
      });
    }

    // Get applicant info
    const [applicantData] = await connection.execute(`
      SELECT c.applicant_id, a.applicant_full_name
      FROM credential c
      JOIN applicant a ON c.applicant_id = a.applicant_id
      WHERE c.user_name = ? AND c.is_active = 1
    `, [username]);

    if (applicantData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const applicant = applicantData[0];

    // Get applied areas
    const [appliedAreas] = await connection.execute(`
      SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
      FROM application app
      JOIN stall st ON app.stall_id = st.stall_id
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE app.applicant_id = ?
    `, [applicant.applicant_id]);

    // If no applications, get all areas
    let targetAreas = [];
    if (appliedAreas.length === 0) {
      const [allAreas] = await connection.execute(`
        SELECT DISTINCT b.area, b.branch_id, b.branch_name, b.location
        FROM branch b
        WHERE b.is_active = 1
        ORDER BY b.area
      `);
      targetAreas = allAreas;
    } else {
      targetAreas = appliedAreas;
    }

    // Get stalls in target areas
    const areaConditions = targetAreas.map(() => 'b.area = ?').join(' OR ');
    const areaValues = targetAreas.map(area => area.area);

    let stallsQuery = `
      SELECT 
        st.stall_id, st.stall_no, st.stall_location, st.size, st.rental_price, 
        st.price_type, st.status, st.description, st.stall_image, st.is_available,
        sec.section_name, sec.section_id, f.floor_name, f.floor_id, 
        b.branch_name, b.area, b.location, b.branch_id
      FROM stall st
      JOIN section sec ON st.section_id = sec.section_id
      JOIN floor f ON sec.floor_id = f.floor_id
      JOIN branch b ON f.branch_id = b.branch_id
      WHERE st.is_available = 1 AND st.status = 'Active'`;

    if (areaValues.length > 0) {
      stallsQuery += ` AND (${areaConditions})`;
    }

    stallsQuery += ' ORDER BY st.price_type, b.branch_name, st.stall_no';

    const [availableStalls] = await connection.execute(stallsQuery, areaValues);

    // Group by price type
    const stallsByType = {
      Fixed: availableStalls.filter(s => s.price_type === 'Fixed Price'),
      Raffle: availableStalls.filter(s => s.price_type === 'Raffle'),
      Auction: availableStalls.filter(s => s.price_type === 'Auction')
    };

    res.json({
      success: true,
      message: 'Mobile login simulation',
      data: {
        user: {
          applicant_id: applicant.applicant_id,
          username: username,
          full_name: applicant.applicant_full_name
        },
        target_areas: targetAreas,
        applied_areas: appliedAreas,
        stalls_by_type: stallsByType,
        total_stalls: availableStalls.length,
        auction_stalls_count: stallsByType.Auction.length,
        debug_info: {
          has_applications: appliedAreas.length > 0,
          area_filter_applied: areaValues.length > 0,
          areas_checked: areaValues
        }
      }
    });

  } catch (error) {
    console.error('Mobile login simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Simulation failed',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

export default app;
