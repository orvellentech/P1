"use client";

import { useRef } from "react";
import s from "./About.module.css";
import FounderCard from "./FounderCard";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGsap } from "@/hooks/useGsap";
import { useExperience } from "@/lib/store/experienceStore";
import { attachTilt, createFounderCard, createMaskedLines } from "@/animations/about";
import { devPlaceholder } from "@/lib/placeholder";
import { SCROLL } from "@/config/animation.config";
import type { SiteContent } from "@/config/types";

const DESKTOP = "(min-width: 900px)";

/** Chapter VI — the modern company: information, then the three founders. */
export default function AboutSection({ content }: { content: SiteContent }) {
  const ref = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useExperience((st) => st.reducedMotion);

  useGsap(
    ref,
    () => {
      const root = ref.current!;
      root.querySelectorAll<HTMLElement>("[data-lines]").forEach((el) => createMaskedLines(el, reduced));
      gsap.fromTo(
        root.querySelectorAll("[data-pillar]"),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: root.querySelector("[data-pillars]"), start: "top 90%", end: "top 60%", scrub: SCROLL.scrub } },
      );

      const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-founder]"));
      const refsFor = (card: HTMLElement) => ({
        card,
        imageWrap: card.querySelector<HTMLElement>("[data-image-wrap]")!,
        image: card.querySelector<HTMLElement>("[data-image]")!,
        index: card.querySelector<HTMLElement>("[data-index]")!,
        name: card.querySelector<HTMLElement>("[data-name]")!,
        meta: Array.from(card.querySelectorAll<HTMLElement>("[data-meta]")),
      });
      const detach = cards.map((c) => attachTilt(c, c.querySelector<HTMLElement>("[data-tilt]")!));

      const mm = gsap.matchMedia();
      mm.add(DESKTOP, () => {
        // Horizontal documentary strip: vertical scroll drives the track sideways.
        const pin = pinRef.current!;
        const track = trackRef.current!;
        const overflow = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const setOverflow = () => pin.style.setProperty("--track-overflow", `${overflow()}px`);
        setOverflow();
        ScrollTrigger.addEventListener("refreshInit", setOverflow);
        const scrollTween = gsap.to(track, {
          x: () => -overflow(),
          ease: "none",
          scrollTrigger: { trigger: pin, start: "top top", end: "bottom bottom", scrub: SCROLL.scrub, invalidateOnRefresh: true },
        });
        cards.forEach((c) => createFounderCard(refsFor(c), reduced, scrollTween));
        return () => ScrollTrigger.removeEventListener("refreshInit", setOverflow);
      });
      mm.add(`not all and ${DESKTOP}`, () => {
        cards.forEach((c) => createFounderCard(refsFor(c), reduced));
      });

      return () => {
        detach.forEach((d) => d());
        mm.revert();
      };
    },
    [reduced, content],
  );

  const founders = content.founders;

  return (
    <section id="chapter-about-content" ref={ref} className={s.section} data-tone="light" aria-labelledby="about-title">
      <div className={s.intro}>
        <p className={s.eyebrow}>
          (VI) Who we are
          <span aria-hidden="true" />
        </p>
        <div className={s.body}>
          {content.about.paragraphs.map((p, i) => (
            <p key={i} className={s.paragraph} data-lines="" {...devPlaceholder(p)}>
              {p}
            </p>
          ))}
          <div className={s.pillars} data-pillars="">
            <div className={s.pillar} data-pillar="">
              <p className={s.pillarLabel}>Mission</p>
              <p className={s.pillarText} {...devPlaceholder(content.mission)}>
                {content.mission}
              </p>
            </div>
            <div className={s.pillar} data-pillar="">
              <p className={s.pillarLabel}>Vision</p>
              <p className={s.pillarText} {...devPlaceholder(content.vision)}>
                {content.vision}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.founders} aria-labelledby="founders-title">
        <div className={s.foundersHead}>
          <h3 className={s.foundersTitle} id="founders-title" data-lines="">
            The <em>founders</em>
          </h3>
          <p className={s.count} aria-hidden="true">
            {String(founders.length).padStart(2, "0")}
          </p>
        </div>
        <div className={s.galleryPin} ref={pinRef}>
          <div className={s.gallerySticky}>
            <div className={s.track} ref={trackRef}>
              {founders.map((f, i) => (
                <FounderCard key={i} founder={f} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
