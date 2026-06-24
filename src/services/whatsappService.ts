import twilio from "twilio";
import { config } from "../config/env";

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export function getClient() {
  const { accountSid, authToken } = config.twilio;
  if (!accountSid || !authToken) throw new Error("Twilio credentials not configured");
  return twilio(accountSid, authToken);
}

/* ── Welcome message on enrollment ── */
export interface WelcomeWAData {
  name: string;
  phone: string;
  plan: string;
  planPrice: number;
  amountPaid: number;
  startDate: Date;
  endDate: Date;
}

export async function sendWelcomeWhatsApp(data: WelcomeWAData): Promise<void> {
  const { name, phone, plan, planPrice, amountPaid, startDate, endDate } = data;
  const pending = Math.max(0, planPrice - amountPaid);

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const body = [
    `🏋️ *Welcome to Centrum Gym!*`,
    ``,
    `Hi *${name}*, your membership has been successfully registered.`,
    ``,
    `📋 *Membership Details*`,
    `Plan       : ${planLabel}`,
    `Plan Price : Rs. ${planPrice.toLocaleString("en-IN")}`,
    `Valid From : ${fmt(startDate)}`,
    `Valid Until: ${fmt(endDate)}`,
    ``,
    `💰 *Payment Summary*`,
    `Amount Paid: Rs. ${amountPaid.toLocaleString("en-IN")}`,
    pending > 0
      ? `Pending    : Rs. ${pending.toLocaleString("en-IN")} ⚠️`
      : `Status     : Fully Paid ✅`,
    ``,
    `📍 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur`,
    `📞 +91 78780 58724`,
    ``,
    `_Train hard. Stay consistent. 💪_`,
  ].join("\n");

  const to = `whatsapp:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
  await getClient().messages.create({ from: config.twilio.from, to, body });
}

/* ── Birthday wish ── */
export interface BirthdayWAData {
  name: string;
  phone: string;
  plan: string;
}

export async function sendBirthdayWhatsApp(data: BirthdayWAData): Promise<void> {
  const { name, phone, plan } = data;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const body = [
    `🎂 *Happy Birthday from Centrum Gym!*`,
    ``,
    `Dear *${name}*,`,
    ``,
    `Wishing you a very Happy Birthday! 🎉🎊`,
    ``,
    `May this year bring you great health, strength, and happiness. Keep crushing your fitness goals! 💪`,
    ``,
    `🏋️ Your *${planLabel}* membership is always here to support your journey.`,
    ``,
    `With love,`,
    `*Team Centrum Gym*`,
    `📞 +91 78780 58724`,
    `📍 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur`,
  ].join("\n");

  const to = `whatsapp:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
  await getClient().messages.create({ from: config.twilio.from, to, body });
}

/* ── Expiry reminder ── */
export interface ExpiryWAData {
  name: string;
  phone: string;
  plan: string;
  endDate: Date;
  daysLeft: number;
}

export async function sendExpiryReminderWhatsApp(data: ExpiryWAData): Promise<void> {
  const { name, phone, plan, endDate, daysLeft } = data;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const urgency   = daysLeft <= 3 ? "🔴" : daysLeft <= 7 ? "🟡" : "🟢";

  const body = [
    `${urgency} *Membership Expiry Reminder*`,
    ``,
    `Hi *${name}*, your Centrum Gym membership is expiring soon!`,
    ``,
    `📋 Plan      : ${planLabel}`,
    `📅 Expires On: ${fmt(endDate)}`,
    `⏳ Days Left : ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    ``,
    `Renew your membership to keep your fitness streak going! 💪`,
    ``,
    `📞 Call us: +91 78780 58724`,
    `📍 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur`,
  ].join("\n");

  const to = `whatsapp:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
  await getClient().messages.create({ from: config.twilio.from, to, body });
}

/* ── Payment Receipt ── */
export interface PaymentReceiptWAData {
  name: string; phone: string; plan: string;
  amount: number; method: string; date: Date;
  totalPaid: number; planPrice: number; endDate: Date;
}

export async function sendPaymentReceiptWhatsApp(data: PaymentReceiptWAData): Promise<void> {
  const { name, phone, plan, amount, method, date, totalPaid, planPrice, endDate } = data;
  const planLabel   = plan.charAt(0).toUpperCase() + plan.slice(1);
  const methodLabel = method.toUpperCase();
  const due         = Math.max(0, planPrice - totalPaid);

  const body = [
    `✅ *Payment Received — Centrum Gym*`,
    ``,
    `Hi *${name}*, your payment has been recorded.`,
    ``,
    `🧾 *Receipt Details*`,
    `Amount Paid : Rs. ${amount.toLocaleString("en-IN")}`,
    `Method      : ${methodLabel}`,
    `Date        : ${fmt(date)}`,
    ``,
    `📋 *Membership*`,
    `Plan        : ${planLabel}`,
    `Plan Price  : Rs. ${planPrice.toLocaleString("en-IN")}`,
    `Total Paid  : Rs. ${totalPaid.toLocaleString("en-IN")}`,
    due > 0
      ? `Pending Due : Rs. ${due.toLocaleString("en-IN")} ⚠️`
      : `Status      : Fully Paid ✅`,
    `Valid Until : ${fmt(endDate)}`,
    ``,
    `📍 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur`,
    `📞 +91 78780 58724`,
    ``,
    `_Thank you for choosing Centrum Gym! 💪_`,
  ].join("\n");

  const to = `whatsapp:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
  await getClient().messages.create({ from: config.twilio.from, to, body });
}

/* ── Membership Renewal ── */
export interface RenewalWAData {
  name: string; phone: string; plan: string;
  planPrice: number; amountPaid: number;
  startDate: Date; endDate: Date;
}

export async function sendRenewalWhatsApp(data: RenewalWAData): Promise<void> {
  const { name, phone, plan, planPrice, amountPaid, startDate, endDate } = data;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const due       = Math.max(0, planPrice - amountPaid);

  const body = [
    `🔄 *Membership Renewed — Centrum Gym*`,
    ``,
    `Hi *${name}*, your membership has been successfully renewed!`,
    ``,
    `📋 *New Membership Details*`,
    `Plan        : ${planLabel}`,
    `Starts      : ${fmt(startDate)}`,
    `Valid Until : ${fmt(endDate)}`,
    ``,
    `💳 *Payment*`,
    `Plan Price  : Rs. ${planPrice.toLocaleString("en-IN")}`,
    amountPaid > 0
      ? `Amount Paid : Rs. ${amountPaid.toLocaleString("en-IN")}`
      : `Amount Paid : Rs. 0`,
    due > 0
      ? `Pending Due : Rs. ${due.toLocaleString("en-IN")} ⚠️`
      : `Status      : Fully Paid ✅`,
    ``,
    `Keep up the great work! See you at the gym 💪`,
    ``,
    `📍 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur`,
    `📞 +91 78780 58724`,
  ].join("\n");

  const to = `whatsapp:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
  await getClient().messages.create({ from: config.twilio.from, to, body });
}
