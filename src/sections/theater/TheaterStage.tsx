"use client";

import { useEffect, useRef } from "react";
import s from "./TheaterStage.module.css";
import FilmTitle, { type FilmTitleHandles } from "./FilmTitle";
import { Crest, Seats } from "./Ornaments";
import AntiqueHeader from "@/sections/antique/AntiqueHeader";
import { gsap, ensureGsap } from "@/lib/gsap";
import { experienceStore, useExperience, watchExperience } from "@/lib/store/experienceStore";
import { on } from "@/lib/events";
import { CurtainController, FilmController } from "@/animations/theater";
import { createCurtainOpen, createFilmIntro } from "@/animations/intro";
import { createPortal } from "@/animations/portal";
import { DustField } from "@/animations/DustField";
import { audio } from "@/lib/audio/AudioEngine";
import { track } from "@/lib/analytics";
import { CHAPTER_HEIGHT, PORTAL, QUALITY, THEATER } from "@/config/animation.config";
import type { SiteContent } from "@/config/types";

/**
 * Chapters I–III in one sticky stage:
 *  I   the theater interior (door hand-off, lights, curtains)
 *  II  the black-and-white title sequence, then a still hold
 *  III scroll-driven journey through the logo into the parchment world
 */
export default function TheaterStage({ content }: { content: SiteContent }) {
  const webgl = useExperience((st) => st.webgl);
  const reduced = useExperience((st) => st.reducedMotion);
  const intro = useExperience((st) => st.intro);

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const dollyRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const curtainCanvas = useRef<HTMLCanvasElement>(null);
  const fbLeft = useRef<HTMLDivElement>(null);
  const fbRight = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const motesRef = useRef<HTMLCanvasElement>(null);
  const seatsRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const film = useRef<FilmTitleHandles | null>(null);
  const curtains = useRef<CurtainController | null>(null);
  const projector = useRef<FilmController | null>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);

  // --- Renderers: curtains, projector, motes -------------------------------
  useEffect(() => {
    ensureGsap();
    const q = QUALITY[experienceStore.get().quality];
    const c = new CurtainController(
      webgl ? curtainCanvas.current : null,
      q.curtainDpr,
      !webgl ? { left: fbLeft.current!, right: fbRight.current! } : null,
      () => experienceStore.set({ webgl: false }),
    );
    curtains.current = c;
    const f = new FilmController(film.current!.filmCanvas, film.current!.weave, film.current!.filmFallback);
    projector.current = f;

    // Dust only glitters inside the projector beam.
    const beam = beamRef.current!;
    const motes = new DustField(motesRef.current!, {
      ambient: reduced ? 0 : q.motes,
      color: "255, 244, 225",
      lightAt: (x, y, w, h) => {
        const cx = w / 2;
        const spread = 0.04 * w + (y / h) * 0.46 * Math.min(w, h * 1.2);
        const inside = Math.max(0, 1 - Math.abs(x - cx) / spread);
        return inside * Number(getComputedStyleCache(beam));
      },
    });
    let motesOn = false;
    const stopWatch = watchExperience(
      (st) => st.intro,
      (phase) => {
        if (phase === "film" && !motesOn && !reduced) {
          motes.start();
          motesOn = true;
        }
      },
    );
    const onResize = () => {
      c.resize();
      f.resize();
    };
    window.addEventListener("resize", onResize);
    return () => {
      stopWatch();
      window.removeEventListener("resize", onResize);
      c.dispose();
      f.dispose();
      motes.dispose();
    };
    // Renderer set-up happens once; the WebGL fallback path is chosen at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Intro sequence: dolly in → lights → curtains → film → hold -----------
  useEffect(() => {
    const sticky = stickyRef.current!;
    const offDolly = on("door:dolly", ({ duration }) => {
      if (experienceStore.get().introSkipped) return;
      gsap.fromTo(dollyRef.current, { scale: 0.72 }, { scale: 1, duration, ease: "cinema" });
      gsap.to(sticky, { "--house": 1, duration: THEATER.lightsUp + duration * 0.5, ease: "power1.inOut" });
      gsap.to(curtains.current!, { light: 1, duration: THEATER.lightsUp + duration * 0.5, ease: "power1.inOut", onUpdate: () => curtains.current?.wake() });
      audio.setAmbience("theater");
    });

    const stop = watchExperience(
      (st) => st.intro,
      (phase) => {
        if (phase !== "theater" || introTl.current) return;
        const red = experienceStore.get().reducedMotion;
        const tl = gsap.timeline();
        introTl.current = tl;
        tl.addLabel("curtains", red ? 0.2 : THEATER.curtainDelay)
          .call(() => {
            experienceStore.set({ intro: "curtains" });
            audio.play("curtain");
          }, undefined, "curtains")
          .add(createCurtainOpen(curtains.current!, red), "curtains")
          .call(() => {
            experienceStore.set({ intro: "film" });
            audio.setAmbience("projector");
            audio.play("projector-start");
          })
          .add(createFilmIntro({ ...film.current!, beam: beamRef.current! }, projector.current!, sticky, red))
          .call(() => {
            experienceStore.set({ intro: "complete" });
            audio.setAmbience("theater");
            track("intro_complete");
          });
      },
    );
    return () => {
      offDolly();
      stop();
    };
  }, []);

  // --- Skip intro: jump every intro element to its final "hold" frame -------
  useEffect(() => {
    return watchExperience(
      (st) => st.introSkipped,
      (skipped) => {
        if (!skipped) return;
        if (!introTl.current) {
          // Doors never finished: build the intro now and jump to its end.
          experienceStore.set({ intro: "theater" });
        }
        // Stop any in-flight door hand-off tweens before jumping to the final frame.
        gsap.killTweensOf([dollyRef.current, stickyRef.current, curtains.current]);
        gsap.set(dollyRef.current, { scale: 1 });
        gsap.set(stickyRef.current, { "--house": 0.45 });
        curtains.current?.snapTo(1, 1);
        // A timer, not rAF: frames may be paused (background tab) and skip must never stall.
        setTimeout(() => {
          introTl.current?.progress(1);
          projector.current?.stop();
          experienceStore.set({ intro: "complete" });
        }, 0);
        track("intro_skipped");
      },
    );
  }, []);

  // --- Chapter III: portal, created once the hold frame exists --------------
  useEffect(() => {
    if (intro !== "complete") return;
    const f = film.current!;
    const ctx = gsap.context(() => {
      createPortal(
        {
          section: sectionRef.current!,
          world: worldRef.current!,
          screen: screenRef.current!,
          seats: seatsRef.current!,
          logoPortal: f.logoPortal,
          logoImg: f.logoImg,
          titleFade: f.titleFade,
          portal: portalRef.current!,
          portalContent: portalContentRef.current!,
          flash: flashRef.current!,
        },
        projector.current!,
        reduced,
        () => audio.play("whoosh"),
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [intro, reduced]);

  return (
    <section
      id="chapter-theater"
      ref={sectionRef}
      className={s.section}
      style={{ height: `${CHAPTER_HEIGHT.theater}vh` }}
      data-tone="dark"
      aria-label="The theater and the picture"
    >
      <span className={s.marker} style={{ top: 0 }} data-chapter="chapter-theater" />
      <span className={s.marker} style={{ top: "1px" }} data-chapter="chapter-film" />
      <span className={s.marker} style={{ top: `${PORTAL.approachEnd * 100 * (1 - 100 / CHAPTER_HEIGHT.theater)}%` }} data-chapter="chapter-portal" />

      <div className={s.sticky} ref={stickyRef}>
        <div className={s.dolly} ref={dollyRef}>
          <div className={s.world} ref={worldRef}>
            <div className={s.backWall} />
            <div className={s.proscenium}>
              <div className={s.frame} />
              <Crest className={s.crest} />
              <div className={s.stageBox}>
                <div className={s.screen} ref={screenRef}>
                  <FilmTitle content={content} webgl={webgl} onReady={(h) => (film.current = h)} />
                </div>
                {webgl ? (
                  <canvas className={s.curtains} ref={curtainCanvas} aria-hidden="true" />
                ) : (
                  <>
                    <div className={`${s.fallbackCurtain} ${s.fallbackLeft}`} ref={fbLeft} />
                    <div className={`${s.fallbackCurtain} ${s.fallbackRight}`} ref={fbRight} />
                    <div className={s.fallbackValance} />
                  </>
                )}
              </div>
            </div>
            <div className={s.apron} />
            <div className={s.footlights} />
            <div className={s.beam} ref={beamRef} />
            <div className={s.fog} />
            <canvas className={s.motes} ref={motesRef} aria-hidden="true" />
            <div className={s.seats} ref={seatsRef}>
              <Seats />
            </div>
          </div>
        </div>

        <div className={`${s.portal} parchment-bg`} ref={portalRef} style={{ ["--logo-mask" as string]: `url("${content.logo.src}")` }}>
          <div className={s.portalContent} ref={portalContentRef}>
            <AntiqueHeader content={content} />
          </div>
        </div>
        <div className={s.flash} ref={flashRef} />
      </div>
    </section>
  );
}

/** Beam opacity changes rarely; read it at most every 250ms instead of per mote. */
let beamCache = { t: 0, v: "0" };
function getComputedStyleCache(el: HTMLElement) {
  const now = performance.now();
  if (now - beamCache.t > 250) beamCache = { t: now, v: getComputedStyle(el).opacity };
  return beamCache.v;
}
