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

/** Waits `ms`, rejecting early if the loading run is aborted (e.g. its timeout fired). */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("Aborted"));
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(new Error("Aborted"))), { once: true });
  });
}

/** Network errors, timeouts, rate limits and 5xx are worth another try; 4xx and bad payloads are not. */
function isTransient(err: unknown) {
  if (err instanceof ApiError) return err.status === 0 || err.status === 408 || err.status === 429 || err.status >= 500;
  return err instanceof TypeError; // fetch() network failure
}

/**
 * A single dropped request should not end the show: transient failures are
 * retried quietly (the door keeps shaking) before the error state is shown.
 * The loading task's own timeout still bounds the total wait.
 */
export async function fetchInit(signal: AbortSignal): Promise<InitResponse> {
  const backoff = [600, 1500, 3000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchInitOnce(signal);
    } catch (err) {
      if (signal.aborted || attempt >= backoff.length || !isTransient(err)) throw err;
      await wait(backoff[attempt], signal);
    }
  }
}

async function fetchInitOnce(signal: AbortSignal): Promise<InitResponse> {
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
