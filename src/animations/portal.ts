import { gsap } from "@/lib/gsap";
import { PORTAL, SCROLL } from "@/config/animation.config";
import type { FilmController } from "./theater";

export interface PortalRefs {
  section: HTMLElement;
  world: HTMLElement;
  screen: HTMLElement;
  seats: HTMLElement;
  logoPortal: HTMLElement;
  logoImg: HTMLElement;
  titleFade: HTMLElement[];
  portal: HTMLElement;
  portalContent: HTMLElement;
  flash: HTMLElement;
}

/**
 * Chapter III — through the logo.
 *
 * Three depth planes move at different rates: seats (nearest) rush past,
 * the theater architecture dollies until the screen fills the frame, and
 * the logo scales exponentially so the approach reads as constant-speed
 * travel. The next world is visible *through the logo's own shape* (a CSS
 * mask synced to the logo's on-screen rect); an iris then guarantees full
 * coverage whatever the logo's silhouette.
 */
export function createPortal(r: PortalRefs, film: FilmController, reduced: boolean, onCross: () => void) {
  const m = { cx: 0, cy: 0, dx: 0, dy: 0, fill: 3 };

  // Measure the screen at rest: zoom origin, the offset that centres it in the
  // viewport (the camera "aims" at it), and the scale at which it fills the frame.
  const measure = () => {
    const prev = r.world.style.transform;
    r.world.style.transform = "none";
    const sr = r.screen.getBoundingClientRect();
    const wr = r.world.getBoundingClientRect();
    r.world.style.transform = prev;
    m.cx = sr.left + sr.width / 2 - wr.left;
    m.cy = sr.top + sr.height / 2 - wr.top;
    m.dx = wr.width / 2 - m.cx;
    m.dy = wr.height / 2 - m.cy;
    m.fill = Math.max(wr.width / sr.width, wr.height / sr.height) * 1.06;
    r.world.style.transformOrigin = `${m.cx}px ${m.cy}px`;
  };
  measure();

  const state = { iris: 0 };
  const updateMask = () => {
    const lr = r.logoImg.getBoundingClientRect();
    const st = r.portal.style;
    // When the iris already covers the screen, drop the (now enormous) logo mask layer
    // so the browser never rasterises a mask many times the viewport size.
    const huge = lr.height > window.innerHeight * 2.5 && state.iris > 70;
    // Same moment: stop painting the giant logo layer itself.
    r.logoPortal.style.visibility = huge ? "hidden" : "";
    st.setProperty("--mx", `${lr.left}px`);
    st.setProperty("--my", `${lr.top}px`);
    st.setProperty("--mw", huge ? "0px" : `${lr.width}px`);
    st.setProperty("--mh", huge ? "0px" : `${lr.height}px`);
    st.setProperty("--cx", `${lr.left + lr.width / 2}px`);
    st.setProperty("--cy", `${lr.top + lr.height / 2}px`);
    st.setProperty("--iris", `${state.iris}vmax`);
  };

  let crossed = false;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: updateMask,
    scrollTrigger: {
      trigger: r.section,
      start: "top top",
      end: "bottom bottom",
      scrub: reduced ? true : SCROLL.scrub,
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        // The projector runs while we travel; the frame freezes again at rest.
        const moving = self.progress > 0.002 && self.progress < PORTAL.irisEnd;
        if (moving && !film.isRunning && !reduced) film.start();
        if (!moving && film.isRunning) film.stop();
        if (!crossed && self.progress > PORTAL.revealStart) {
          crossed = true;
          onCross();
        }
        if (self.progress < PORTAL.revealStart * 0.5) crossed = false;
      },
    },
  });

  if (reduced) {
    // Simplified: a calm crossfade into the parchment world.
    tl.fromTo(r.titleFade, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25 }, 0)
      .set(state, { iris: 200 }, 0.25)
      .fromTo(r.portal, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.25)
      .set(r.world, { autoAlpha: 0 }, 0.62)
      .to({}, { duration: 0.38 }, 0.62);
    return tl;
  }

  const A = PORTAL.approachEnd;
  const through = PORTAL.irisEnd - A;

  // Explicit from-values everywhere: scrubbing back to 0 must restore the held title card exactly.
  // 1 — Camera approach: the screen grows to fill the frame; the seats rush past below.
  tl.fromTo(r.world, { scale: 1, x: 0, y: 0 }, { scale: () => m.fill, x: () => m.dx, y: () => m.dy, duration: A, ease: "power2.in" }, 0)
    .fromTo(r.seats, { yPercent: 0, scale: 1 }, { yPercent: 70, scale: 1.25, duration: A * 0.8, ease: "power2.in" }, 0)
    .fromTo(r.titleFade, { autoAlpha: 1, filter: "blur(0px)" }, { autoAlpha: 0, filter: "blur(6px)", duration: A * 0.7, ease: "power1.in" }, A * 0.15)
    .fromTo(r.logoPortal, { scale: 1 }, { scale: PORTAL.logoScaleApproach, duration: A, ease: "power1.in" }, 0)
    .fromTo(film, { intensity: film.intensity, weaveAmp: film.weaveAmp }, { intensity: 1, weaveAmp: 1.4, duration: A }, 0)

    // 2 — Through the logo.
    .to(r.logoPortal, { scale: PORTAL.logoScaleMax, duration: through, ease: "expo.in" }, A)
    .fromTo(r.portal, { opacity: 0 }, { opacity: 1, duration: PORTAL.revealEnd - PORTAL.revealStart, ease: "power1.out" }, PORTAL.revealStart)
    // Only the headline block is filtered (small area), never the enormous logo layer.
    .fromTo(
      r.portalContent,
      { scale: 1.35, filter: "blur(8px)" },
      { scale: 1, filter: "blur(0px)", duration: PORTAL.settleEnd - PORTAL.revealStart, ease: "power2.out" },
      PORTAL.revealStart,
    )
    .to(state, { iris: 180, duration: PORTAL.irisEnd - PORTAL.irisStart, ease: "power2.in" }, PORTAL.irisStart)
    // A breath of projector light as we pass through the lens.
    .fromTo(r.flash, { opacity: 0 }, { opacity: 0.8, duration: 0.06, ease: "power2.in" }, PORTAL.irisEnd - 0.08)
    .to(r.flash, { opacity: 0, duration: 0.12, ease: "power2.out" }, PORTAL.irisEnd - 0.02)
    // Once the iris covers the viewport the theater is invisible — stop painting it.
    .set(r.world, { autoAlpha: 0 }, PORTAL.irisEnd - 0.06)
    .to({}, { duration: 1 - PORTAL.settleEnd }, PORTAL.settleEnd);

  return tl;
}
