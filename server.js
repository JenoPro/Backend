import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";

// Database and configuration imports
import { initializeDatabase } from "./Naga-Stall-Management/config/database.js";
import { corsConfig } from "./Naga-Stall-Management/config/cors.js";
import { errorHandler } from "./Naga-Stall-Management/middleware/errorHandler.js";
import authMiddleware from "./Naga-Stall-Management/middleware/auth.js";
// Only import testConnection for health checks, not full database initialization
// import { testConnection } from './Naga-Stall-Landingpage/config/database.js'

// Route imports - organized by functionality
import adminRoutes from "./Naga-Stall-Management/BranchManager/adminRoutes.js";
import branchRoutes from "./Naga-Stall-Management/Branch/branchRoutes.js";
import managementStallRoutes from "./Naga-Stall-Management/Stall/stallRoutes.js";
import landingStallRoutes from "./Naga-Stall-Landingpage/routes/stallRoutes.js";
import applicantRoutes from "./Naga-Stall-Landingpage/routes/applicantRoutes.js";
import applicationRoutes from "./Naga-Stall-Landingpage/routes/applicationRoutes.js";
import floorRoutes from "./Naga-Stall-Management/BranchManager/Floor/floorRoutes.js";
import sectionRoutes from "./Naga-Stall-Management/BranchManager/Section/sectionRoutes.js";
import floorSectionRoutes from "./Naga-Stall-Management/BranchManager/floorSectionRoutes.js";

// Controller imports - static imports for better performance
import {
  adminLogin,
  branchManagerLogin,
  verifyToken,
  logout,
  getCurrentUser,
  getBranchManagerInfo,
  getAreas,
  getBranchesByArea,
  testDb,
} from "./Naga-Stall-Management/BranchManager/adminController.js";

// Import area controller functions
import {
  getAllAreas,
  getAreasByCity,
  getLocationsByCity,
  getFloors,
  getSections,
} from "./Naga-Stall-Management/Area/areaController.js";

// Import management stall functions for CRUD operations (with authentication)
import {
  addStall,
  updateStall,
  deleteStall,
  getAllStalls,
  getStallById,
  getAvailableStalls,
  getStallsByFilter,
} from "./Naga-Stall-Management/Stall/stallController.js";

// Import branch management functions
import { createBranchManager } from "./Naga-Stall-Management/Branch/branchController.js";

// Import landing page functions for public endpoints (without auth required)
import {
  getAllStalls as getAllStallsPublic,
  getStallById as getStallByIdPublic,
  getAvailableAreas,
  getStallsByArea,
  getLocationsByArea,
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

// ===== PREFIXED ROUTES (For advanced usage) =====
app.use("/management/api/auth", adminRoutes);
app.use("/management/api/branches", branchRoutes);
app.use("/management/api/stalls", managementStallRoutes);
app.use("/landing/api/stalls", landingStallRoutes);
app.use("/landing/api/applicants", applicantRoutes);
app.use("/landing/api/applications", applicationRoutes);

// ===== FRONTEND-FRIENDLY ROUTES (No prefix) =====

// Authentication endpoints
app.post("/api/auth/admin/login", adminLogin);
app.post("/api/auth/branch_manager/login", branchManagerLogin);
app.get("/api/auth/verify-token", verifyToken);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", getCurrentUser);
app.get("/api/auth/branch-manager-info", getBranchManagerInfo);

// Admin Branch Management endpoints
app.use("/api/admin/branches", branchRoutes);

// Branch manager endpoints
app.post(
  "/api/admin/branch-managers",
  authMiddleware.authenticateAdmin,
  createBranchManager
);

// Stall endpoints (authenticated - returns stalls for the logged-in branch manager)
app.get("/api/stalls", authMiddleware.authenticateToken, getAllStalls); // Get stalls for authenticated branch manager
app.post("/api/stalls", authMiddleware.authenticateToken, addStall); // CREATE stall (requires auth)
app.get("/api/stalls/areas", getAvailableAreas); // Public endpoint
app.get("/api/stalls/by-area", getStallsByArea); // Public endpoint
app.get("/api/stalls/locations", getLocationsByArea); // Public endpoint
app.get("/api/stalls/filter", getFilteredStalls); // Public filter endpoint for landing page
app.get(
  "/api/stalls/my-filter",
  authMiddleware.authenticateToken,
  getStallsByFilter
); // Filter stalls for authenticated branch manager
app.get("/api/stalls/:id", authMiddleware.authenticateToken, getStallById); // Get specific stall for authenticated branch manager
app.put("/api/stalls/:id", authMiddleware.authenticateToken, updateStall); // UPDATE stall (requires auth)
app.delete("/api/stalls/:id", authMiddleware.authenticateToken, deleteStall); // DELETE stall (requires auth)

// Public stall endpoints (for landing page - no authentication required)
app.get("/api/public/stalls", getAllStallsPublic); // Get all stalls publicly
app.get("/api/public/stalls/:id", getStallByIdPublic); // Get specific stall publicly

// Landing page API endpoints (no authentication required)
app.use("/api/applicants", applicantRoutes); // Direct access to applicant routes
app.use("/api/applications", applicationRoutes); // Direct access to application routes

// Area and branch endpoints
app.get("/api/areas", getAreas);
app.get("/api/branches/:area", getBranchesByArea);

// Floor and Section endpoints (require authentication)
app.use("/api/floors", floorRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/branch-manager", floorSectionRoutes);

// Utility endpoints
app.get("/api/test-db", testDb);
app.get("/api/check-table", async (req, res) => {
  try {
    const { createConnection } = await import(
      "./Naga-Stall-Management/config/database.js"
    );
    const connection = await createConnection();

    // Check stall table structure
    const [columns] = await connection.execute("DESCRIBE stall");

    // Check some sample data
    const [sampleData] = await connection.execute(
      "SELECT * FROM stall LIMIT 3"
    );

    await connection.end();

    res.json({
      success: true,
      tableStructure: columns,
      sampleData: sampleData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.get("/api/health", async (req, res) => {
  try {
    // Simple health check without database connection test to avoid conflicts
    res.json({
      success: true,
      message: "Naga Stall Main Server is running",
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV || "development",
        port: PORT,
        dbHost: process.env.DB_HOST || "localhost",
        dbName: process.env.DB_NAME || "naga_stall",
      },
      status: "healthy",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server health check failed",
      error: error.message,
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Naga Stall Main API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth/*",
      stalls: "/api/stalls/*",
      areas: "/api/areas",
      health: "/api/health",
    },
  });
});

// Error handling
app.use(errorHandler);
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, async () => {
  console.log("🚀 Naga Stall Server starting...");
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);

  try {
    console.log("🔧 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database ready");
    console.log("📊 Server fully operational");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🔄 ${signal} received, shutting down gracefully`);
  process.exit(0);
};

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
