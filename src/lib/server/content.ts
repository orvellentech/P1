import "server-only";
import { siteConfig } from "@/config/site.config";
import type { SiteContent } from "@/config/types";

/**
 * Backend content source.
 *
 * Today this reads the typed config file. To move content to a CMS or a
 * database, replace the body of this function — the API contract
 * (`SiteContent`) and every component stay the same.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const content = structuredClone(siteConfig);
  assertContent(content);
  return content;
}

function assertContent(c: SiteContent) {
  if (!c.companyName.trim()) throw new Error("siteConfig.companyName is empty");
  if (!c.logo.src.trim()) throw new Error("siteConfig.logo.src is empty");
  if (/^https?:\/\//.test(c.logo.src)) {
    // The logo doubles as a CSS mask for the portal transition, which requires same-origin.
    throw new Error("siteConfig.logo.src must be a same-origin path (put the file in /public)");
  }
  if (!(c.logo.aspectRatio > 0)) throw new Error("siteConfig.logo.aspectRatio must be a positive number");
}
