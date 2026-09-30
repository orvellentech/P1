"use client";

import { useEffect, useRef } from "react";
import s from "./Decree.module.css";
import { gsap, ensureGsap } from "@/lib/gsap";
import { useExperience, experienceStore } from "@/lib/store/experienceStore";
import { drawDecree } from "@/lib/textures/decreeTexture";
import { bootAssets } from "@/lib/loading/boot";
import { loadDecreeRoll } from "@/lib/gl/modules";
import { createDecree } from "@/animations/decree";
import { CHAPTER_HEIGHT, DECREE, QUALITY } from "@/config/animation.config";
import type { DecreeRoll } from "@/animations/gl/DecreeRoll";
import type { SiteContent } from "@/config/types";

function Chars({ text, className }: { text: string; className: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} className={className} data-char="">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

/**
 * Chapter V (King's Order) flowing into Phase 8 (past → present).
 * Ends on the modern "About" heading that opens chapter VI.
 */
export default function DecreeTransformation({ content }: { content: SiteContent }) {
  const webgl = useExperience((st) => st.webgl);
  const reduced = useExperience((st) => st.reducedMotion);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const parchmentRef = useRef<HTMLDivElement>(null);
  const warmthRef = useRef<HTMLDivElement>(null);
  const antiqueRef = useRef<HTMLSpanElement>(null);
  const modernRef = useRef<HTMLSpanElement>(null);
  const ornateRef = useRef<HTMLSpanElement>(null);
  const hairlineRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<HTMLSpanElement>(null);
  const presentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ensureGsap();
    let disposed = false;
    let roll: DecreeRoll | null = null;
    let ctx: gsap.Context | null = null;
    const q = QUALITY[experienceStore.get().quality];
    const texWidth = q.dpr >= 1.7 ? 1600 : 1100;
    const texture = drawDecree(content, bootAssets.logo, texWidth);

    const build = async () => {
      if (webgl && canvasRef.current) {
        try {
          const { DecreeRoll } = await loadDecreeRoll();
          if (disposed) return;
          roll = new DecreeRoll(canvasRef.current, texture, q.dpr);
        } catch (err) {
          console.warn("[decree] WebGL roll unavailable, using CSS fallback", err);
          roll = null;
        }
      }
      if (!roll && fallbackRef.current) {
        fallbackRef.current.replaceChildren(texture);
        texture.setAttribute("aria-hidden", "true");
      }
      if (disposed) return;
      ctx = gsap.context(() => {
        createDecree(
          {
            section: sectionRef.current!,
            roll,
            fallbackSheet: roll ? null : fallbackRef.current,
            parchment: parchmentRef.current!,
            warmth: warmthRef.current!,
            antiqueChars: Array.from(antiqueRef.current!.querySelectorAll<HTMLElement>("[data-char]")),
            modernChars: Array.from(modernRef.current!.querySelectorAll<HTMLElement>("[data-char]")),
            ornate: ornateRef.current!,
            hairline: hairlineRef.current!,
            labelPast: pastRef.current!,
            labelPresent: presentRef.current!,
          },
          reduced,
        );
      }, sectionRef);
      roll?.render();
    };
    build();

    return () => {
      disposed = true;
      ctx?.revert();
      roll?.dispose();
    };
  }, [content, webgl, reduced]);

  const heading = content.about.heading;
  const founderNames = content.founders.map((f) => f.name).join(", ");

  return (
    <section
      id="chapter-decree"
      ref={sectionRef}
      className={s.section}
      style={{ height: `${CHAPTER_HEIGHT.decree}vh` }}
      data-tone="sepia"
      aria-labelledby="about-title"
    >
      <span data-chapter="chapter-decree" style={{ position: "absolute", top: `${DECREE.curl[0] * 100 * (1 - 100 / CHAPTER_HEIGHT.decree)}%` }} />
      <div className={s.sticky}>
        <div className={`${s.parchment} parchment-bg`} ref={parchmentRef} />
        <div className={s.warmth} ref={warmthRef} />
        {webgl && <canvas className={s.gl} ref={canvasRef} aria-hidden="true" />}
        <div className={s.fallback} ref={fallbackRef} hidden={webgl} />

        {/* The decree's words, for assistive technology. */}
        <div className="sr-only">
          <p>By royal decree. {content.companyName}.</p>
          <p>{content.mission}</p>
          <p>{content.vision}</p>
          <p>Sealed by the founders: {founderNames}.</p>
        </div>

        <div className={s.morph}>
          <div className={s.titleWrap}>
            <span className={s.ornate} ref={ornateRef} aria-hidden="true" />
            <div className={s.labels} aria-hidden="true">
              <span className={s.labelPast} ref={pastRef}>
                The Past
              </span>
              <span className={s.labelPresent} ref={presentRef}>
                The Present
              </span>
            </div>
            <h2 className={s.title} id="about-title" aria-label={heading}>
              <span className={`${s.layer} ${s.antique}`} ref={antiqueRef} aria-hidden="true">
                <Chars text={heading} className={s.char} />
              </span>
              <span className={`${s.layer} ${s.modern}`} ref={modernRef} aria-hidden="true">
                <Chars text={heading} className={s.char} />
              </span>
            </h2>
            <div className={s.hairline} ref={hairlineRef} aria-hidden="true" />
          </div>
        </div>
      </div>
      {/* Chapter VI begins when the heading has fully modernised (end of the sticky run). */}
      <span data-chapter="chapter-about" style={{ position: "absolute", top: "calc(100% - 100vh)" }} />
    </section>
  );
}
