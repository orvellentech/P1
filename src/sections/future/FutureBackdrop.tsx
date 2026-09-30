"use client";

import { useEffect, useRef } from "react";
import s from "./Future.module.css";
import { gsap, ScrollTrigger, ensureGsap } from "@/lib/gsap";
import { experienceStore, useExperience, watchExperience } from "@/lib/store/experienceStore";
import { loadCubeWorld } from "@/lib/gl/modules";
import { scrollEngine } from "@/lib/scroll/scrollEngine";
import { on } from "@/lib/events";
import type { CubeWorld } from "@/animations/gl/CubeWorld";

const CSS_CUBES = [
  { x: 8, y: 18, s: 70, c: "#8b6cff", d: 26 },
  { x: 80, y: 14, s: 46, c: "#3fd8f2", d: 32 },
  { x: 14, y: 72, s: 54, c: "#ff6b8e", d: 22 },
  { x: 86, y: 66, s: 84, c: "#ffc86b", d: 36 },
  { x: 60, y: 84, s: 34, c: "#eef0ff", d: 20 },
  { x: 30, y: 8, s: 28, c: "#6c8cff", d: 18 },
];

/**
 * The persistent 2060 environment behind chapters VIII–IX. Hidden (and not
 * rendering) until the snap; fades out again if the viewer scrolls back.
 */
export default function FutureBackdrop() {
  const webgl = useExperience((st) => st.webgl);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    ensureGsap();
    const root = rootRef.current!;
    let world: CubeWorld | null = null;
    let disposed = false;
    let pendingOrigin: { x: number; y: number } | undefined;

    if (webgl && canvasRef.current) {
      loadCubeWorld()
        .then(({ CubeWorld }) => {
          if (disposed) return;
          const st = experienceStore.get();
          world = new CubeWorld(canvasRef.current!, st.quality, st.reducedMotion);
          if (st.era === "future") {
            world.spawn(pendingOrigin);
            world.setActive(true);
          }
        })
        .catch((err) => {
          console.warn("[future] 3D world unavailable, using CSS cubes", err);
          experienceStore.set({ webgl: false });
        });
    }

    const show = (visible: boolean) => {
      gsap.to(root, {
        autoAlpha: visible ? 1 : 0,
        duration: visible ? 0.5 : 0.6,
        ease: "power2.out",
        onComplete: () => {
          if (!visible) world?.setActive(false);
        },
      });
      if (visible) world?.setActive(true);
    };

    const offImpact = on("snap:impact", ({ x, y }) => {
      pendingOrigin = { x: (x / window.innerWidth) * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 };
      world?.spawn(pendingOrigin);
    });
    const stopEra = watchExperience(
      (st) => st.era,
      (era) => show(era === "future"),
    );

    // Camera travel follows scroll from the snap to the end of the page.
    const trigger = ScrollTrigger.create({
      trigger: "#chapter-future",
      start: "top bottom",
      endTrigger: "#chapter-contact",
      end: "bottom bottom",
      onUpdate: (self) => world?.setScroll(self.progress),
    });
    const offVel = scrollEngine.onVelocity((v) => world?.setVelocity(v));

    return () => {
      disposed = true;
      offImpact();
      stopEra();
      offVel();
      trigger.kill();
      world?.dispose();
    };
  }, [webgl]);

  return (
    <div className={s.backdrop} ref={rootRef} aria-hidden="true">
      {webgl ? (
        <canvas className={s.canvas} ref={canvasRef} />
      ) : (
        <div className={s.cssCubes}>
          {CSS_CUBES.map((c, i) => (
            <div
              key={i}
              className={s.cssCube}
              style={{ left: `${c.x}%`, top: `${c.y}%`, ["--s" as string]: `${c.s}px`, ["--c" as string]: c.c, ["--d" as string]: `${c.d}s` }}
            >
              {Array.from({ length: 6 }, (_, j) => (
                <span key={j} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className={s.aurora} />
      <div className={s.grid} />
    </div>
  );
}
