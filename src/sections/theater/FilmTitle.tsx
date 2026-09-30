"use client";

import { useRef } from "react";
import s from "./FilmTitle.module.css";
import { DecoFrame } from "./Ornaments";
import { useIsomorphicLayoutEffect } from "@/hooks/useGsap";
import type { SiteContent } from "@/config/types";

export interface FilmTitleHandles {
  screenLight: HTMLDivElement;
  weave: HTMLDivElement;
  leader: HTMLDivElement;
  leaderNumber: HTMLSpanElement;
  card: HTMLDivElement;
  frameDeco: HTMLDivElement;
  logoPortal: HTMLDivElement;
  logoIntro: HTMLDivElement;
  logoImg: HTMLImageElement;
  nameChars: HTMLSpanElement[];
  rules: HTMLSpanElement[];
  extras: HTMLElement[];
  /** Everything that dissolves when the camera heads for the logo. */
  titleFade: HTMLElement[];
  filmCanvas: HTMLCanvasElement | null;
  filmFallback: HTMLDivElement | null;
}

interface Props {
  content: SiteContent;
  webgl: boolean;
  onReady: (h: FilmTitleHandles) => void;
}

/** The black-and-white title card projected on the theater screen. */
export default function FilmTitle({ content, webgl, onReady }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const name = content.companyName;
  const tagline = content.tagline.trim();
  // Long names shrink to stay on one line inside the 4:3 frame.
  const nameSize = `min(8cqh, ${(88 / Math.max(6, name.length * 0.95)).toFixed(2)}cqw)`;

  useIsomorphicLayoutEffect(() => {
    const el = root.current!;
    const q = <T extends Element>(sel: string) => el.querySelector<T>(sel)!;
    const qa = <T extends Element>(sel: string) => Array.from(el.querySelectorAll<T>(sel));
    onReady({
      screenLight: q<HTMLDivElement>("[data-f=light]"),
      weave: q<HTMLDivElement>("[data-f=weave]"),
      leader: q<HTMLDivElement>("[data-f=leader]"),
      leaderNumber: q<HTMLSpanElement>("[data-f=number]"),
      card: q<HTMLDivElement>("[data-f=card]"),
      frameDeco: q<HTMLDivElement>("[data-f=deco]"),
      logoPortal: q<HTMLDivElement>("[data-f=logo-portal]"),
      logoIntro: q<HTMLDivElement>("[data-f=logo-intro]"),
      logoImg: q<HTMLImageElement>("[data-f=logo-img]"),
      nameChars: qa<HTMLSpanElement>("[data-f=char]"),
      rules: qa<HTMLSpanElement>("[data-f=rule]"),
      extras: qa<HTMLElement>("[data-f=extra]"),
      titleFade: qa<HTMLElement>("[data-f=fade]"),
      filmCanvas: el.querySelector<HTMLCanvasElement>("[data-f=film]"),
      filmFallback: el.querySelector<HTMLDivElement>("[data-f=film-fallback]"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} style={{ position: "absolute", inset: 0 }}>
      <div className={s.screenLight} data-f="light" />
      <div className={s.weave} data-f="weave">
        <div className={s.leader} data-f="leader" aria-hidden="true">
          <div className={s.leaderCircle}>
            <span className={s.leaderNumber} data-f="number">
              3
            </span>
          </div>
        </div>

        <div className={s.card} data-f="card">
          <div data-f="deco" style={{ position: "absolute", inset: 0 }}>
            <div data-f="fade" style={{ position: "absolute", inset: 0 }}>
              <DecoFrame className={s.frameDeco} />
            </div>
          </div>
          <p className={s.caption} data-f="extra" aria-hidden="true">
            <span data-f="fade" style={{ display: "inline-block" }}>
              A PICTURE IN NINE CHAPTERS
            </span>
          </p>
          <div className={s.logoPortal} data-f="logo-portal" style={{ aspectRatio: String(content.logo.aspectRatio) }}>
            <div className={s.logoIntro} data-f="logo-intro">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.logoImg} data-f="logo-img" src={content.logo.src} alt={content.logo.alt} style={{ aspectRatio: String(content.logo.aspectRatio) }} />
            </div>
          </div>
          <h1 className={s.name} style={{ fontSize: nameSize }} aria-label={name} data-f="fade">
            {Array.from(name).map((ch, i) => (
              <span key={i} className={s.char} data-f="char" aria-hidden="true">
                {ch === " " ? " " : ch}
              </span>
            ))}
          </h1>
          {(tagline || content.foundedYear) && (
            <div className={s.taglineRow} data-f="fade">
              <span className={s.rule} data-f="rule" />
              {tagline ? (
                <span className={s.tagline} data-f="extra">
                  {tagline}
                </span>
              ) : (
                <span className={s.est} data-f="extra">
                  EST. {content.foundedYear}
                </span>
              )}
              <span className={s.rule} data-f="rule" />
            </div>
          )}
          {tagline && content.foundedYear && (
            <p className={s.est} data-f="extra">
              <span data-f="fade" style={{ display: "inline-block" }}>
                EST. {content.foundedYear}
              </span>
            </p>
          )}
        </div>
      </div>
      {webgl ? <canvas className={s.film} data-f="film" aria-hidden="true" /> : <div className={s.filmFallback} data-f="film-fallback" aria-hidden="true" />}
    </div>
  );
}
