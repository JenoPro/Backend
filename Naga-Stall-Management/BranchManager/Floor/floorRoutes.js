import express from "express";
import { createFloor, getFloors } from "./floorController.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

router.post("/", auth.authenticateToken, createFloor);
router.get("/", auth.authenticateToken, getFloors);

export default router;
