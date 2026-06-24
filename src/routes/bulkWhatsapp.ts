import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { previewBulk, sendBulk } from "../controllers/bulkWhatsappController";

const router = Router();
router.use(requireAuth);

router.get("/preview", previewBulk);
router.post("/send",   sendBulk);

export default router;
