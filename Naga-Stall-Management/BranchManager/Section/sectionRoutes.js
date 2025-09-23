import express from "express";
import { createSection, getSections } from "./sectionController.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

router.post("/", auth.authenticateToken, createSection);
router.get("/", auth.authenticateToken, getSections);

export default router;
