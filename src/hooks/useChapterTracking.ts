"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { experienceStore, watchExperience, type Tone } from "@/lib/store/experienceStore";
import { track } from "@/lib/analytics";
import type { ChapterId } from "@/config/animation.config";

/**
 * Keeps two low-frequency values in sync with scroll:
 *  - the active chapter (for the chapter nav and analytics)
 *  - the colour tone of the section under the viewport centre (for UI chrome)
 * Positions are cached on ScrollTrigger refresh; each scroll tick is a cheap lookup.
 */
export function useChapterTracking(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let markers: { id: ChapterId; top: number }[] = [];
    let sections: { el: HTMLElement; top: number; bottom: number }[] = [];
    const seen = new Set<string>();

    const measure = () => {
      const y = window.scrollY;
      markers = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"))
        .map((m) => ({ id: m.dataset.chapter as ChapterId, top: m.getBoundingClientRect().top + y }))
        .sort((a, b) => a.top - b.top);
      sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-tone]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, top: r.top + y, bottom: r.bottom + y };
      });
    };

    const update = () => {
      const y = window.scrollY;
      const probe = y + window.innerHeight * 0.5;
      // Chapter: the last marker the viewport top has reached (small lead so arrivals register).
      let chapter: ChapterId = markers[0]?.id ?? "chapter-theater";
      const lead = y + window.innerHeight * 0.1;
      for (const m of markers) if (m.top <= lead) chapter = m.id;
      if (experienceStore.get().intro === "complete" && chapter === "chapter-theater") chapter = "chapter-film";
      if (chapter !== experienceStore.get().activeChapter) {
        experienceStore.set({ activeChapter: chapter });
        if (!seen.has(chapter)) {
          seen.add(chapter);
          track("chapter_view", { chapter });
        }
      }

      const section = sections.find((s) => probe >= s.top && probe < s.bottom);
      let tone = (section?.el.dataset.tone as Tone) ?? "dark";
      if (section?.el.id === "chapter-magic" && experienceStore.get().era === "future") tone = "future";
      if (section?.el.id === "chapter-decree" && probe - section.top > (section.bottom - section.top) * 0.55) tone = "light";
      if (document.documentElement.dataset.tone !== tone) document.documentElement.dataset.tone = tone;
    };

    measure();
    update();
    ScrollTrigger.addEventListener("refresh", measure);
    window.addEventListener("scroll", update, { passive: true });
    const stopEra = watchExperience((st) => st.era, update);
    const stopIntro = watchExperience((st) => st.intro, update);
    return () => {
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("scroll", update);
      stopEra();
      stopIntro();
    };
  }, [enabled]);
}
