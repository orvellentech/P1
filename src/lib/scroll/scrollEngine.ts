"use client";

import Lenis from "lenis";
import { gsap, ScrollTrigger, ensureGsap } from "@/lib/gsap";
import { SCROLL } from "@/config/animation.config";

/**
 * Scroll engine.
 *
 * Native document scrolling stays the source of truth (so keyboard,
 * scrollbars, find-in-page, and assistive tech all work). Lenis only
 * interpolates wheel input, turning coarse notches from low-DPI mice into
 * a continuous glide; touch keeps the platform's own momentum. Every
 * chapter reads *normalised* progress from ScrollTrigger, never raw deltas.
 */
class ScrollEngine {
  lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;
  private locked = false;
  private velocityListeners = new Set<(v: number) => void>();

  init(reducedMotion: boolean) {
    ensureGsap();
    if (typeof window !== "undefined" && "scrollRestoration" in history) history.scrollRestoration = "manual";
    if (this.lenis || reducedMotion) return;

    this.lenis = new Lenis({
      lerp: SCROLL.lerp,
      wheelMultiplier: SCROLL.wheelMultiplier,
      touchMultiplier: SCROLL.touchMultiplier,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });
    this.lenis.on("scroll", (l: Lenis) => {
      ScrollTrigger.update();
      this.velocityListeners.forEach((fn) => fn(l.velocity));
    });
    this.tickerFn = (time) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.tickerFn);
    gsap.ticker.lagSmoothing(0);
    if (this.locked) this.lenis.stop();
  }

  destroy() {
    if (this.tickerFn) gsap.ticker.remove(this.tickerFn);
    this.tickerFn = null;
    this.lenis?.destroy();
    this.lenis = null;
  }

  lock() {
    this.locked = true;
    document.documentElement.classList.add("is-scroll-locked");
    this.lenis?.stop();
  }

  unlock() {
    this.locked = false;
    document.documentElement.classList.remove("is-scroll-locked");
    this.lenis?.start();
  }

  get isLocked() {
    return this.locked;
  }

  scrollTo(target: number | HTMLElement, opts: { immediate?: boolean; duration?: number } = {}) {
    if (this.lenis) {
      this.lenis.scrollTo(target, { immediate: opts.immediate, duration: opts.duration ?? 1.6, force: true });
      return;
    }
    const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: opts.immediate ? "auto" : "smooth" });
  }

  /** Scroll velocity (px/frame) — used for subtle velocity-reactive effects. */
  onVelocity(fn: (v: number) => void) {
    this.velocityListeners.add(fn);
    return () => this.velocityListeners.delete(fn);
  }
}

export const scrollEngine = new ScrollEngine();
