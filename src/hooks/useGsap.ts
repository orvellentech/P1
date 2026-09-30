"use client";

import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from "react";
import { gsap, ensureGsap } from "@/lib/gsap";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Runs GSAP setup inside a scoped gsap.context. Every tween, timeline and
 * ScrollTrigger created in `setup` is reverted automatically on cleanup or
 * when deps change — no leaked triggers, safe under Strict Mode.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (self: gsap.Context) => void | (() => void),
  deps: DependencyList,
) {
  useIsomorphicLayoutEffect(() => {
    ensureGsap();
    if (!scope.current) return;
    let extraCleanup: void | (() => void);
    const ctx = gsap.context((self) => {
      extraCleanup = setup(self);
    }, scope.current);
    return () => {
      if (typeof extraCleanup === "function") extraCleanup();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
