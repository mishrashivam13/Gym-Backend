import { Response } from "express";
import PDFDocument from "pdfkit";
import { Member } from "../models/Member";
import { AuthRequest } from "../middleware/auth";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function receiptNo(memberId: string, index: number) {
  const year = new Date().getFullYear();
  const short = memberId.toString().slice(-6).toUpperCase();
  return `CG-${year}-${short}-${String(index + 1).padStart(2, "0")}`;
}

const PAGE_W = 720;
const M      = 50;          // margin
const R      = PAGE_W - M;  // 670 — right edge of content

/* ── draw a horizontal rule ── */
function hr(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(M, y).lineTo(R, y).strokeColor("#333333").lineWidth(0.5).stroke();
}

/* ── key-value row ── */
function row(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
  highlight = false
) {
  doc.fontSize(10).fillColor("#888888").font("Helvetica").text(label, M + 5, y, { width: 260 });
  doc
    .fontSize(10)
    .fillColor(highlight ? "#FACC15" : "#FFFFFF")
    .font("Helvetica-Bold")
    .text(value, 0, y, { width: R, align: "right" });
  doc.font("Helvetica");
}

/* ══════════════════════════════════════════════
   Single payment receipt  GET /api/members/:id/receipt/:index
══════════════════════════════════════════════ */
export async function downloadPaymentReceipt(req: AuthRequest, res: Response): Promise<void> {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }

  const idx = parseInt(req.params.index ?? "0", 10);
  const payment = member.feeHistory[idx];
  if (!payment) { res.status(404).json({ message: "Payment not found" }); return; }

  const totalPaid   = member.feeHistory.reduce((s, f) => s + f.amount, 0);
  const pending     = Math.max(0, member.planPrice - totalPaid);
  const rNo         = receiptNo(member._id.toString(), idx);

  const doc = new PDFDocument({ size: [720, 842], margin: 0, info: { Title: `Receipt ${rNo}`, Author: "Centrum Gym" } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${rNo}.pdf"`);
  doc.pipe(res);

  buildReceipt(doc, {
    rNo,
    memberName:  member.name,
    memberPhone: member.phone,
    memberEmail: member.email,
    plan:        member.plan,
    planPrice:   member.planPrice,
    startDate:   member.startDate,
    endDate:     member.endDate,
    payments:    [{ amount: payment.amount, method: payment.method, date: payment.date, note: payment.note }],
    totalPaid,
    pending,
    title:       "Payment Receipt",
  });

  doc.end();
}

/* ══════════════════════════════════════════════
   Full membership receipt  GET /api/members/:id/receipt
══════════════════════════════════════════════ */
export async function downloadFullReceipt(req: AuthRequest, res: Response): Promise<void> {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }

  const totalPaid = member.feeHistory.reduce((s, f) => s + f.amount, 0);
  const pending   = Math.max(0, member.planPrice - totalPaid);
  const rNo       = receiptNo(member._id.toString(), 99);

  const doc = new PDFDocument({ size: [720, 842], margin: 0, info: { Title: `Membership Receipt ${rNo}`, Author: "Centrum Gym" } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="membership-receipt-${rNo}.pdf"`);
  doc.pipe(res);

  buildReceipt(doc, {
    rNo,
    memberName:  member.name,
    memberPhone: member.phone,
    memberEmail: member.email,
    plan:        member.plan,
    planPrice:   member.planPrice,
    startDate:   member.startDate,
    endDate:     member.endDate,
    payments:    member.feeHistory.map((f) => ({ amount: f.amount, method: f.method, date: f.date, note: f.note })),
    totalPaid,
    pending,
    title:       "Membership Receipt",
  });

  doc.end();
}

/* ══════════════════════════════════════════════
   PDF builder (shared)
══════════════════════════════════════════════ */
interface BuildData {
  rNo: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string;
  plan: string;
  planPrice: number;
  startDate: Date;
  endDate: Date;
  payments: { amount: number; method: string; date: Date; note?: string }[];
  totalPaid: number;
  pending: number;
  title: string;
}

function buildReceipt(doc: PDFKit.PDFDocument, d: BuildData) {
  /* ── Background ── */
  doc.rect(0, 0, PAGE_W, 842).fill("#0A0A0A");

  /* ── Yellow accent bar ── */
  doc.rect(0, 0, PAGE_W, 6).fill("#FACC15");

  /* ── Header ── */
  doc.rect(0, 6, PAGE_W, 100).fill("#111111");

  // Brand
  doc.fontSize(26).font("Helvetica-Bold").fillColor("#FACC15").text("CENTRUM", M, 30, { continued: true });
  doc.fillColor("#F97316").text("GYM", { continued: false });

  // Tagline
  doc.fontSize(8).font("Helvetica").fillColor("#555555")
    .text("2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur – 302012", M, 60)
    .text("+91 78780 58724  |  CentrumGym@gmail.com", M, 73);

  // Receipt title (right side)
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#FACC15")
    .text(d.title.toUpperCase(), 0, 40, { align: "right", width: R });
  doc.fontSize(8).font("Helvetica").fillColor("#888888")
    .text(`Receipt No: ${d.rNo}`, 0, 57, { align: "right", width: R })
    .text(`Date: ${fmt(new Date())}`, 0, 70, { align: "right", width: R });

  let y = 126;

  /* section header helper */
  const section = (label: string) => {
    doc.rect(M, y, PAGE_W - M * 2, 22).fill("#1A1A1A");
    doc.fillColor("#FACC15").fontSize(8).font("Helvetica-Bold")
      .text(label, M + 10, y + 7, { characterSpacing: 1.5 });
  };

  /* ── Member Info ── */
  section("MEMBER DETAILS"); y += 30;
  row(doc, y, "Member Name", d.memberName);             y += 20;
  row(doc, y, "Phone",       d.memberPhone);             y += 20;
  if (d.memberEmail) { row(doc, y, "Email", d.memberEmail); y += 20; }
  hr(doc, y); y += 12;

  /* ── Membership Info ── */
  section("MEMBERSHIP DETAILS"); y += 30;
  row(doc, y, "Plan",        d.plan.charAt(0).toUpperCase() + d.plan.slice(1)); y += 20;
  row(doc, y, "Plan Price",  `Rs. ${d.planPrice.toLocaleString("en-IN")}`);     y += 20;
  row(doc, y, "Valid From",  fmt(d.startDate));                                  y += 20;
  row(doc, y, "Valid Until", fmt(d.endDate), true);                              y += 20;
  hr(doc, y); y += 12;

  /* ── Payments ── */
  section("PAYMENT DETAILS"); y += 30;

  // Column x positions (spread across 720pt page)
  const C = { num: M + 5, date: M + 30, method: M + 190, note: M + 310, amount: R };

  // Table header
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555");
  doc.text("#",        C.num,    y, { width: 20 });
  doc.text("DATE",     C.date,   y, { width: 150 });
  doc.text("METHOD",   C.method, y, { width: 110 });
  doc.text("NOTE",     C.note,   y, { width: 150 });
  doc.text("AMOUNT",   0,        y, { width: R, align: "right" });
  y += 16;
  hr(doc, y); y += 8;

  d.payments.forEach((p, i) => {
    doc.fontSize(9).font("Helvetica").fillColor("#CCCCCC");
    doc.text(String(i + 1),           C.num,    y, { width: 20 });
    doc.text(fmt(p.date),             C.date,   y, { width: 150 });
    doc.text(p.method.toUpperCase(),  C.method, y, { width: 110 });
    doc.text(p.note ?? "—",          C.note,   y, { width: 150 });
    doc.font("Helvetica-Bold").fillColor("#FFFFFF")
      .text(`Rs. ${p.amount.toLocaleString("en-IN")}`, 0, y, { width: R, align: "right" });
    y += 18;
  });

  hr(doc, y); y += 12;

  /* ── Totals ── */
  row(doc, y, "Total Paid", `Rs. ${d.totalPaid.toLocaleString("en-IN")}`, true); y += 22;

  if (d.pending > 0) {
    doc.rect(M, y - 2, PAGE_W - M * 2, 24).fill("#431407");
    row(doc, y + 4, "Pending Balance", `Rs. ${d.pending.toLocaleString("en-IN")}`);
  } else {
    doc.rect(M, y - 2, PAGE_W - M * 2, 24).fill("#14532D");
    row(doc, y + 4, "Balance Due", "FULLY PAID");
  }
  y += 30;

  /* ── Footer ── */
  y = Math.max(y + 40, 720);
  hr(doc, y); y += 16;

  doc.fontSize(8).font("Helvetica").fillColor("#444444")
    .text("This is a computer-generated receipt and does not require a signature.", M, y, { align: "center", width: PAGE_W - M * 2 });
  y += 14;
  doc.text("Thank you for choosing Centrum Gym. Train hard, stay consistent!", M, y, { align: "center", width: PAGE_W - M * 2 });

  /* ── Bottom bars ── */
  doc.rect(0, 826, PAGE_W, 6).fill("#FACC15");
  doc.rect(0, 824, PAGE_W, 2).fill("#F97316");
}
