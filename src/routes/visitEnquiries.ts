import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getVisitEnquiries, createVisitEnquiry, updateVisitEnquiry,
  deleteVisitEnquiry, convertToMember,
} from "../controllers/visitEnquiryController";

const router = Router();
router.use(requireAuth);

router.get("/",          getVisitEnquiries);
router.post("/",         createVisitEnquiry);
router.patch("/:id",     updateVisitEnquiry);
router.delete("/:id",    deleteVisitEnquiry);
router.post("/:id/convert", convertToMember);

export default router;
