import { gsap } from "@/lib/gsap";
import { MAGIC, SCROLL } from "@/config/animation.config";
import { ShaderCanvas } from "@/lib/gl/ShaderCanvas";
import { burstFrag } from "./shaders/burst.frag";

/** Joint angles (degrees) keyed by the Hand's data-joint names. */
export type Pose = Record<string, number>;

export const POSE_READY: Pose = { "thumb-1": -10, "thumb-2": 30, "index-1": -8, "index-2": 6, "middle-1": -35, "middle-2": -90, "ring-1": 6, "pinky-1": 14 };
/** Tension: the middle finger presses down on the thumb, thumb pushes back. */
export const POSE_TENSE: Pose = { ...POSE_READY, "thumb-1": -8, "thumb-2": 24, "middle-1": -38, "middle-2": -96 };
/** Released: middle finger slams down into the palm, thumb flicks out, index lifts. */
export const POSE_SNAPPED: Pose = { "thumb-1": -2, "thumb-2": 42, "index-1": -4, "index-2": 2, "middle-1": -18, "middle-2": -152, "ring-1": 10, "pinky-1": 18 };

/** Writes joint rotations straight to SVG transform attributes (deterministic, no transform parsing). */
export class HandRig {
  readonly angles: Pose = { ...POSE_READY };
  private joints = new Map<string, SVGGElement>();

  constructor(svg: SVGSVGElement) {
    svg.querySelectorAll<SVGGElement>("[data-joint]").forEach((g) => this.joints.set(g.dataset.joint!, g));
    this.apply();
  }

  apply = () => {
    for (const [name, g] of this.joints) g.setAttribute("transform", `rotate(${(this.angles[name] ?? 0).toFixed(2)})`);
  };

  pose(target: Pose, vars: gsap.TweenVars) {
    return gsap.to(this.angles, { ...target, ...vars, onUpdate: this.apply });
  }
}

export interface MagicRefs {
  section: HTMLElement;
  paper: HTMLElement;
  boringChars: HTMLElement[];
  question: HTMLElement;
  magicChars: HTMLElement[];
  statement: HTMLElement;
  /** Outer wrappers of every letter — scattered by the snap (inner spans belong to the scroll build-up). */
  blast: HTMLElement[];
  /** Scroll-driven rise. */
  handWrap: HTMLElement;
  /** Time-driven snap recoil and exit (nested inside handWrap). */
  handSnap: HTMLElement;
  svg: SVGSVGElement;
  smear: SVGPathElement;
  hint: HTMLElement;
}

export interface SnapShared {
  /** Radius (px) of the hole in the paper — also the shockwave ring radius. */
  hole: number;
  origin: { x: number; y: number };
}

/** Scroll-scrubbed build-up: the statement, the pause, the hand rising. */
export function createMagicBuildUp(r: MagicRefs, reduced: boolean) {
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: r.section, start: "top top", end: "bottom bottom", scrub: reduced ? true : SCROLL.scrub, invalidateOnRefresh: true },
  });
  tl.to({}, { duration: 1 }, 0);
  const [b0, b1] = MAGIC.boring;
  const [l0, l1] = MAGIC.letsDo;
  const [a0, a1] = MAGIC.anticipate;
  const [h0, h1] = MAGIC.handRise;

  if (reduced) {
    tl.fromTo([...r.boringChars, r.question], { autoAlpha: 0 }, { autoAlpha: 1, duration: b1 - b0 }, b0)
      .fromTo(r.magicChars, { autoAlpha: 0 }, { autoAlpha: 1, duration: l1 - l0 }, l0)
      .fromTo(r.handWrap, { autoAlpha: 0, yPercent: 0 }, { autoAlpha: 1, duration: h1 - h0 }, h0)
      .set(r.hint, { autoAlpha: 0 }, 0);
    return tl;
  }

  tl.fromTo(r.boringChars, { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, stagger: 0.012, duration: (b1 - b0) * 0.7, ease: "power3.out" }, b0)
    // The question mark lands late, tipping in — the beat of doubt.
    .fromTo(r.question, { yPercent: -140, rotate: -35, autoAlpha: 0 }, { yPercent: 0, rotate: 12, autoAlpha: 1, duration: (b1 - b0) * 0.45, ease: "back.out(2.2)" }, b0 + (b1 - b0) * 0.55)
    .fromTo(r.magicChars, { yPercent: 105, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.008, duration: (l1 - l0) * 0.8, ease: "power3.out" }, l0)
    // Anticipation: the room holds its breath — the statement rises and tightens.
    .to(r.statement, { y: () => -window.innerHeight * 0.2, scale: 0.86, duration: a1 - a0, ease: "power2.inOut" }, a0)
    .fromTo(r.handWrap, { yPercent: 105, rotate: 8 }, { yPercent: 0, rotate: 0, duration: (h1 - h0) * 0.8, ease: "power3.out" }, h0)
    .fromTo(r.hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, h1 - 0.04)
    .to(r.hint, { autoAlpha: 0, duration: 0.03 }, MAGIC.snapAt - 0.02);
  return tl;
}

