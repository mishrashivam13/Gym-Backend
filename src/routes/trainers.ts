import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { upload } from "../config/upload";
import {
  getTrainers, getTrainerById, createTrainer, updateTrainer, deleteTrainer,
  getTrainerAttendanceToday, trainerCheckIn, trainerCheckOut,
  getTrainerAttendanceHistory, deleteTrainerAttendance,
} from "../controllers/trainerController";

const router = Router();
router.use(requireAuth);

/* Trainer CRUD */
router.get("/",                         getTrainers);
router.get("/:id",                      getTrainerById);
router.post("/",   upload.single("image"), createTrainer);
router.put("/:id", upload.single("image"), updateTrainer);
router.delete("/:id",                   deleteTrainer);

/* Trainer Attendance */
router.get("/attendance/today",         getTrainerAttendanceToday);
router.get("/attendance/history",       getTrainerAttendanceHistory);
router.post("/attendance/check-in",     trainerCheckIn);
router.patch("/attendance/:id/check-out", trainerCheckOut);
router.delete("/attendance/:id",        deleteTrainerAttendance);

export default router;
