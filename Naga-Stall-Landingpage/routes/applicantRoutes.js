import express from "express";
import { applicantController } from "../stallcontrollers/applicantController.js";

const router = express.Router();

// Applicant routes
router.post("/", applicantController.createApplicant); // POST /api/applicants - Create new applicant
router.get("/", applicantController.getAllApplicants); // GET /api/applicants - Get all applicants
router.get("/:id", applicantController.getApplicantById); // GET /api/applicants/:id - Get applicant by ID
router.put("/:id", applicantController.updateApplicant); // PUT /api/applicants/:id - Update applicant
router.delete("/:id", applicantController.deleteApplicant); // DELETE /api/applicants/:id - Delete applicant

export default router;