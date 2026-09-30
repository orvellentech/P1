import { gsap } from "@/lib/gsap";
import { DECREE, SCROLL } from "@/config/animation.config";
import type { DecreeRoll } from "./gl/DecreeRoll";

export interface DecreeRefs {
  section: HTMLElement;
  roll: DecreeRoll | null;
  /** CSS-only sheet used when WebGL is unavailable. */
  fallbackSheet: HTMLElement | null;
  parchment: HTMLElement;
  warmth: HTMLElement;
  antiqueChars: HTMLElement[];
  modernChars: HTMLElement[];
  ornate: HTMLElement;
  hairline: HTMLElement;
  labelPast: HTMLElement;
  labelPresent: HTMLElement;
}

const span = (r: readonly [number, number]) => r[1] - r[0];

/**
 * Chapter V → Phase 8. The decree curls, rolls into a scroll and recedes;
 * meanwhile yellow parchment bleaches to modern white and the heading's
 * letterforms evolve from 17th-century type into contemporary type.
 */
export function createDecree(r: DecreeRefs, reduced: boolean) {
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: () => r.roll?.render(),
    scrollTrigger: { trigger: r.section, start: "top top", end: "bottom bottom", scrub: reduced ? true : SCROLL.scrub },
  });
  tl.to({}, { duration: 1 }, 0); // normalise the timeline to progress units

  gsap.set(r.antiqueChars, { autoAlpha: 0 });
  gsap.set(r.modernChars, { autoAlpha: 0 });
  gsap.set([r.ornate, r.labelPast], { autoAlpha: 0 });
  gsap.set(r.labelPresent, { autoAlpha: 0 });
  gsap.set(r.hairline, { scaleX: 0 });

  // --- The sheet --------------------------------------------------------
  if (r.roll) {
    const st = r.roll.state;
    if (reduced) {
      tl.to(st, { opacity: 0, duration: 0.2 }, DECREE.roll[0]);
    } else {
      tl.to(st, { curl: 1, duration: span(DECREE.curl), ease: "sine.inOut" }, DECREE.curl[0])
        .to(st, { roll: 1, duration: span(DECREE.roll), ease: "power1.inOut" }, DECREE.roll[0])
        .to(st, { fly: 1, duration: span(DECREE.flyAway), ease: "power2.in" }, DECREE.flyAway[0])
        .to(st, { opacity: 0, duration: span(DECREE.flyAway) * 0.5, ease: "power1.in" }, DECREE.flyAway[0] + span(DECREE.flyAway) * 0.5);
    }
  } else if (r.fallbackSheet) {
    // CSS fallback: the sheet folds up on its top edge and recedes.
    tl.fromTo(
      r.fallbackSheet,
      // Keep the CSS centring as percentages so it survives resizes.
      { xPercent: -50, yPercent: -50, rotationX: 0, scaleY: 1, y: 0, autoAlpha: 1 },
      { xPercent: -50, yPercent: -50, rotationX: reduced ? 0 : 70, scaleY: reduced ? 1 : 0.2, y: reduced ? 0 : "-20vh", autoAlpha: 0, duration: span(DECREE.roll) + span(DECREE.flyAway) * 0.5, ease: "power1.in", transformOrigin: "50% 0%" },
      DECREE.roll[0],
    );
  }

  // --- Past → present: colour, texture, warmth ----------------------------
  tl.to(r.parchment, { opacity: 0, duration: span(DECREE.whiten), ease: "sine.inOut" }, DECREE.whiten[0]).to(
    r.warmth,
    { opacity: 0, duration: span(DECREE.whiten) * 0.8, ease: "sine.inOut" },
    DECREE.whiten[0] + span(DECREE.whiten) * 0.2,
  );

  // --- Typography evolves --------------------------------------------------
  const [m0, m1] = DECREE.typeMorph;
  const mSpan = m1 - m0;
  // 1. The heading is inked in its antique form.
  tl.fromTo(r.antiqueChars, { autoAlpha: 0, filter: "blur(4px)" }, { autoAlpha: 1, filter: "blur(0px)", duration: 0.06, stagger: 0.003 }, DECREE.whiten[0] + 0.06)
    .fromTo(r.ornate, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.08 }, DECREE.whiten[0] + 0.08)
    .to(r.labelPast, { autoAlpha: 1, duration: 0.05 }, DECREE.whiten[0] + 0.1);

  // 2. Letter by letter, the old forms dissolve and modern forms resolve.
  if (reduced) {
    tl.to(r.antiqueChars, { autoAlpha: 0, duration: mSpan * 0.4 }, m0)
      .to(r.modernChars, { autoAlpha: 1, duration: mSpan * 0.4 }, m0 + mSpan * 0.3);
  } else {
    tl.to(r.antiqueChars, { autoAlpha: 0, yPercent: -18, filter: "blur(6px)", duration: mSpan * 0.35, stagger: { amount: mSpan * 0.4 } }, m0)
      .fromTo(r.modernChars, { autoAlpha: 0, yPercent: 22, filter: "blur(8px)" }, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: mSpan * 0.4, stagger: { amount: mSpan * 0.4 }, ease: "power2.out" }, m0 + mSpan * 0.12);
  }
  // 3. Ornate borders simplify into a single hairline.
  tl.to(r.ornate, { autoAlpha: 0, scaleX: 1.15, scaleY: 0.6, duration: mSpan * 0.5, ease: "power2.in" }, m0 + mSpan * 0.1)
    .to(r.hairline, { scaleX: 1, duration: mSpan * 0.5, ease: "power2.out" }, m0 + mSpan * 0.45)
    .to(r.labelPast, { autoAlpha: 0, duration: mSpan * 0.2 }, m0 + mSpan * 0.2)
    .to(r.labelPresent, { autoAlpha: 1, duration: mSpan * 0.25 }, m0 + mSpan * 0.55);

  return tl;
}
