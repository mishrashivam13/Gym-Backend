import nodemailer from "nodemailer";
import { config } from "../config/env";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

/* ── shared layout wrapper ── */
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Centrum Gym</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#111;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;border-bottom:3px solid #facc15;">
            <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;text-transform:uppercase;">
              <span style="color:#facc15;">CEN</span><span style="color:#f97316;">TRUM</span>
              <span style="font-size:18px;color:#fff;margin-left:6px;">GYM</span>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">Jhotwara, Jaipur · Rajasthan</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#111;padding:32px;border-radius:0 0 16px 16px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3f3f46;">
              📍 2nd Floor, LN Plaza, Near Govindpura, Niwaru Link Road, Jhotwara, Jaipur – 302012
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#3f3f46;">
              📞 +91 78780 58724 &nbsp;|&nbsp; ✉️ CentrumGym@gmail.com
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#27272a;">© ${new Date().getFullYear()} Centrum Gym. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── helpers ── */
function infoRow(label: string, value: string, highlight = false): string {
  return `
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#a1a1aa;border-bottom:1px solid #1f1f1f;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${highlight ? "#facc15" : "#fff"};text-align:right;border-bottom:1px solid #1f1f1f;">${value}</td>
  </tr>`;
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

/* ══════════════════════════════════════════════
   1. WELCOME / ENROLLMENT EMAIL
══════════════════════════════════════════════ */
export interface WelcomeEmailData {
  name: string;
  email: string;
  plan: string;
  planPrice: number;
  amountPaid: number;
  startDate: Date | string;
  endDate: Date | string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!data.email || !config.smtp.user) return;

  const pending = Math.max(0, data.planPrice - data.amountPaid);
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);

  const content = `
    <!-- Greeting -->
    <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#fff;">
      Welcome, ${data.name}! 💪
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
      You're now an official member of <strong style="color:#facc15;">Centrum Gym</strong>.
      Train hard, stay consistent, and conquer your goals!
    </p>

    <!-- Membership card -->
    <div style="background:#1a1a1a;border:1px solid #27272a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="background:#facc15;padding:12px 18px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#000;">
          Membership Details
        </p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Plan",           planLabel)}
        ${infoRow("Valid From",     fmt(data.startDate))}
        ${infoRow("Valid Until",    fmt(data.endDate), true)}
        ${infoRow("Amount Paid",    `₹${data.amountPaid.toLocaleString("en-IN")}`)}
        ${pending > 0
          ? infoRow("Pending Balance", `₹${pending.toLocaleString("en-IN")}`, false)
          : infoRow("Balance Due", "None — Fully Paid ✅")}
      </table>
    </div>

    ${pending > 0 ? `
    <!-- Pending notice -->
    <div style="background:#431407;border:1px solid #7c2d12;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#fdba74;line-height:1.6;">
        ⚠️ <strong>Pending Balance: ₹${pending.toLocaleString("en-IN")}</strong><br/>
        Please clear the remaining amount at the gym counter at your earliest convenience.
      </p>
    </div>` : ""}

    <!-- Gym info -->
    <div style="background:#1a1a1a;border:1px solid #27272a;border-radius:12px;padding:18px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#71717a;">Gym Timings</p>
      <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.8;">
        🕔 Mon – Sat: <strong style="color:#fff;">5:00 AM – 10:00 PM</strong><br/>
        🕕 Sunday: <strong style="color:#fff;">6:00 AM – 8:00 PM</strong>
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#52525b;text-align:center;">
      Questions? Call us at <a href="tel:+917878058724" style="color:#facc15;text-decoration:none;">+91 78780 58724</a>
    </p>
  `;

  await transporter.sendMail({
    from:    config.smtp.from,
    to:      data.email,
    subject: `🏋️ Welcome to Centrum Gym, ${data.name}!`,
    html:    layout(content),
  });

  console.log(`[Email] Welcome email sent to ${data.email}`);
}

/* ══════════════════════════════════════════════
   2. EXPIRY REMINDER EMAIL
══════════════════════════════════════════════ */
export interface ExpiryEmailData {
  name: string;
  email: string;
  plan: string;
  endDate: Date | string;
  daysLeft: number;
}

export async function sendExpiryReminderEmail(data: ExpiryEmailData): Promise<void> {
  if (!data.email || !config.smtp.user) return;

  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const urgency   = data.daysLeft <= 3 ? "🚨" : "⏰";

  const content = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#fff;">
      ${urgency} Membership Expiring Soon
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
      Hi <strong style="color:#fff;">${data.name}</strong>, your <strong style="color:#facc15;">${planLabel}</strong> plan
      at Centrum Gym is expiring in <strong style="color:#f97316;">${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}</strong>.
      Renew now to keep your fitness streak going!
    </p>

    <!-- Expiry card -->
    <div style="background:#1a1a1a;border:1px solid #27272a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="background:${data.daysLeft <= 3 ? "#991b1b" : "#78350f"};padding:12px 18px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#fff;">
          ${data.daysLeft <= 3 ? "Urgent — Expiring Very Soon!" : "Renewal Reminder"}
        </p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Current Plan",   planLabel)}
        ${infoRow("Expiry Date",    fmt(data.endDate), true)}
        ${infoRow("Days Remaining", `${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`, data.daysLeft <= 3)}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="tel:+917878058724"
        style="display:inline-block;background:#facc15;color:#000;font-weight:900;font-size:14px;
               letter-spacing:2px;text-transform:uppercase;padding:14px 32px;border-radius:10px;
               text-decoration:none;">
        📞 Renew My Membership
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#52525b;">
        Call or visit us to renew: <strong style="color:#a1a1aa;">+91 78780 58724</strong>
      </p>
    </div>

    <div style="background:#1a1a1a;border:1px solid #27272a;border-radius:12px;padding:18px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#71717a;">Gym Timings</p>
      <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.8;">
        🕔 Mon – Sat: <strong style="color:#fff;">5:00 AM – 10:00 PM</strong><br/>
        🕕 Sunday: <strong style="color:#fff;">6:00 AM – 8:00 PM</strong>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    config.smtp.from,
    to:      data.email,
    subject: `${urgency} Your Centrum Gym membership expires in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`,
    html:    layout(content),
  });

  console.log(`[Email] Expiry reminder sent to ${data.email} (${data.daysLeft} days left)`);
}
