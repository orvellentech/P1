import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/server/content";
import type { InitResponse } from "@/config/types";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV !== "production";

/**
 * GET /api/init — backend initialisation for the experience.
 * The theater door stays closed until this answers successfully.
 *
 * Development-only switches (ignored in production):
 *   ?simulate=fail     → responds 503 so the error / retry state can be tested
 *   ?simulate=flaky    → fails ~50% of the time
 *   ?delay=3000        → waits N ms before answering (max 10s)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (isDev) {
    const delay = Math.min(10000, Math.max(0, Number(url.searchParams.get("delay")) || 0));
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const simulate = url.searchParams.get("simulate");
    if (simulate === "fail" || (simulate === "flaky" && Math.random() < 0.5)) {
      return NextResponse.json({ error: "Simulated backend failure (development only)" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }

  try {
    const content = await getSiteContent();
    const body: InitResponse = { status: "ok", content, serverTime: new Date().toISOString() };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/init] failed:", err);
    return NextResponse.json(
      { error: isDev && err instanceof Error ? err.message : "The server could not prepare the show." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
