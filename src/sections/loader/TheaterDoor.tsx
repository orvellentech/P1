"use client";

import { useEffect, useRef, useState } from "react";
import s from "./TheaterDoor.module.css";
import { gsap, ensureGsap } from "@/lib/gsap";
import { experienceStore, useExperience } from "@/lib/store/experienceStore";
import { retryBoot } from "@/lib/loading/boot";
import { startDoorShake, createDoorOpen, type DoorRefs } from "@/animations/door";
import { DustField } from "@/animations/DustField";
import { emit } from "@/lib/events";
import { audio } from "@/lib/audio/AudioEngine";
import { LOADING } from "@/config/animation.config";

const TASK_LABELS: Record<string, string> = {
  api: "Backend connection",
  fonts: "Typography",
  brand: "Company logo",
  textures: "Textures",
  "3d": "3D scenery",
  environment: "Browser capabilities",
};

function DoorLeaf({ side, leafRef, handleRef }: { side: "left" | "right"; leafRef: React.Ref<HTMLDivElement>; handleRef: React.Ref<HTMLDivElement> }) {
  return (
    <div className={`${s.door} ${s[side]}`} ref={leafRef}>
      <div className={s.face}>
        <div className={`${s.panel} ${s.panelTop}`}>
          <div className={s.porthole} />
        </div>
        <div className={`${s.panel} ${s.panelBottom}`} />
        <div className={s.handle} ref={handleRef} />
        <div className={s.kick} />
      </div>
      <div className={s.back} />
      <div className={s.edge} />
    </div>
  );
}

