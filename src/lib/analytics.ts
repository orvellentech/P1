/**
 * Analytics-ready event bus. Provider-agnostic:
 *  - pushes to `window.dataLayer` (Google Tag Manager / GA4) when present,
 *  - dispatches a `site:analytics` DOM event for any other integration,
 *  - logs in development.
 */

export type AnalyticsEvent =
  | "loading_start"
  | "loading_success"
  | "loading_error"
  | "loading_retry"
  | "intro_complete"
  | "intro_skipped"
  | "chapter_view"
  | "snap_triggered"
  | "sound_toggle"
  | "contact_submit"
  | "contact_success"
  | "contact_error"
  | "contact_channel_click";

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, ...props, ts: Date.now() };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("site:analytics", { detail: payload }));
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event, props);
  }
}
