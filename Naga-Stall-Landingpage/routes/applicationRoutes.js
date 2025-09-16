import express from "express";
import { applicationController } from "../applicationcontrollers/applicationController.js";

const router = express.Router();

// Application routes
router.post("/", applicationController.createApplication); // POST /api/applications - Create new application
router.get("/", applicationController.getAllApplications); // GET /api/applications - Get all applications (with filters)
router.get("/statistics", applicationController.getApplicationsByStatus); // GET /api/applications/statistics - Get application statistics
router.get("/:id", applicationController.getApplicationById); // GET /api/applications/:id - Get application by ID
router.put("/:id/status", applicationController.updateApplicationStatus); // PUT /api/applications/:id/status - Update application status
router.delete("/:id", applicationController.deleteApplication); // DELETE /api/applications/:id - Delete application

export default router;