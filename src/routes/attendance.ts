import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getToday, getAttendance, getMemberAttendance,
  getStats, checkIn, checkOut, deleteAttendance,
} from "../controllers/attendanceController";

const router = Router();
router.use(requireAuth);

router.get("/today",              getToday);
router.get("/stats",              getStats);
router.get("/",                   getAttendance);
router.get("/member/:memberId",   getMemberAttendance);
router.post("/check-in",          checkIn);
router.patch("/:id/check-out",    checkOut);
router.delete("/:id",             deleteAttendance);

export default router;
