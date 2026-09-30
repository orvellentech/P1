import type { InitResponse, SiteContent } from "@/config/types";
import type { ContactPayload, ContactFieldErrors } from "@/lib/validation/contact";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: ContactFieldErrors,
  ) {
    super(message);
  }
}

/** Development-only helpers: `?debugFail=init` and `?debugDelay=3000` are forwarded to the API. */
function debugQuery(): string {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return "";
  const page = new URLSearchParams(window.location.search);
  const q = new URLSearchParams();
  const fail = page.get("debugFail");
  const delay = page.get("debugDelay");
  if (fail) q.set("simulate", fail);
  if (delay) q.set("delay", delay);
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isSiteContent(v: unknown): v is SiteContent {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.companyName === "string" &&
    !!c.logo &&
    typeof (c.logo as Record<string, unknown>).src === "string" &&
    Array.isArray(c.founders) &&
    !!c.about &&
    !!c.contact &&
    !!c.social
  );
}

export async function fetchInit(signal: AbortSignal): Promise<InitResponse> {
  const res = await fetch(`/api/init${debugQuery()}`, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  const body = (await readJson(res)) as Partial<InitResponse> & { error?: string } | null;
  if (!res.ok) {
    throw new ApiError(body?.error ?? `The server answered ${res.status}`, res.status);
  }
  if (!body || body.status !== "ok" || !isSiteContent(body.content)) {
    throw new ApiError("The server sent an unexpected response", res.status);
  }
  return body as InitResponse;
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await readJson(res)) as { ok?: boolean; error?: string; fieldErrors?: ContactFieldErrors } | null;
  if (!res.ok || !body?.ok) {
    throw new ApiError(body?.error ?? "Something went wrong. Please try again.", res.status, body?.fieldErrors);
  }
}
