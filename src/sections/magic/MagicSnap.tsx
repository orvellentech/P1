"use client";

import { useRef } from "react";
import s from "./Magic.module.css";
import Hand, { HAND_RIG } from "./Hand";
import { ScrollTrigger } from "@/lib/gsap";
import { useGsap } from "@/hooks/useGsap";
import { experienceStore, useExperience } from "@/lib/store/experienceStore";
import { createMagicBuildUp, createSnap, HandRig, SnapBurst, type SnapShared } from "@/animations/magic";
import { emit } from "@/lib/events";
import { audio } from "@/lib/audio/AudioEngine";
import { track } from "@/lib/analytics";
import { CHAPTER_HEIGHT, MAGIC, QUALITY } from "@/config/animation.config";

function Letters({ text, wordClass }: { text: string; wordClass: string }) {
  return (
    <>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className={wordClass}>
          {Array.from(word).map((ch, ci) => (
            <span key={ci} className={s.blast} data-blast="">
              <span className={s.char} data-char="">
                {ch}
              </span>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

/** Chapter VII — "Boring? Let's do a magic." The snap that ends the old world. */
export default function MagicSnap() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useExperience((st) => st.reducedMotion);
  const webgl = useExperience((st) => st.webgl);

  useGsap(
    ref,
    () => {
      const root = ref.current!;
      const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
      const svg = q<SVGSVGElement>("[data-hand]");
      const paper = q<HTMLElement>("[data-paper]");
      const burstCanvas = root.querySelector<HTMLCanvasElement>("[data-burst]");
      const refs = {
        section: root,
        paper,
        boringChars: Array.from(root.querySelectorAll<HTMLElement>("[data-boring] [data-char]")),
        question: q<HTMLElement>("[data-question]"),
        magicChars: Array.from(root.querySelectorAll<HTMLElement>("[data-magic] [data-char]")),
        statement: q<HTMLElement>("[data-statement]"),
        blast: Array.from(root.querySelectorAll<HTMLElement>("[data-blast]")),
        handWrap: q<HTMLElement>("[data-hand-wrap]"),
        handSnap: q<HTMLElement>("[data-hand-snap]"),
        svg,
        smear: q<SVGPathElement>("[data-smear]"),
        hint: q<HTMLElement>("[data-hint]"),
      };

      const rig = new HandRig(svg);
      const shared: SnapShared = { hole: 0, origin: { x: window.innerWidth / 2, y: window.innerHeight * 0.6 } };
      const burst = !reduced && webgl && burstCanvas ? new SnapBurst(burstCanvas, QUALITY[experienceStore.get().quality].curtainDpr) : null;

      createMagicBuildUp(refs, reduced);

      // Fingertip contact point in viewport pixels.
      const locateOrigin = () => {
        const m = svg.getScreenCTM();
        if (!m) return;
        const p = new DOMPoint(HAND_RIG.contact[0], HAND_RIG.contact[1]).matrixTransform(m);
        const sr = paper.getBoundingClientRect();
        shared.origin = { x: p.x - sr.left, y: p.y - sr.top };
        paper.style.setProperty("--ox", `${shared.origin.x}px`);
        paper.style.setProperty("--oy", `${shared.origin.y}px`);
      };

      const snap = createSnap(refs, rig, shared, reduced, () => {
        experienceStore.set({ era: "future" });
        audio.play("snap");
        audio.play("shimmer");
        audio.setAmbience("future");
        emit("snap:impact", { x: shared.origin.x, y: shared.origin.y });
        if (burst && burstCanvas) burst.fire(shared, burstCanvas);
        track("snap_triggered");
      });

      // Hysteresis so the snap never flickers back and forth around the threshold.
      let snapped = false;
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (!snapped && self.progress >= MAGIC.snapAt) {
            snapped = true;
            locateOrigin();
            snap.timeScale(1).play();
          } else if (snapped && self.progress < MAGIC.snapAt - 0.05) {
            snapped = false;
            experienceStore.set({ era: "past" });
            audio.setAmbience("none");
            emit("snap:reverse");
            if (burst && burstCanvas) burst.cancel(burstCanvas);
            snap.timeScale(1.6).reverse();
          }
        },
      });

      return () => {
        burst?.dispose();
        if (snapped) experienceStore.set({ era: "past" });
      };
    },
    [reduced, webgl],
  );

  return (
    <section id="chapter-magic" ref={ref} className={s.section} style={{ height: `${CHAPTER_HEIGHT.magic}vh` }} data-tone="light" aria-label="Boring? Let's do a magic">
      <span data-chapter="chapter-magic" style={{ position: "absolute", top: 0 }} />
      <div className={s.sticky}>
        <div className={s.paper} data-paper="" />
        <div className={s.statement} data-statement="">
          <h2 className={s.boring} data-boring="" aria-label="Boring?">
            <span aria-hidden="true" style={{ display: "contents" }}>
              <Letters text="BORING" wordClass={s.word} />
              <span className={`${s.word} ${s.questionWord}`}>
                <span className={s.blast} data-blast="">
                  <span className={s.question} data-question="">
                    ?
                  </span>
                </span>
              </span>
            </span>
          </h2>
          <p className={s.magic} data-magic="" aria-label="Let's do a magic">
            <span aria-hidden="true" style={{ display: "contents" }}>
              <Letters text="LET'S DO A MAGIC" wordClass={s.magicWord} />
            </span>
          </p>
        </div>
        <div className={s.handWrap} data-hand-wrap="">
          <div className={s.handSnap} data-hand-snap="">
            <Hand className={s.hand} />
          </div>
        </div>
        <p className={s.hint} data-hint="" aria-hidden="true">
          Keep scrolling to snap
        </p>
        {webgl && !reduced && <canvas className={s.burst} data-burst="" aria-hidden="true" />}
      </div>
    </section>
  );
}
