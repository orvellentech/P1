"use client";

import { useEffect, useState } from "react";
import s from "./Chrome.module.css";
import { experienceStore, useExperience } from "@/lib/store/experienceStore";
import { audio } from "@/lib/audio/AudioEngine";
import { scrollEngine } from "@/lib/scroll/scrollEngine";
import { track } from "@/lib/analytics";
import { CHAPTERS, type ChapterId } from "@/config/animation.config";

/** Sound is off by default; turning it on is the user gesture that unlocks audio. */
export function SoundToggle() {
  const sound = useExperience((st) => st.sound);

  const toggle = async () => {
    const next = !sound;
    experienceStore.set({ sound: next });
    if (next) await audio.enable();
    else audio.disable();
    track("sound_toggle", { on: next });
  };

  return (
    <button type="button" className={`${s.chromeButton} ${s.sound} ${sound ? s.soundOn : ""}`} onClick={toggle} aria-pressed={sound} aria-label={sound ? "Turn sound off" : "Turn sound on"}>
      <span className={s.bars} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {sound ? "Sound on" : "Sound off"}
    </button>
  );
}

export function SkipIntro() {
  const load = useExperience((st) => st.load);
  const intro = useExperience((st) => st.intro);
  const stageReady = useExperience((st) => st.stageReady);
  if (load !== "success" || !stageReady || intro === "complete") return null;
  return (
    <button type="button" className={`${s.chromeButton} ${s.skip}`} onClick={() => experienceStore.set({ introSkipped: true })}>
      Skip intro →
    </button>
  );
}

export function ScrollCue() {
  const intro = useExperience((st) => st.intro);
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`${s.cue} ${intro === "complete" && atTop ? s.cueVisible : ""}`} aria-hidden="true">
      SCROLL
      <span className={s.cueLine} />
    </div>
  );
}

export function ChapterNav() {
  const intro = useExperience((st) => st.intro);
  const active = useExperience((st) => st.activeChapter);

  const go = (id: ChapterId) => {
    const marker = document.querySelector<HTMLElement>(`[data-chapter="${id}"]`);
    if (!marker) return;
    const top = marker.getBoundingClientRect().top + window.scrollY;
    const distance = Math.abs(top - window.scrollY);
    scrollEngine.scrollTo(top, { duration: Math.min(4, 1.2 + distance / 4000) });
  };

  return (
    <nav className={`${s.nav} ${intro === "complete" ? s.navVisible : ""}`} aria-label="Chapters">
      <ol className={s.navList}>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`${s.navItem} ${active === c.id ? s.navActive : ""}`}
              onClick={() => go(c.id)}
              aria-current={active === c.id ? "true" : undefined}
              tabIndex={intro === "complete" ? 0 : -1}
            >
              <span className={s.navLabel}>{c.title}</span>
              <span className={s.navNumeral}>{c.numeral}</span>
              <span className={s.navTick} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Grain() {
  return <div className={s.grain} aria-hidden="true" />;
}
