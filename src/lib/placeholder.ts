import { isPlaceholder } from "@/config/site.config";

const isDev = process.env.NODE_ENV !== "production";

/** Adds a dashed "developer placeholder" outline (development only) to unreplaced [PLACEHOLDER] content. */
export function devPlaceholder(value: string | undefined): { "data-placeholder"?: "true" } {
  return isDev && isPlaceholder(value) ? { "data-placeholder": "true" } : {};
}
