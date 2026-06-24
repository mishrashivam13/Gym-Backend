import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  generateMonthlySalary, getMonthlySalary, updateSalaryRecord,
  getTrainerSalaryHistory, getSalarySummary,
} from "../controllers/salaryController";

const router = Router();
router.use(requireAuth);

router.post("/generate",              generateMonthlySalary);
router.get("/monthly",                getMonthlySalary);
router.get("/summary",                getSalarySummary);
router.patch("/:id",                  updateSalaryRecord);
router.get("/trainer/:trainerId",     getTrainerSalaryHistory);

export default router;
