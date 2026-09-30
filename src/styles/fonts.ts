import { Cinzel, EB_Garamond, IM_Fell_English, Instrument_Serif, Manrope, Unbounded } from "next/font/google";

/** Old movie title cards. */
export const fontMovie = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-movie", display: "swap" });
/** Antique page headings — printed 17th-century type. */
export const fontAntique = IM_Fell_English({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-antique", display: "swap" });
/** Antique page body text — high readability old-style serif. */
export const fontAntiqueBody = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-antique-body", display: "swap" });
/** Modern editorial display. */
export const fontDisplay = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
/** Modern interface / body sans. */
export const fontSans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
/** 2060 display. */
export const fontFuture = Unbounded({ subsets: ["latin"], variable: "--font-future", display: "swap" });

export const fontVariables = [fontMovie, fontAntique, fontAntiqueBody, fontDisplay, fontSans, fontFuture].map((f) => f.variable).join(" ");

const family = (f: { style: { fontFamily: string } }) => f.style.fontFamily.split(",")[0].replace(/['"]/g, "").trim();

/** Resolved family names — used by the loader and by canvas text rendering. */
export const FONT_FAMILY = {
  movie: family(fontMovie),
  antique: family(fontAntique),
  antiqueBody: family(fontAntiqueBody),
  display: family(fontDisplay),
  sans: family(fontSans),
  future: family(fontFuture),
};

/** Font faces the first chapters cannot render without. */
export const CRITICAL_FONT_FACES = [
  `400 32px "${FONT_FAMILY.movie}"`,
  `600 32px "${FONT_FAMILY.movie}"`,
  `400 32px "${FONT_FAMILY.antique}"`,
  `italic 400 32px "${FONT_FAMILY.antique}"`,
  `400 32px "${FONT_FAMILY.antiqueBody}"`,
  `italic 400 32px "${FONT_FAMILY.antiqueBody}"`,
  `400 32px "${FONT_FAMILY.display}"`,
  `400 32px "${FONT_FAMILY.sans}"`,
  `700 32px "${FONT_FAMILY.future}"`,
];
