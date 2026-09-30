"use client";

import { useRef } from "react";
import s from "./Antique.module.css";
import { Divider } from "./AntiqueOrnaments";
import SplitWords from "@/components/SplitWords";
import { useGsap } from "@/hooks/useGsap";
import { useExperience } from "@/lib/store/experienceStore";
import { createDrawOn, createInkReveal, createPress } from "@/animations/antique";
import { isPlaceholder } from "@/config/site.config";
import { devPlaceholder } from "@/lib/placeholder";
import type { SiteContent } from "@/config/types";

/** Chapter IV — the company introduction as an antique printed document. */
export default function AntiquePage({ content }: { content: SiteContent }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useExperience((st) => st.reducedMotion);

  useGsap(
    ref,
    () => {
      const root = ref.current!;
      root.querySelectorAll<HTMLElement>("[data-ink]").forEach((el) => createInkReveal(el, reduced));
      root.querySelectorAll<SVGElement>("[data-divider]").forEach((el) => createDrawOn(el, reduced));
      root.querySelectorAll<HTMLElement>("[data-press]").forEach((el) => createPress(el, reduced));
    },
    [reduced],
  );

  const intro = content.intro.trim();
  const useDropCap = !isPlaceholder(intro) && /^[A-Za-z]/.test(intro);

  return (
    <section id="chapter-antique" ref={ref} className={`${s.section} parchment-bg`} data-tone="sepia" aria-labelledby="antique-title">
      <span data-chapter="chapter-antique" style={{ position: "absolute", top: "-35vh" }} />
      <span className={`${s.margin} ${s.marginLeft}`} aria-hidden="true" />
      <span className={`${s.margin} ${s.marginRight}`} aria-hidden="true" />

      <div className={s.sheet}>
        <p className={s.intro} data-ink {...devPlaceholder(intro)}>
          {useDropCap ? (
            <>
              <span className={s.dropcap} aria-hidden="true">
                {intro[0]}
              </span>
              <span className="sr-only">{intro[0]}</span>
              <SplitWords text={intro.slice(1)} wordClassName={s.word} />
            </>
          ) : (
            <SplitWords text={intro} wordClassName={s.word} />
          )}
        </p>

        <Divider className={s.divider} data-divider="" />

        <div className={s.pair}>
          <article className={s.article}>
            <p className={s.articleLabel}>Article the First</p>
            <h3 className={s.articleTitle} data-press>
              Our Mission
            </h3>
            <p className={s.articleText} data-ink {...devPlaceholder(content.mission)}>
              <SplitWords text={content.mission} wordClassName={s.word} />
            </p>
          </article>
          <article className={s.article}>
            <p className={s.articleLabel}>Article the Second</p>
            <h3 className={s.articleTitle} data-press>
              Our Vision
            </h3>
            <p className={s.articleText} data-ink {...devPlaceholder(content.vision)}>
              <SplitWords text={content.vision} wordClassName={s.word} />
            </p>
          </article>
        </div>

        <Divider className={s.divider} data-divider="" />

        <p className={s.colophon} data-press>
          Here ends the first account.
        </p>
      </div>
      <p className={s.pageNo} aria-hidden="true">
        — iv —
      </p>
    </section>
  );
}
