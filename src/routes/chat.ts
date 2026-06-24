import { Router } from "express";
import { chat } from "../controllers/chatController";

const router = Router();

/* Public — no auth needed */
router.post("/", chat);

export default router;
