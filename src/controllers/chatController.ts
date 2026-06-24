import { Request, Response } from "express";
import Groq from "groq-sdk";
import { config } from "../config/env";
import { Enquiry } from "../models/Enquiry";

const SYSTEM_PROMPT = `You are Shivam, a friendly and knowledgeable gym counselor at Centrum Gym, Jaipur.

LANGUAGE RULE (most important): Always reply in English only, regardless of what language the user writes in.

Your goals:
1. Answer gym-related questions warmly and helpfully
2. Recommend the right membership plan based on user needs
3. When a user shows interest in joining, visiting, or getting more info — collect their name and phone number

== Centrum Gym Details ==
Location  : 2nd Floor, LN Plaza, Niwaru Link Road, Jhotwara, Jaipur
Phone     : +91 78780 58724
Timings   : Morning 5:30 AM – 11:30 AM | Evening 4:00 PM – 10:30 PM

== Membership Plans ==
Basic    : ₹1,000/month  — Gym equipment access
Standard : ₹2,500/month  — Equipment + group classes
Premium  : ₹4,500/month  — Everything + personal trainer
Yearly   : ₹8,000/year   — Best value, all facilities included

== Facilities ==
Modern equipment, AC gym, trained staff, locker rooms, free Wi-Fi

== Rules ==
- Only answer gym-related questions. For unrelated topics, politely redirect.
- Keep responses short and friendly (2–4 sentences max).
- When asking for contact info, ask for name first, then phone number.
- NEVER make up information not listed above.

== Lead Capture (CRITICAL) ==
When you have BOTH the user's name AND phone number, append this EXACTLY at the very end of your reply on a new line — no extra text after it:
LEAD:{"name":"<name>","phone":"<phone>","notes":"<brief summary of their interest>"}`;

function getGroq() {
  if (!config.groqApiKey || config.groqApiKey === "gsk_your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY is not configured in .env");
  }
  return new Groq({ apiKey: config.groqApiKey });
}

export interface ChatMessage { role: "user" | "assistant"; content: string; }

/* POST /api/chat  — body: { messages: ChatMessage[] } */
export async function chat(req: Request, res: Response): Promise<void> {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "messages array is required" });
    return;
  }

  let groq: Groq;
  try {
    groq = getGroq();
  } catch (e) {
    res.status(503).json({ message: (e as Error).message });
    return;
  }

  const completion = await groq.chat.completions.create({
    model:       "llama-3.1-8b-instant",
    temperature: 0.6,
    max_tokens:  512,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10), // last 10 messages to keep context
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const leadMatch = raw.match(/LEAD:\s*(\{[\s\S]*?\})/);
  let reply = raw.replace(/\n?LEAD:\s*\{[\s\S]*?\}/, "").trim();
  let lead: { name: string; phone: string; notes: string } | null = null;

  if (leadMatch) {
    try {
      lead = JSON.parse(leadMatch[1]);
    } catch { /* ignore malformed JSON */ }
  }

  // If reply is empty after stripping LEAD, add a confirmation message
  if (!reply && lead) {
    reply = "Thank you! 🎉 Your enquiry has been saved. Our team will contact you shortly.";
  }

  /* Auto-save lead as enquiry */
  if (lead?.name && lead?.phone) {
    try {
      await Enquiry.create({
        name:    lead.name,
        phone:   lead.phone,
        message: lead.notes ?? "Lead from chatbot",
        source:  "chatbot",
        status:  "new",
      });
      console.log(`[Chat] Lead saved: ${lead.name} — ${lead.phone}`);
    } catch (e) {
      console.error("[Chat] Failed to save lead:", e);
    }
  }

  res.json({ reply, leadCaptured: !!lead, lead });
}
