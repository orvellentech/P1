import { NextResponse } from "next/server";
import { sanitizePayload, validateContact, type ContactPayload } from "@/lib/validation/contact";
import { rateLimit } from "@/lib/server/rateLimit";
import { deliverContact, DeliveryNotConfiguredError } from "@/lib/server/contactDelivery";

export const dynamic = "force-dynamic";

const RATE = { limit: 5, windowMs: 10 * 60 * 1000 };
const MAX_BODY_BYTES = 16 * 1024;

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ ok: false, error: "Expected a JSON body." }, 415);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: "Message is too large." }, 413);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const limited = rateLimit(`contact:${ip}`, RATE.limit, RATE.windowMs);
  if (!limited.ok) {
    return json({ ok: false, error: "Too many messages. Please try again in a few minutes." }, 429, { "Retry-After": String(limited.retryAfter) });
  }

  let raw: Partial<ContactPayload>;
  try {
    raw = (await request.json()) as Partial<ContactPayload>;
  } catch {
    return json({ ok: false, error: "The request body is not valid JSON." }, 400);
  }

  const payload = sanitizePayload(raw);

  // Honeypot filled → pretend success so bots learn nothing.
  if (payload.website) return json({ ok: true });

  const fieldErrors = validateContact(payload);
  if (Object.keys(fieldErrors).length) {
    return json({ ok: false, error: "Please check the highlighted fields.", fieldErrors }, 422);
  }

  try {
    await deliverContact({
      name: payload.name,
      email: payload.email,
      message: payload.message,
      receivedAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
    });
    return json({ ok: true });
  } catch (err) {
    console.error("[api/contact] delivery failed:", err);
    if (err instanceof DeliveryNotConfiguredError) {
      return json({ ok: false, error: "The contact form isn't connected yet. Please use the email address listed on this page." }, 503);
    }
    return json({ ok: false, error: "We couldn't send your message right now. Please try again." }, 502);
  }
}
