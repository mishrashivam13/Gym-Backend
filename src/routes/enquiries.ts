import { Router } from "express";
import { getEnquiries, createEnquiry, updateEnquiryStatus, deleteEnquiry } from "../controllers/enquiryController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Public route — website contact form submits here
router.post("/", createEnquiry);

// Protected routes — admin only
router.use(requireAuth);
router.get("/", getEnquiries);
router.patch("/:id/status", updateEnquiryStatus);
router.delete("/:id", deleteEnquiry);

export default router;
