import { gsap } from "@/lib/gsap";
import { FILM, THEATER } from "@/config/animation.config";
import type { CurtainController, FilmController } from "./theater";

export interface FilmRefs {
  screenLight: HTMLElement;
  leader: HTMLElement;
  leaderNumber: HTMLElement;
  card: HTMLElement;
  logoIntro: HTMLElement;
  frameDeco: HTMLElement;
  nameChars: HTMLElement[];
  rules: HTMLElement[];
  extras: HTMLElement[];
  beam: HTMLElement;
}

/** Heavy curtains part: slow start, powerful middle, soft landing. */
export function createCurtainOpen(curtains: CurtainController, reduced: boolean) {
  return gsap.to(curtains, {
    openTop: 1,
    duration: reduced ? 0.8 : THEATER.curtainOpen,
    ease: reduced ? "power1.inOut" : "velvet",
    onUpdate: () => curtains.wake(),
  });
}

/**
 * The old black-and-white title sequence:
 * black → projector stutter → light → countdown leader → logo → name → hold.
 */
export function createFilmIntro(r: FilmRefs, film: FilmController, stage: HTMLElement, reduced: boolean) {
  const tl = gsap.timeline();
  gsap.set([r.leader, r.card], { autoAlpha: 0 });
  gsap.set(r.screenLight, { opacity: 0 });
  gsap.set(r.nameChars, { autoAlpha: 0 });
  gsap.set(r.rules, { scaleX: 0 });
  gsap.set(r.extras, { autoAlpha: 0 });
  gsap.set(r.logoIntro, { autoAlpha: 0 });
  gsap.set(r.frameDeco, { autoAlpha: 0 });

  if (reduced) {
    film.intensity = 0.4;
    tl.to(r.screenLight, { opacity: 1, duration: 0.6 })
      .set(r.card, { autoAlpha: 1 })
      .to([r.logoIntro, r.frameDeco, ...r.nameChars, ...r.extras], { autoAlpha: 1, duration: 0.8 })
      .to(r.rules, { scaleX: 1, duration: 0.6 }, "<")
      .to(r.beam, { opacity: 0.5, duration: 0.8 }, 0)
      .call(() => film.stop());
    return tl;
  }

  tl.call(() => film.start())
    // House lights dip as the projector starts, like a real picture palace.
    .to(stage, { "--house": 0.45, duration: 1.2, ease: "power1.inOut" }, 0)
    // Damage is only visible once light passes through the film: it rises with the lamp.
    .set(film, { flickerAmp: 0.5, intensity: 0.15 }, 0)
    // Projector stutter.
    .to(r.screenLight, { opacity: 0.4, duration: 0.07, repeat: 7, yoyo: true, ease: "steps(1)" }, 0.2)
    .to(r.beam, { opacity: 0.35, duration: 0.07, repeat: 7, yoyo: true, ease: "steps(1)" }, 0.2)
    .to(r.screenLight, { opacity: 1, duration: FILM.lightUp, ease: "power2.inOut" }, FILM.flicker)
    .to(r.beam, { opacity: 1, duration: FILM.lightUp, ease: "power2.inOut" }, FILM.flicker)
    .to(film, { flickerAmp: 0.22, intensity: 1, duration: FILM.lightUp }, FILM.flicker)
    .addLabel("countdown")
    .set(r.leader, { autoAlpha: 1 }, "countdown");

  ["3", "2", "1"].forEach((n, i) => {
    const at = `countdown+=${i * FILM.countdownStep}`;
    tl.set(r.leaderNumber, { textContent: n }, at).fromTo(
      r.leader,
      { "--sweep": "0deg" },
      { "--sweep": "360deg", duration: FILM.countdownStep, ease: "none", immediateRender: false },
      at,
    );
  });

  tl.addLabel("title", `countdown+=${3 * FILM.countdownStep}`)
    .set(r.leader, { autoAlpha: 0 }, "title")
    // One dark frame between reels.
    .to(r.screenLight, { opacity: 0.08, duration: 0.14, ease: "steps(1)" }, "title")
    .to(r.screenLight, { opacity: 1, duration: 0.5, ease: "power2.out" }, "title+=0.14")
    .set(r.card, { autoAlpha: 1 }, "title+=0.14")
    .fromTo(
      r.logoIntro,
      { autoAlpha: 0, scale: 1.2, filter: "blur(14px) brightness(1.9)" },
      // clearProps: leave no filter behind on a layer the portal later scales 70×.
      { autoAlpha: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: FILM.logoIn, ease: "cinema", clearProps: "filter" },
      "title+=0.3",
    )
    .fromTo(r.frameDeco, { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: "editorial" }, "title+=0.7")
    .fromTo(
      r.nameChars,
      { autoAlpha: 0, yPercent: 40, filter: "blur(8px)" },
      { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 1, stagger: { each: 0.045, from: "center" }, ease: "editorial" },
      `title+=${FILM.logoIn * 0.7}`,
    )
    .to(r.rules, { scaleX: 1, duration: 1.1, ease: "editorial" }, `title+=${FILM.logoIn * 0.8}`)
    .to(r.extras, { autoAlpha: 1, duration: 0.9, stagger: 0.15, ease: "power1.out" }, `title+=${FILM.logoIn + 0.2}`)
    // The reel steadies, then the frame holds perfectly still.
    .to(film, { flickerAmp: 0.05, intensity: 0.5, weaveAmp: 0.25, duration: FILM.settle, ease: "power1.inOut" }, `title+=${FILM.logoIn + FILM.nameIn}`)
    .call(() => film.stop());

  return tl;
}
