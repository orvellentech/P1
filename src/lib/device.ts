import type { QualityTier } from "@/config/animation.config";

/** Rough GPU/CPU budget estimate. Conservative on touch devices and small screens. */
export function detectQuality(): QualityTier {
  if (typeof window === "undefined") return "high";
  const override = new URLSearchParams(window.location.search).get("quality");
  if (override === "high" || override === "medium" || override === "low") return override;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;

  if (cores <= 2 || memory <= 2) return "low";
  if (coarse || small || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("webgl") === "off") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("motion") === "reduced") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
/** Maps value from [a, b] into [0, 1], clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
