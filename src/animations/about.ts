import { gsap, SplitText } from "@/lib/gsap";
import { SCROLL } from "@/config/animation.config";

/**
 * Editorial line reveals: each line rises out of its own mask, scrubbed
 * to the reading position. Re-splits automatically on resize/font changes.
 */
export function createMaskedLines(el: HTMLElement, reduced: boolean) {
  if (reduced) {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6, scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" } });
    return;
  }
  SplitText.create(el, {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 105,
        rotate: 1.5,
        transformOrigin: "0% 100%",
        ease: "editorial",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 62%", scrub: SCROLL.scrub },
      });
    },
  });
}

export interface FounderCardRefs {
  card: HTMLElement;
  imageWrap: HTMLElement;
  image: HTMLElement;
  index: HTMLElement;
  name: HTMLElement;
  meta: HTMLElement[];
}

/**
 * Founder card choreography: the portrait is unveiled by a rising clip
 * while the image inside counter-scales (a lens settling), the name is
 * set letter by letter from a mask, and the outline numeral drifts on its
 * own depth plane. Works with vertical scroll or inside the horizontal
 * gallery (`containerAnimation`).
 */
export function createFounderCard(r: FounderCardRefs, reduced: boolean, containerAnimation?: gsap.core.Animation) {
  const horizontal = !!containerAnimation;
  const st = (start: string, end: string): ScrollTrigger.Vars => ({
    trigger: r.card,
    start,
    end,
    scrub: SCROLL.scrub,
    containerAnimation,
  });

  if (reduced) {
    gsap.fromTo(r.card, { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: st(horizontal ? "left 90%" : "top 85%", horizontal ? "left 60%" : "top 55%") });
    return;
  }

  const chars = SplitText.create(r.name, { type: "chars", mask: "chars" }).chars;
  // Horizontal ranges all finish by "left 45%": the last card never travels further left than that.
  const enter = horizontal ? "left 100%" : "top 90%";
  const settle = horizontal ? "left 50%" : "top 35%";

  gsap.fromTo(r.imageWrap, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out", scrollTrigger: st(enter, settle) });
  gsap.fromTo(r.image, { scale: 1.35, yPercent: -6 }, { scale: 1, yPercent: 0, ease: "power2.out", scrollTrigger: st(enter, settle) });
  gsap.fromTo(chars, { yPercent: 110 }, { yPercent: 0, stagger: 0.04, ease: "editorial", scrollTrigger: st(horizontal ? "left 85%" : "top 80%", horizontal ? "left 48%" : "top 45%") });
  gsap.fromTo(r.meta, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.12, ease: "power1.out", scrollTrigger: st(horizontal ? "left 80%" : "top 75%", horizontal ? "left 45%" : "top 40%") });
  // The numeral lives on a deeper plane: it travels further than the card.
  gsap.fromTo(
    r.index,
    horizontal ? { xPercent: 60 } : { yPercent: 40 },
    { ...(horizontal ? { xPercent: -60 } : { yPercent: -40 }), ease: "none", scrollTrigger: st(horizontal ? "left right" : "top bottom", horizontal ? "right left" : "bottom top") },
  );
}

/** Subtle pointer tilt, interpolated (never tied to precise pointer deltas). */
export function attachTilt(card: HTMLElement, inner: HTMLElement) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const rx = gsap.quickTo(inner, "rotationX", { duration: 0.8, ease: "power3.out" });
  const ry = gsap.quickTo(inner, "rotationY", { duration: 0.8, ease: "power3.out" });
  gsap.set(inner, { transformPerspective: 1000 });
  const move = (e: PointerEvent) => {
    const b = card.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    ry(x * 6);
    rx(-y * 5);
  };
  const leave = () => {
    rx(0);
    ry(0);
  };
  card.addEventListener("pointermove", move);
  card.addEventListener("pointerleave", leave);
  return () => {
    card.removeEventListener("pointermove", move);
    card.removeEventListener("pointerleave", leave);
  };
}
