"use client";

import { LoadingManager, type LoadTask } from "./LoadingManager";
import { fetchInit } from "@/lib/api/client";
import { publishProceduralTextures } from "@/lib/textures/procedural";
import { loadCubeWorld, loadDecreeRoll } from "@/lib/gl/modules";
import { detectQuality, detectWebGL, prefersReducedMotion } from "@/lib/device";
import { experienceStore } from "@/lib/store/experienceStore";
import { CRITICAL_FONT_FACES } from "@/styles/fonts";
import { LOADING } from "@/config/animation.config";
import { track } from "@/lib/analytics";
import type { SiteContent } from "@/config/types";

export interface BootContext {
  content: SiteContent | null;
  webgl: boolean;
}

/** Decoded images other modules need synchronously (e.g. canvas drawing). */
export const bootAssets: { logo: HTMLImageElement | null } = { logo: null };

function loadImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    const abort = () => {
      img.src = "";
      reject(new Error("Aborted"));
    };
    signal.addEventListener("abort", abort, { once: true });
    img.onload = () => {
      signal.removeEventListener("abort", abort);
      img.decode().then(() => resolve(img), () => resolve(img));
    };
    img.onerror = () => {
      signal.removeEventListener("abort", abort);
      reject(new Error(`Could not load image ${src}`));
    };
    img.src = src;
  });
}

const tasks: LoadTask<BootContext>[] = [
  {
    id: "environment",
    stage: "INITIALIZING",
    weight: 1,
    critical: true,
    async run({ ctx }) {
      ctx.webgl = detectWebGL();
      experienceStore.set({ webgl: ctx.webgl, quality: detectQuality(), reducedMotion: prefersReducedMotion() });
    },
  },
  {
    id: "api",
    stage: "CONNECTING",
    weight: 4,
    critical: true,
    async run({ ctx, signal, report }) {
      report(0.2);
      const data = await fetchInit(signal);
      ctx.content = data.content;
      report(1);
    },
  },
  {
    id: "fonts",
    stage: "LOADING ASSETS",
    weight: 2,
    critical: true,
    async run({ report }) {
      if (!("fonts" in document)) return;
      let done = 0;
      await Promise.all(
        CRITICAL_FONT_FACES.map((face) =>
          document.fonts.load(face).then((faces) => {
            if (!faces.length) throw new Error(`Font not available: ${face}`);
            report(++done / CRITICAL_FONT_FACES.length);
          }),
        ),
      );
      await document.fonts.ready;
    },
  },
  {
    id: "brand",
    stage: "LOADING ASSETS",
    weight: 2,
    critical: true,
    dependsOn: ["api"],
    async run({ ctx, signal }) {
      const content = ctx.content!;
      if (!content.companyName.trim()) throw new Error("Company name is missing");
      bootAssets.logo = await loadImage(content.logo.src, signal);
    },
  },
  {
    id: "portraits",
    stage: "LOADING ASSETS",
    weight: 1,
    critical: false,
    dependsOn: ["api"],
    async run({ ctx, signal }) {
      const images = ctx.content!.founders.map((f) => f.image).filter(Boolean);
      await Promise.all(images.map((src) => loadImage(src, signal)));
    },
  },
  {
    id: "textures",
    stage: "PREPARING THEATER",
    weight: 2,
    critical: true,
    async run() {
      await publishProceduralTextures();
    },
  },
  {
    id: "3d",
    stage: "PREPARING THEATER",
    weight: 3,
    critical: true,
    dependsOn: ["environment"],
    async run({ ctx, report }) {
      // Without WebGL the 3D chapters fall back to CSS; nothing to download.
      if (!ctx.webgl) return;
      await loadDecreeRoll();
      report(0.5);
      await loadCubeWorld();
    },
  },
];

let manager: LoadingManager<BootContext> | null = null;
let startedAt = 0;

function getManager() {
  if (manager) return manager;
  manager = new LoadingManager<BootContext>(tasks, { content: null, webgl: true }, LOADING.taskTimeoutMs);
  manager.subscribe((snap) => {
    experienceStore.set({
      loading: { progress: snap.progress, stage: snap.stage, errors: snap.errors },
      ...(snap.status === "running" ? { load: "loading" as const } : {}),
    });
  });
  return manager;
}

async function run(isRetry: boolean) {
  const m = getManager();
  startedAt = performance.now();
  track(isRetry ? "loading_retry" : "loading_start");
  const ok = await m.start();
  if (ok) {
    experienceStore.set({ content: m.context.content, load: "success" });
    track("loading_success", { ms: Math.round(performance.now() - startedAt) });
  } else {
    experienceStore.set({ load: "error" });
    track("loading_error", { errors: m.snapshot().errors.map((e) => e.task).join(",") });
  }
  return ok;
}

let bootPromise: Promise<boolean> | null = null;

/** Idempotent — safe under React Strict Mode double effects. */
export function boot() {
  bootPromise ??= run(false);
  return bootPromise;
}

export function retryBoot() {
  bootPromise = run(true);
  return bootPromise;
}
