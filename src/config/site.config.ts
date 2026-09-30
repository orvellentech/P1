import type { SiteContent, SiteMeta } from "./types";

/**
 * ============================================================
 *  DEVELOPER CONFIGURATION — replace every [PLACEHOLDER] below.
 * ============================================================
 *
 * This is the only file you need to edit to brand the experience.
 * The content is served to the browser by GET /api/init, so you can
 * later swap this object for a CMS or database call in
 * `src/lib/server/content.ts` without changing any component.
 *
 * Values wrapped in [SQUARE BRACKETS] are detected as placeholders and
 * rendered with a dashed "developer placeholder" style in development.
 * Empty strings hide the related UI (e.g. an empty phone number is not shown).
 */
export const siteConfig: SiteContent = {
  companyName: "[COMPANY NAME]",
  tagline: "[OPTIONAL TAGLINE]",
  foundedYear: "",

  logo: {
    // Put your logo in /public/brand and point to it here.
    // SVG or transparent PNG recommended: the logo's opaque shape becomes the portal.
    src: "/brand/logo-placeholder.svg",
    alt: "[COMPANY NAME] logo",
    aspectRatio: 1,
  },

  intro:
    "[COMPANY INTRODUCTION — Replace this paragraph in src/config/site.config.ts with the story of how the company began, what it does, and who it serves.]",
  mission: "[COMPANY MISSION — One or two sentences describing the mission.]",
  vision: "[COMPANY VISION — One or two sentences describing the vision.]",

  about: {
    heading: "About the Company",
    paragraphs: [
      "[COMPANY INFORMATION — Replace with a short overview of the company today: what it builds, how it works, and what makes it different.]",
      "[OPTIONAL SECOND PARAGRAPH — Add more detail, or remove this entry.]",
    ],
  },

  founders: [
    { name: "[FOUNDER 1]", role: "[ROLE]", description: "[DESCRIPTION]", image: "" },
    { name: "[FOUNDER 2]", role: "[ROLE]", description: "[DESCRIPTION]", image: "" },
    { name: "[FOUNDER 3]", role: "[ROLE]", description: "[DESCRIPTION]", image: "" },
  ],

  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
  },

  social: {
    instagram: "",
    linkedin: "",
    facebook: "",
    twitter: "",
    github: "",
    youtube: "",
  },
};

export const siteMeta: SiteMeta = {
  title: "[COMPANY NAME] — From the Past to 2060",
  description: "[SITE DESCRIPTION — used for search engines and link previews.]",
  url: "https://example.com",
};

/** True when a string is an unreplaced [PLACEHOLDER] value. */
export function isPlaceholder(value: string | undefined | null): boolean {
  return !!value && /^\s*\[.*\]\s*$/s.test(value);
}
