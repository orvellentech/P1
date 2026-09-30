import "server-only";

/**
 * Fixed-window in-memory rate limiter.
 * Good for a single server instance. Behind multiple instances or on
 * serverless, swap for a shared store (Redis / Upstash / a database).
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 5000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > limit) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}
