import { gsap } from "@/lib/gsap";
import { FUTURE, SCROLL } from "@/config/animation.config";

export interface FutureRefs {
  section: HTMLElement;
  lines: HTMLElement[][]; // chars per line group: [welcome+year], [era], [limitless]
  lineEls: HTMLElement[];
  hud: HTMLElement;
}

const span = (r: readonly [number, number]) => r[1] - r[0];

/**
 * Chapter VIII typography. Letters swing up out of depth (rotateX from
 * below the baseline, translateZ from behind) with a staggered cascade;
 * when the chapter ends the whole headline flies past the camera.
 */
export function createFutureType(r: FutureRefs, reduced: boolean) {
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: r.section, start: "top top", end: "bottom bottom", scrub: reduced ? true : SCROLL.scrub },
  });
  tl.to({}, { duration: 1 }, 0);

  const ranges = [FUTURE.line1, FUTURE.line2, FUTURE.line3];
  r.lines.forEach((chars, i) => {
    const [a, b] = ranges[i];
    if (reduced) {
      tl.fromTo(chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: span(ranges[i]) * 0.6 }, a);
      return;
    }
    tl.fromTo(
      chars,
      { autoAlpha: 0, rotationX: -95, z: -160, yPercent: 60, filter: "blur(8px)" },
      {
        autoAlpha: 1,
        rotationX: 0,
        z: 0,
        yPercent: 0,
        filter: "blur(0px)",
        duration: (b - a) * 0.55,
        stagger: { amount: (b - a) * 0.45, from: i === 0 ? "start" : "center" },
        ease: "power3.out",
      },
      a,
    );
  });

  tl.fromTo(r.hud, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.02);

  if (!reduced) {
    // Exit: the headline passes the camera.
    const [e0, e1] = FUTURE.exit;
    tl.to(r.lineEls, { z: 420, autoAlpha: 0, duration: e1 - e0, stagger: 0.03, ease: "power2.in" }, e0);
  }
  return tl;
}
