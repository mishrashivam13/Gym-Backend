import { Router } from "express";
import { adminLogin, adminDashboard } from "../controllers/adminController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", adminLogin);
router.get("/dashboard", requireAuth, adminDashboard);

export default router;
