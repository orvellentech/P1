/**
 * Content types shared by the server (API routes) and the client.
 * Everything the visitor reads comes through these shapes, so a CMS or
 * database can replace `site.config.ts` without touching animation code.
 */

export interface Founder {
  name: string;
  role: string;
  description: string;
  /** Absolute URL or path under /public. Leave empty for a placeholder portrait. */
  image: string;
}

export interface ContactChannels {
  email: string;
  phone: string;
  /** International format without "+" or spaces, e.g. "15551234567". */
  whatsapp: string;
  address: string;
}

export interface SocialLinks {
  instagram: string;
  linkedin: string;
  facebook: string;
  twitter: string;
  github: string;
  youtube: string;
  [platform: string]: string;
}

export interface LogoAsset {
  /** Same-origin path is required: the logo is also used as a CSS mask for the portal. */
  src: string;
  alt: string;
  /** Intrinsic aspect ratio of the logo artwork (width / height). */
  aspectRatio: number;
}

export interface SiteContent {
  companyName: string;
  /** Optional one-line tagline shown under the name on the movie title card. */
  tagline: string;
  /** Optional, e.g. "1998". Shown as "Est. 1998" when provided. */
  foundedYear: string;
  logo: LogoAsset;
  intro: string;
  mission: string;
  vision: string;
  about: {
    heading: string;
    /** One entry per paragraph. */
    paragraphs: string[];
  };
  founders: Founder[];
  contact: ContactChannels;
  social: SocialLinks;
}

export interface SiteMeta {
  title: string;
  description: string;
  url: string;
}

export interface InitResponse {
  status: "ok";
  content: SiteContent;
  serverTime: string;
}
