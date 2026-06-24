import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getRevenueSummary, getDues, getExpenseBreakdown,
  addExpense, deleteExpense, getTopPlanRevenue, getRecentTransactions,
} from "../controllers/financeController";

const router = Router();
router.use(requireAuth);

router.get("/revenue",       getRevenueSummary);
router.get("/dues",          getDues);
router.get("/expenses",      getExpenseBreakdown);
router.post("/expenses",     addExpense);
router.delete("/expenses/:id", deleteExpense);
router.get("/plan-revenue",  getTopPlanRevenue);
router.get("/transactions",  getRecentTransactions);

export default router;