export default function TheaterDoor() {
  const load = useExperience((st) => st.load);
  const loading = useExperience((st) => st.loading);
  const stageReady = useExperience((st) => st.stageReady);
  const reduced = useExperience((st) => st.reducedMotion);
  const skipped = useExperience((st) => st.introSkipped);

  const sceneRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const handleL = useRef<HTMLDivElement>(null);
  const handleR = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const spillRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const doorwayRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  const shakeRef = useRef<ReturnType<typeof startDoorShake> | null>(null);
  const dustField = useRef<DustField | null>(null);
  const mountedAt = useRef(0);
  const openTl = useRef<gsap.core.Timeline | null>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const [retrying, setRetrying] = useState(false);

  const refs = (): DoorRefs => ({
    scene: sceneRef.current!,
    camera: cameraRef.current!,
    left: leftRef.current!,
    right: rightRef.current!,
    handles: [handleL.current!, handleR.current!],
    seam: seamRef.current!,
    spill: spillRef.current!,
    glow: glowRef.current!,
  });

  // Dust + mount time.
  useEffect(() => {
    ensureGsap();
    mountedAt.current = performance.now();
    const field = new DustField(dustRef.current!, { ambient: 0, color: "255, 214, 160" });
    dustField.current = field;
    return () => {
      field.dispose();
      shakeRef.current?.stop();
      shakeRef.current = null;
      // The door can unmount mid-swing (Skip intro): its timeline must not outlive it.
      openTl.current?.kill();
    };
  }, []);

  // Shake while loading; stop and dim on error.
  useEffect(() => {
    if (load === "loading" || load === "idle") {
      if (!shakeRef.current && !reduced) {
        gsap.to(glowRef.current, { opacity: 0.5, duration: 0.6 });
        shakeRef.current = startDoorShake(refs(), (strength) => {
          const doorway = doorwayRef.current;
          if (!doorway) return;
          const r = doorway.getBoundingClientRect();
          dustField.current?.burst(r.left - 10, r.top - 14, r.width + 20, Math.round(26 * strength));
        });
      }
    }
    if (load === "error") {
      shakeRef.current?.stop();
      shakeRef.current = null;
      // The light behind the door stutters and dies.
      gsap.timeline()
        .to(glowRef.current, { opacity: 0.8, duration: 0.06 })
        .to(glowRef.current, { opacity: 0.2, duration: 0.08 })
        .to(glowRef.current, { opacity: 0.55, duration: 0.05 })
        .to(glowRef.current, { opacity: 0.08, duration: 0.6, ease: "power2.out" });
      gsap.to(seamRef.current, { opacity: 0.08, duration: 0.6 });
      setRetrying(false);
      requestAnimationFrame(() => retryRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reduced]);

  // Smoothly animated progress readout (real progress, eased display).
  useEffect(() => {
    const target = load === "success" ? 1 : loading.progress;
    const bar = barRef.current;
    const label = percentRef.current;
    if (!bar || !label) return;
    const proxy = { v: Number(bar.dataset.v ?? 0) };
    // Written straight to the DOM — no React render per frame.
    const tw = gsap.to(proxy, {
      v: target,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        bar.dataset.v = String(proxy.v);
        bar.style.transform = `scaleX(${proxy.v})`;
        label.textContent = `${Math.round(proxy.v * 100)}%`;
      },
    });
    return () => {
      tw.kill();
    };
  }, [loading.progress, load]);

  // Open only after real success + stage mounted + minimum presentation beat.
  useEffect(() => {
    if (load !== "success" || !stageReady || openTl.current) return;
    const elapsed = (performance.now() - mountedAt.current) / 1000;
    const wait = Math.max(0, LOADING.minDoorTime - elapsed);
    const call = gsap.delayedCall(wait, () => {
      if (experienceStore.get().intro !== "door") return; // skipped meanwhile
      shakeRef.current?.stop();
      shakeRef.current = null;
      experienceStore.set({ intro: "opening" });
      audio.play("latch");
      gsap.delayedCall(0.5, () => audio.play("doors"));
      openTl.current = createDoorOpen(refs(), (duration) => emit("door:dolly", { duration }), reduced).eventCallback("onComplete", () => {
        // Only advance from the phase we own — never rewind a skipped intro.
        if (experienceStore.get().intro === "opening") experienceStore.set({ intro: "theater" });
      });
    });
    return () => {
      call.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, stageReady]);

  // Skip intro: jump straight past the door.
  useEffect(() => {
    if (!skipped) return;
    shakeRef.current?.stop();
    openTl.current?.kill();
    if (sceneRef.current) sceneRef.current.style.visibility = "hidden";
  }, [skipped]);

  const onRetry = () => {
    setRetrying(true);
    retryBoot();
  };

  const errors = loading.errors;

  return (
    <div className={s.scene} ref={sceneRef} aria-label="Loading the experience">
      <div className={s.camera} ref={cameraRef}>
        <div className={s.doorway} ref={doorwayRef}>
          <div className={s.glow} ref={glowRef} />
          <DoorLeaf side="left" leafRef={leftRef} handleRef={handleL} />
          <DoorLeaf side="right" leafRef={rightRef} handleRef={handleR} />
          <div className={s.seam} ref={seamRef} />
        </div>
        <div className={s.floor} />
        <div className={s.wallLight} />
        <div className={s.trim} />
        <div className={s.marquee} aria-hidden="true">
          <span className={s.bulbs} />
          NOW SHOWING
        </div>
        <div className={`${s.sconce} ${s.sconceLeft}`} />
        <div className={`${s.sconce} ${s.sconceRight}`} />
        <div className={s.threshold}>
          <div className={s.spill} ref={spillRef} />
        </div>
      </div>

      <canvas className={s.dust} ref={dustRef} aria-hidden="true" />

      {load !== "error" && (
        <div className={s.status} role="status" aria-live="polite">
          <span>
            {load === "success" ? "READY" : loading.stage} · <span ref={percentRef}>0%</span>
          </span>
          <span className={s.bar} aria-hidden="true">
            <span className={s.barFill} ref={barRef} />
          </span>
        </div>
      )}

      {load === "error" && (
        <div className={s.error} role="alert">
          <p className={s.errorTitle}>THE SHOW CANNOT BEGIN</p>
          <p className={s.errorText}>Something went wrong while preparing the theater. Please check your connection and try again.</p>
          {errors.length > 0 && (
            <p className={s.errorDetail}>
              {errors.map((e) => `${TASK_LABELS[e.task] ?? e.task}: ${e.message}`).join(" · ")}
            </p>
          )}
          <button ref={retryRef} className={s.retry} onClick={onRetry} disabled={retrying}>
            {retrying ? "RETRYING…" : "RETRY"}
          </button>
        </div>
      )}
    </div>
  );
}