/**
 * The snap itself is time-based (a snap cannot be "scrubbed" — it is an
 * instant), fired when scroll progress crosses MAGIC.snapAt and reversed
 * if the viewer scrolls back.
 */
export function createSnap(r: MagicRefs, rig: HandRig, shared: SnapShared, reduced: boolean, onImpact: () => void) {
  const tl = gsap.timeline({ paused: true });
  const impact = MAGIC.snapImpact;
  const diag = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.1;

  if (reduced) {
    tl.call(() => { if (!tl.reversed()) onImpact(); }, undefined, 0)
      .fromTo(shared, { hole: 0 }, { hole: diag, duration: 0.6, ease: "power1.inOut", onUpdate: () => r.paper.style.setProperty("--hole", `${shared.hole}px`) }, 0)
      .to([...r.blast, r.handSnap], { autoAlpha: 0, duration: 0.4 }, 0);
    return tl;
  }

  tl.add(rig.pose(POSE_TENSE, { duration: impact - 0.06, ease: "power2.in" }), 0)
    .to(r.handSnap, { scale: 0.985, duration: impact - 0.06, ease: "power2.in" }, 0)
    // Release: faster than the eye — two frames of smear sell the speed.
    .add(rig.pose(POSE_SNAPPED, { duration: 0.07, ease: "snap" }), impact - 0.06)
    .fromTo(r.smear, { opacity: 0 }, { opacity: 0.9, duration: 0.02, immediateRender: false }, impact - 0.05)
    .to(r.smear, { opacity: 0, duration: 0.05 }, impact + 0.02)
    .call(() => { if (!tl.reversed()) onImpact(); }, undefined, impact)
    // Recoil.
    .to(r.handSnap, { scale: 1, y: -14, rotate: -3, duration: 0.12, ease: "power2.out" }, impact)
    .to(r.handSnap, { y: 0, rotate: 0, duration: 0.6, ease: "power3.out" }, impact + 0.12)
    // The world tears open from the fingertips.
    .fromTo(shared, { hole: 0 }, { hole: diag, duration: 1.4, ease: "power2.out", onUpdate: () => r.paper.style.setProperty("--hole", `${shared.hole}px`) }, impact)
    // Letters are blown outward by the wave.
    .to(r.blast, {
      x: (_i, el: HTMLElement) => {
        const b = el.getBoundingClientRect();
        return (b.left + b.width / 2 - shared.origin.x) * 0.6;
      },
      y: (_i, el: HTMLElement) => {
        const b = el.getBoundingClientRect();
        return (b.top + b.height / 2 - shared.origin.y) * 0.6 - 60;
      },
      rotate: () => gsap.utils.random(-40, 40),
      autoAlpha: 0,
      filter: "blur(10px)",
      duration: 0.9,
      ease: "power3.out",
      stagger: { amount: 0.15, from: "random" },
    }, impact)
    // The glove catches the new light, holds, then withdraws.
    .to(r.svg, { filter: "drop-shadow(0 0 18px rgba(139, 108, 255, 0.8)) drop-shadow(0 0 40px rgba(63, 216, 242, 0.45))", duration: 0.4 }, impact)
    .to(r.handSnap, { yPercent: 110, duration: 1.1, ease: "power2.in" }, impact + 0.9);

  return tl;
}

/** Full-screen light burst renderer, alive only for the duration of the burst. */
export class SnapBurst {
  private shader: ShaderCanvas | null = null;
  private t0 = 0;

  constructor(canvas: HTMLCanvasElement, dpr: number) {
    try {
      this.shader = new ShaderCanvas(canvas, burstFrag, { dpr, uniforms: { uOrigin: [0, 0], uT: 0, uRing: 0, uAmount: 0 } });
    } catch {
      this.shader = null;
    }
  }

  fire(shared: SnapShared, canvas: HTMLCanvasElement) {
    if (!this.shader) return;
    const s = this.shader;
    const dpr = s.width / (canvas.clientWidth || 1);
    this.t0 = performance.now();
    canvas.style.opacity = "1";
    s.start(() => {
      const t = (performance.now() - this.t0) / 1000;
      s.set("uOrigin", [shared.origin.x * dpr, shared.origin.y * dpr]);
      s.set("uT", t);
      s.set("uRing", shared.hole * dpr);
      s.set("uAmount", Math.max(0, 1 - Math.max(0, t - MAGIC.burstDuration * 0.6) / (MAGIC.burstDuration * 0.4)));
      if (t > MAGIC.burstDuration) {
        s.stop();
        s.set("uAmount", 0);
        s.render();
        canvas.style.opacity = "0";
      }
    }, 60);
  }

  cancel(canvas: HTMLCanvasElement) {
    this.shader?.stop();
    canvas.style.opacity = "0";
  }

  dispose() {
    this.shader?.dispose();
  }
}
