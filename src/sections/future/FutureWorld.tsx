"use client";

import { Fragment, useRef } from "react";
import s from "./Future.module.css";
import { useGsap } from "@/hooks/useGsap";
import { useExperience } from "@/lib/store/experienceStore";
import { createFutureType } from "@/animations/future";
import { CHAPTER_HEIGHT } from "@/config/animation.config";

function Chars({ text, group }: { text: string; group: number }) {
  return (
    <>
      {text.split(" ").map((word, wi, arr) => (
        <Fragment key={wi}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {Array.from(word).map((ch, ci) => (
              <span key={ci} className={s.char} data-group={group}>
                {ch}
              </span>
            ))}
          </span>
          {wi < arr.length - 1 && <span className={s.space}> </span>}
        </Fragment>
      ))}
    </>
  );
}

const MESSAGE = "WELCOME TO 2060 — ERA OF TECHNOLOGY AND LIMITLESS POSSIBILITIES";

/** Chapter VIII — the future arrives. */
export default function FutureWorld() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useExperience((st) => st.reducedMotion);

  useGsap(
    ref,
    () => {
      const root = ref.current!;
      const group = (g: number) => Array.from(root.querySelectorAll<HTMLElement>(`[data-group="${g}"]`));
      createFutureType(
        {
          section: root,
          lines: [group(0), group(1), group(2)],
          lineEls: Array.from(root.querySelectorAll<HTMLElement>("[data-line]")),
          hud: root.querySelector<HTMLElement>("[data-hud]")!,
        },
        reduced,
      );
    },
    [reduced],
  );

  return (
    <section id="chapter-future" ref={ref} className={s.section} style={{ height: `${CHAPTER_HEIGHT.future}vh` }} data-tone="future" aria-label="Welcome to 2060">
      <span data-chapter="chapter-future" style={{ position: "absolute", top: 0 }} />
      <div className={s.sticky}>
        <div className={s.hud} data-hud="" aria-hidden="true">
          <span className={s.hudTL}>
            <span className={s.hudDot} />
            EPOCH 2060 · ONLINE
          </span>
          <span className={s.hudBR}>CHAPTER VIII / IX</span>
        </div>
        <h2 className={s.headline} aria-label={MESSAGE}>
          <span className={s.line} data-line="" aria-hidden="true">
            <span className={s.welcome} style={{ display: "block" }}>
              <Chars text="WELCOME TO" group={0} />
            </span>
            <span className={s.year} style={{ display: "block" }}>
              <Chars text="2060" group={0} />
            </span>
          </span>
          <span className={`${s.line} ${s.era}`} data-line="" aria-hidden="true">
            <Chars text="ERA OF TECHNOLOGY" group={1} />
          </span>
          <span className={`${s.line} ${s.limitless}`} data-line="" aria-hidden="true">
            <Chars text="AND LIMITLESS POSSIBILITIES" group={2} />
          </span>
        </h2>
      </div>
    </section>
  );
}
