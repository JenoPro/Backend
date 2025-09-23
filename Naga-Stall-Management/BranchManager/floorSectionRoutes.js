import express from "express";
import { getFloorsWithSections } from "./floorSectionController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/floors-with-sections", auth.authenticateToken, getFloorsWithSections);

export default router;
