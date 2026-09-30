import { gsap } from "@/lib/gsap";
import { SCROLL } from "@/config/animation.config";

/**
 * Ink soaking into paper: words darken from a faint impression to full ink
 * as the passage moves through the reading zone. Opacity + colour only
 * (no per-word filters) keeps long passages cheap to repaint.
 */
export function createInkReveal(block: HTMLElement, reduced: boolean) {
  const words = block.querySelectorAll<HTMLElement>("[data-word]");
  if (!words.length) return;
  if (reduced) {
    gsap.fromTo(block, { opacity: 0 }, { opacity: 1, duration: 0.6, scrollTrigger: { trigger: block, start: "top 85%", toggleActions: "play none none reverse" } });
    return;
  }
  gsap.fromTo(
    words,
    { opacity: 0.1, color: "#9c8358" },
    {
      opacity: 1,
      color: "#3a2714",
      ease: "none",
      stagger: 0.08,
      scrollTrigger: { trigger: block, start: "top 88%", end: "bottom 58%", scrub: SCROLL.scrub },
    },
  );
}

/** Engraved ornaments draw themselves, like a pen stroke. */
export function createDrawOn(svg: SVGElement, reduced: boolean) {
  const paths = svg.querySelectorAll<SVGPathElement>("[data-draw] path");
  paths.forEach((p) => {
    p.setAttribute("pathLength", "1");
    p.style.strokeDasharray = "1";
  });
  gsap.fromTo(
    paths,
    { strokeDashoffset: reduced ? 0 : 1 },
    {
      strokeDashoffset: 0,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger: svg, start: "top 92%", end: "top 60%", scrub: SCROLL.scrub },
    },
  );
}

/** Headings settle into the page with a faint letterpress impression. */
export function createPress(el: HTMLElement, reduced: boolean) {
  const from: gsap.TweenVars = reduced ? { opacity: 0 } : { opacity: 0, y: 24, letterSpacing: "0.08em" };
  const to: gsap.TweenVars = reduced ? { opacity: 1 } : { opacity: 1, y: 0, letterSpacing: "0em" };
  gsap.fromTo(el, from, {
    ...to,
    ease: "editorial",
    scrollTrigger: { trigger: el, start: "top 90%", end: "top 65%", scrub: SCROLL.scrub },
  });
}
