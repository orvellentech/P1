"use client";

import { useSyncExternalStore } from "react";
import type { SiteContent } from "@/config/types";
import type { QualityTier, ChapterId } from "@/config/animation.config";

/**
 * Low-frequency experience state (phases, era, settings).
 * High-frequency values (scroll progress, uniforms) never live here —
 * they stay in refs / GSAP targets to avoid React re-renders per frame.
 */

export type LoadStatus = "idle" | "loading" | "error" | "success";
export type IntroPhase = "door" | "opening" | "theater" | "curtains" | "film" | "complete";
export type Era = "past" | "future";
export type Tone = "dark" | "sepia" | "light" | "future";

export interface LoadingSnapshot {
  progress: number;
  stage: string;
  errors: { task: string; message: string }[];
}

export interface ExperienceState {
  load: LoadStatus;
  loading: LoadingSnapshot;
  content: SiteContent | null;
  /** Main stage mounted, measured and ready to be revealed. */
  stageReady: boolean;
  intro: IntroPhase;
  introSkipped: boolean;
  era: Era;
  tone: Tone;
  activeChapter: ChapterId;
  sound: boolean;
  reducedMotion: boolean;
  quality: QualityTier;
  webgl: boolean;
}

type Listener = () => void;

function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    getInitial: () => initial,
    set(partial: Partial<T>) {
      let changed = false;
      for (const key in partial) {
        if (!Object.is(state[key], partial[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...partial };
      listeners.forEach((l) => l());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const experienceStore = createStore<ExperienceState>({
  load: "idle",
  loading: { progress: 0, stage: "INITIALIZING", errors: [] },
  content: null,
  stageReady: false,
  intro: "door",
  introSkipped: false,
  era: "past",
  tone: "dark",
  activeChapter: "chapter-theater",
  sound: false,
  reducedMotion: false,
  quality: "high",
  webgl: true,
});

export function useExperience<S>(selector: (s: ExperienceState) => S): S {
  return useSyncExternalStore(
    experienceStore.subscribe,
    () => selector(experienceStore.get()),
    () => selector(experienceStore.getInitial()),
  );
}

/** Subscribe to a derived value outside React (animation code). */
export function watchExperience<S>(selector: (s: ExperienceState) => S, cb: (value: S, prev: S) => void) {
  let prev = selector(experienceStore.get());
  return experienceStore.subscribe(() => {
    const next = selector(experienceStore.get());
    if (!Object.is(next, prev)) {
      const old = prev;
      prev = next;
      cb(next, old);
    }
  });
}
