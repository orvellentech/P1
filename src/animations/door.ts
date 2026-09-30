import { gsap } from "@/lib/gsap";
import { DOOR } from "@/config/animation.config";

export interface DoorRefs {
  scene: HTMLElement;
  camera: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
  handles: HTMLElement[];
  seam: HTMLElement;
  spill: HTMLElement;
  glow: HTMLElement;
}

/** Smooth value-noise in [-1, 1] for organic rattling (no random jumps). */
function noise1D(seed: number) {
  const r = (i: number) => {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  return (t: number) => {
    const i = Math.floor(t);
    const f = t - i;
    const s = f * f * (3 - 2 * f);
    return r(i) * (1 - s) + r(i + 1) * s;
  };
}

/**
 * "Something is loading behind the door."
 * Two layers: a continuous low-amplitude rattle (noise-driven) and
 * occasional thumps from inside that push the doors ajar a crack,
 * flare the light through the seam, and shake dust from the lintel.
 */
export function startDoorShake(refs: DoorRefs, onThump: (strength: number) => void) {
  const nl = noise1D(1.3);
  const nr = noise1D(7.9);
  const thump = { l: 0, r: 0, light: 0 };
  let running = true;
  let delayed: gsap.core.Tween | null = null;

  const setL = gsap.quickSetter(refs.left, "css");
  const setR = gsap.quickSetter(refs.right, "css");

  const tick = () => {
    const t = gsap.ticker.time * DOOR.idle.frequency;
    // Doors swing outward (toward the viewer): left = negative Y rotation, right = positive.
    setL({ rotationY: nl(t) * DOOR.idle.rotation - thump.l, x: nl(t + 40) * DOOR.idle.x });
    setR({ rotationY: nr(t) * DOOR.idle.rotation + thump.r, x: nr(t + 40) * DOOR.idle.x });
    refs.seam.style.opacity = String(0.55 + 0.15 * nl(t * 0.7) + thump.light);
    refs.glow.style.opacity = String(0.5 + thump.light * 0.8);
  };
  gsap.ticker.add(tick);

  const scheduleThump = () => {
    if (!running) return;
    const gap = gsap.utils.random(DOOR.thump.minGap, DOOR.thump.maxGap);
    delayed = gsap.delayedCall(gap, () => {
      if (!running) return;
      const strong = Math.random() < DOOR.thump.strongChance;
      const crack = strong ? DOOR.thump.strongCrack : DOOR.thump.crack;
      const tl = gsap.timeline({ onComplete: scheduleThump });
      // Push outward fast, then settle back with a short damped wobble.
      tl.to(thump, { l: crack, r: crack * 0.8, light: strong ? 0.45 : 0.25, duration: 0.07, ease: "power2.out" })
        .to(thump, { l: -crack * 0.25, r: -crack * 0.2, light: 0.05, duration: 0.18, ease: "power2.inOut" })
        .to(thump, { l: 0, r: 0, light: 0, duration: 0.5, ease: "power3.out" });
      gsap.fromTo(refs.camera, { y: 0 }, { y: strong ? 2.5 : 1.2, duration: 0.05, yoyo: true, repeat: 3, ease: "sine.inOut", clearProps: "y" });
      onThump(strong ? 1 : 0.5);
    });
  };
  scheduleThump();

  return {
    /** Stops the rattle and eases the doors back to rest. */
    stop() {
      running = false;
      delayed?.kill();
      gsap.ticker.remove(tick);
      gsap.killTweensOf(thump);
      return gsap.to([refs.left, refs.right], { rotationY: 0, x: 0, duration: DOOR.open.settle, ease: "power2.out" });
    },
  };
}

/**
 * The reveal: stillness, handles, the heavy swing, then the camera walks
 * through the doorway. `onDolly` hands off to the theater interior so both
 * layers move together at different depths (parallax).
 */
export function createDoorOpen(refs: DoorRefs, onDolly: (duration: number) => void, reduced: boolean) {
  const o = DOOR.open;
  const tl = gsap.timeline();

  if (reduced) {
    tl.call(() => onDolly(0.8))
      .to(refs.scene, { autoAlpha: 0, duration: 0.8, ease: "power1.inOut" });
    return tl;
  }

  tl.addLabel("pause", o.settle + o.pause)
    // Handles depress — the latch gives.
    .to(refs.handles, { x: (i) => (i === 0 ? -3 : 3), scaleX: 0.92, duration: o.handle, ease: "power2.in" }, "pause")
    .to(refs.handles, { x: 0, scaleX: 1, duration: 0.25, ease: "power2.out" }, `pause+=${o.handle}`)
    .addLabel("swing", `pause+=${o.handle + 0.1}`)
    .to(refs.left, { rotationY: -o.angle, duration: o.swing, ease: "hinge" }, "swing")
    .to(refs.right, { rotationY: o.angle, duration: o.swing, ease: "hinge" }, `swing+=${o.rightDelay}`)
    // Light floods out, then gives way to the dim interior.
    .to(refs.glow, { opacity: 1, duration: 0.5, ease: "power2.out" }, "swing")
    .to(refs.seam, { opacity: 0, duration: 0.3 }, "swing")
    .to(refs.spill, { opacity: 1, scaleX: 2.4, duration: 1.2, ease: "power2.out" }, "swing")
    .to(refs.glow, { opacity: 0, duration: 1.4, ease: "power2.inOut" }, `swing+=${o.dollyAt}`)
    .call(() => onDolly(o.dolly), undefined, `swing+=${o.dollyAt}`)
    // The camera walks through: the door plane is near, so it scales far faster than the room.
    .to(refs.camera, { scale: o.dollyScale, duration: o.dolly, ease: "cinema" }, `swing+=${o.dollyAt}`)
    .to(refs.camera, { filter: "blur(6px)", duration: o.dolly * 0.5, ease: "power2.in" }, `swing+=${o.dollyAt + o.dolly * 0.4}`)
    .to(refs.scene, { autoAlpha: 0, duration: o.dolly * 0.35, ease: "power1.in" }, `swing+=${o.dollyAt + o.dolly * 0.62}`);

  return tl;
}
