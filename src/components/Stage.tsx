"use client";

import { useEffect } from "react";
import { ScrollTrigger, ensureGsap } from "@/lib/gsap";
import { scrollEngine } from "@/lib/scroll/scrollEngine";
import { experienceStore, useExperience } from "@/lib/store/experienceStore";
import { useChapterTracking } from "@/hooks/useChapterTracking";
import TheaterStage from "@/sections/theater/TheaterStage";
import AntiquePage from "@/sections/antique/AntiquePage";
import DecreeTransformation from "@/sections/decree/DecreeTransformation";
import AboutSection from "@/sections/about/AboutSection";
import MagicSnap from "@/sections/magic/MagicSnap";
import FutureBackdrop from "@/sections/future/FutureBackdrop";
import FutureWorld from "@/sections/future/FutureWorld";
import ContactSection from "@/sections/contact/ContactSection";
import type { SiteContent } from "@/config/types";

/** The nine chapters, mounted once initialisation has succeeded (behind the closed door). */
export default function Stage({ content }: { content: SiteContent }) {
  const intro = useExperience((st) => st.intro);
  const reduced = useExperience((st) => st.reducedMotion);

  // Scroll engine lifecycle (Lenis off entirely for reduced motion).
  useEffect(() => {
    ensureGsap();
    scrollEngine.init(reduced);
    return () => scrollEngine.destroy();
  }, [reduced]);

  // Measure once layout has settled, then let the door open.
  useEffect(() => {
    let done = false;
    const ready = () => {
      if (done) return;
      done = true;
      ScrollTrigger.refresh();
      experienceStore.set({ stageReady: true });
    };
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(ready);
    });
    // Frames can be throttled (background tab, occluded window): don't let that stall the reveal.
    const fallback = setTimeout(ready, 250);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(fallback);
    };
  }, []);

  // The intro owns the screen; scrolling begins when the title card holds.
  useEffect(() => {
    if (intro === "complete") {
      scrollEngine.unlock();
      ScrollTrigger.refresh();
    } else {
      scrollEngine.lock();
    }
  }, [intro]);

  // Any late change to page height (images, fonts, breakpoints) re-measures every chapter.
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    let lastHeight = main.offsetHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      const h = main.offsetHeight;
      if (Math.abs(h - lastHeight) < 2) return;
      lastHeight = h;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    ro.observe(main);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useChapterTracking(true);

  return (
    <>
      <FutureBackdrop />
      <main id="main">
        <TheaterStage content={content} />
        <AntiquePage content={content} />
        <DecreeTransformation content={content} />
        <AboutSection content={content} />
        <MagicSnap />
        <FutureWorld />
        <ContactSection content={content} />
      </main>
    </>
  );
}
