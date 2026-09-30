/**
 * Centralised animation constants.
 *
 * Durations are in seconds. Scroll ranges are expressed as normalised
 * progress (0 → 1) of the chapter they belong to, never as pixel offsets,
 * so every input device (coarse wheel, trackpad, touch, keyboard) drives
 * the same continuous timeline.
 */

export const SCROLL = {
  /** Lenis interpolation factor. Lower = smoother, heavier inertia. Smooths coarse wheel notches. */
  lerp: 0.085,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  /** ScrollTrigger scrub lag (s). Adds a small cinematic catch-up on top of Lenis, and smooths touch. */
  scrub: 0.45,
} as const;

/** Chapter heights in viewport heights (vh). The first 100vh of each is its sticky frame. */
export const CHAPTER_HEIGHT = {
  theater: 340,
  decree: 460,
  foundersPerPanel: 85,
  magic: 320,
  future: 300,
} as const;

export const LOADING = {
  /**
   * Presentation beat: the door shakes for at least this long, even if the
   * backend answers instantly. It only delays the reveal *after* a real,
   * successful initialisation; it never stands in for one.
   */
  minDoorTime: 2.2,
  /** Per-task timeout (ms) before a task is reported as failed. */
  taskTimeoutMs: 15000,
} as const;

export const DOOR = {
  idle: { rotation: 0.22, x: 0.7, frequency: 9 },
  thump: { minGap: 1.2, maxGap: 2.6, strongChance: 0.3, crack: 1.6, strongCrack: 3.4 },
  open: {
    settle: 0.35,
    pause: 0.45,
    handle: 0.35,
    swing: 2.1,
    rightDelay: 0.16,
    angle: 104,
    /** When (s after swing start) the camera starts moving into the theater. */
    dollyAt: 0.75,
    dolly: 2.3,
    dollyScale: 3.6,
    interiorFrom: 0.72,
  },
} as const;

export const THEATER = {
  lightsUp: 1.1,
  /** Pause between the doors finishing and the curtains starting (spec: 0.5–1s). */
  curtainDelay: 0.75,
  curtainOpen: 3.4,
  /** Spring used for the lagging curtain hem (secondary motion). */
  curtainSpring: { stiffness: 38, damping: 7.5 },
} as const;

export const FILM = {
  flicker: 1.3,
  lightUp: 0.9,
  countdownStep: 0.72,
  logoIn: 2.0,
  nameIn: 1.5,
  settle: 1.6,
  /** Projector frame rate for grain, scratches and gate weave. */
  fps: 18,
} as const;

/** Portal progress map (chapter 3). */
export const PORTAL = {
  approachEnd: 0.32,
  logoScaleApproach: 1.7,
  /** Kept moderate: beyond ~25× the logo layer gets huge on the GPU, and the iris covers by then anyway. */
  logoScaleMax: 24,
  revealStart: 0.36,
  revealEnd: 0.52,
  irisStart: 0.55,
  irisEnd: 0.84,
  settleEnd: 0.95,
} as const;

/** Decree / King's Order progress map (chapters 5 → phase 8). */
export const DECREE = {
  curl: [0.04, 0.2],
  roll: [0.18, 0.54],
  flyAway: [0.5, 0.66],
  whiten: [0.46, 0.8],
  typeMorph: [0.62, 0.94],
} as const;

export const MAGIC = {
  boring: [0.02, 0.2],
  letsDo: [0.18, 0.32],
  anticipate: [0.3, 0.42],
  handRise: [0.4, 0.62],
  /** Crossing this progress fires the snap (time-based, reversible). */
  snapAt: 0.7,
  snapDuration: 0.9,
  /** Moment inside the snap timeline where finger meets palm and light bursts. */
  snapImpact: 0.3,
  burstDuration: 2.4,
} as const;

export const FUTURE = {
  line1: [0.0, 0.22],
  line2: [0.2, 0.42],
  line3: [0.38, 0.6],
  exit: [0.78, 1],
  cameraTravel: 17,
} as const;

/** Quality tiers — geometry, particle and resolution budgets. */
export const QUALITY = {
  high: { dpr: 1.75, cubes: 46, wireCubes: 14, stars: 700, motes: 80, dof: true, curtainDpr: 1.25 },
  medium: { dpr: 1.35, cubes: 30, wireCubes: 9, stars: 420, motes: 50, dof: false, curtainDpr: 1 },
  low: { dpr: 1, cubes: 18, wireCubes: 6, stars: 220, motes: 26, dof: false, curtainDpr: 0.75 },
} as const;

export type QualityTier = keyof typeof QUALITY;

export const CHAPTERS = [
  { id: "chapter-theater", numeral: "I", title: "Theater" },
  { id: "chapter-film", numeral: "II", title: "The Picture" },
  { id: "chapter-portal", numeral: "III", title: "The Portal" },
  { id: "chapter-antique", numeral: "IV", title: "Our Beginnings" },
  { id: "chapter-decree", numeral: "V", title: "The Decree" },
  { id: "chapter-about", numeral: "VI", title: "About Us" },
  { id: "chapter-magic", numeral: "VII", title: "Magic" },
  { id: "chapter-future", numeral: "VIII", title: "2060" },
  { id: "chapter-contact", numeral: "IX", title: "Contact" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
