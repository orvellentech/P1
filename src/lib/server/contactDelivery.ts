import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ContactPayload } from "@/lib/validation/contact";

/**
 * Contact delivery adapters, picked from environment variables:
 *
 *   RESEND_API_KEY + CONTACT_TO_EMAIL (+ CONTACT_FROM_EMAIL)  → email via Resend's HTTP API
 *   CONTACT_WEBHOOK_URL                                       → JSON POST (Slack, Zapier, Make, n8n, your own API…)
 *
 * With neither configured:
 *   development → appended to .data/contact-submissions.jsonl so the flow can be tested end to end
 *   production  → rejected with a clear "not configured" error (messages are never silently dropped)
 */

export class DeliveryNotConfiguredError extends Error {}

interface Submission extends Omit<ContactPayload, "website"> {
  receivedAt: string;
  userAgent: string;
}

export async function deliverContact(sub: Submission): Promise<{ channel: string }> {
  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_WEBHOOK_URL } = process.env;

  if (RESEND_API_KEY && CONTACT_TO_EMAIL) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL || "Website <onboarding@resend.dev>",
        to: [CONTACT_TO_EMAIL],
        reply_to: sub.email,
        subject: `New message from ${sub.name}`,
        text: `${sub.message}\n\n— ${sub.name} <${sub.email}>\nReceived ${sub.receivedAt}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Email provider answered ${res.status}`);
    return { channel: "email" };
  }

  if (CONTACT_WEBHOOK_URL) {
    const res = await fetch(CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contact_form", ...sub }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
    return { channel: "webhook" };
  }

  if (process.env.NODE_ENV !== "production") {
    const dir = path.join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "contact-submissions.jsonl"), JSON.stringify(sub) + "\n", "utf8");
    console.info(`[contact] development delivery → .data/contact-submissions.jsonl (${sub.email})`);
    return { channel: "dev-file" };
  }

  throw new DeliveryNotConfiguredError("Contact delivery is not configured on this server.");
}
