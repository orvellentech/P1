"use client";

import { useEffect } from "react";
import Stage from "./Stage";
import TheaterDoor from "@/sections/loader/TheaterDoor";
import { ChapterNav, Grain, ScrollCue, SkipIntro, SoundToggle } from "./ui/Chrome";
import { boot } from "@/lib/loading/boot";
import { scrollEngine } from "@/lib/scroll/scrollEngine";
import { experienceStore, useExperience } from "@/lib/store/experienceStore";
import { prefersReducedMotion } from "@/lib/device";

/**
 * Orchestrator: real initialisation first (the door shakes while it runs),
 * then the stage mounts behind the closed door, then the show begins.
 */
export default function Experience() {
  const load = useExperience((st) => st.load);
  const content = useExperience((st) => st.content);
  const intro = useExperience((st) => st.intro);

  useEffect(() => {
    window.scrollTo(0, 0);
    scrollEngine.lock();
    experienceStore.set({ reducedMotion: prefersReducedMotion() });
    boot();
    if (process.env.NODE_ENV !== "production") {
      // Debug handle for development only (inspect or drive phases from the console).
      (window as unknown as { __experience: typeof experienceStore }).__experience = experienceStore;
    }

    // Follow OS-level reduced-motion changes live.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => experienceStore.set({ reducedMotion: prefersReducedMotion() });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const showDoor = intro === "door" || intro === "opening";

  const skipToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    if (experienceStore.get().intro !== "complete") experienceStore.set({ introSkipped: true });
    setTimeout(() => {
      const target = document.getElementById("chapter-contact");
      if (target) {
        scrollEngine.scrollTo(target, { immediate: true });
        target.querySelector<HTMLElement>("input, textarea, a, button")?.focus({ preventScroll: true });
      }
    }, 20);
  };

  return (
    <>
      {load === "success" && content && (
        <a className="skip-link" href="#chapter-contact" onClick={skipToContact}>
          Skip to contact
        </a>
      )}
      {load === "success" && content && <Stage content={content} />}
      {showDoor && <TheaterDoor />}
      <Grain />
      <SoundToggle />
      <SkipIntro />
      <ScrollCue />
      <ChapterNav />
    </>
  );
}
