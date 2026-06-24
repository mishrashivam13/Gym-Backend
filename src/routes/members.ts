import { Router } from "express";
import { getMembers, getMemberById, createMember, updateMember, deleteMember, addFeePayment, renewMember } from "../controllers/memberController";
import { downloadPaymentReceipt, downloadFullReceipt } from "../controllers/receiptController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", getMembers);
router.get("/:id", getMemberById);
router.post("/", createMember);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);
router.post("/:id/fee", addFeePayment);
router.post("/:id/renew", renewMember);
router.get("/:id/receipt", downloadFullReceipt);
router.get("/:id/receipt/:index", downloadPaymentReceipt);

export default router;
