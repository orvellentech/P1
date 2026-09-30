# From the Past to 2060 — cinematic company site

A single continuous, scroll-driven story in nine chapters:

| # | Chapter | What happens | Driven by |
|---|---------|--------------|-----------|
| — | Loading | Old theater doors rattle while real initialisation runs | Loading manager |
| I | Theater | Doors swing open, camera walks in, house lights rise, curtains part | Time |
| II | The Picture | Black-and-white title sequence (countdown leader → logo → name), then a still hold | Time |
| III | The Portal | The camera flies into the screen and *through the logo* into parchment | Scroll |
| IV | Our Beginnings | Antique printed page with the company introduction, mission, vision | Scroll |
| V | The Decree | The King's Order curls, rolls into a scroll and recedes (WebGL) | Scroll |
| — | Past → Present | Parchment bleaches to white; the heading's type evolves from 17th-century to modern | Scroll |
| VI | About Us | Company information and the three founders (horizontal strip on desktop) | Scroll |
| VII | Magic | "BORING ? LET'S DO A MAGIC" — a gloved hand rises and snaps | Scroll → time |
| VIII | 2060 | Light burst, the world tears open; floating 3D cubes; "WELCOME TO 2060" | Scroll |
| IX | Contact | Glass contact panel inside the 2060 world | Scroll |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (includes type checking)
npm start
```

Node 20+ recommended.

## Replacing the placeholders

**Edit one file: `src/config/site.config.ts`.** Every `[BRACKETED]` value is a developer placeholder
(shown with a dashed outline in development). Nothing about the company is invented anywhere else.

- `companyName`, `tagline`, `foundedYear`
- `logo.src` — put your file in `public/brand/`. **Must be same-origin** (it's also used as a CSS mask for the portal). An SVG or transparent PNG works best: its opaque shape becomes the window into chapter IV. Set `logo.aspectRatio` (width ÷ height).
- `intro`, `mission`, `vision`, `about.heading`, `about.paragraphs`
- `founders[]` — `name`, `role`, `description`, `image` (empty image → a monogram placeholder)
- `contact` and `social` — empty values are hidden; nothing is shown that you didn't configure
- `siteMeta` — page title/description/URL
- `public/brand/favicon.svg`

Content is delivered to the browser by `GET /api/init`. To move it to a CMS or database, replace
`getSiteContent()` in `src/lib/server/content.ts` — no component changes needed.

## Contact form

`POST /api/contact` validates (shared rules in `src/lib/validation/contact.ts`), rate-limits
(5 per 10 minutes per IP, in memory), filters bots with a honeypot, then delivers via:

- **Resend** — `RESEND_API_KEY` + `CONTACT_TO_EMAIL` (+ `CONTACT_FROM_EMAIL`), or
- **Webhook** — `CONTACT_WEBHOOK_URL` (JSON POST).

See `.env.example`. Without either, development appends to `.data/contact-submissions.jsonl` and
production returns a clear 503 so messages are never silently lost. The in-memory rate limiter is
per-instance; use a shared store (Redis/Upstash) on serverless or multi-instance hosting.

## Architecture

```
src/
  app/                 layout, page, API routes (api/init, api/contact)
  config/              site.config.ts (content), animation.config.ts (all timings & budgets), types
  components/          Experience (orchestrator), Stage (chapter mount), SplitWords, ui/Chrome
  sections/            one folder per chapter: loader, theater, antique, decree, about, magic, future, contact
  animations/          GSAP timeline builders per chapter, GLSL shaders, gl/ (three.js scenes), DustField
  hooks/               useGsap (scoped contexts), useChapterTracking
  lib/                 loading/ (LoadingManager + boot tasks), scroll/ (Lenis + ScrollTrigger), gl/ (ShaderCanvas),
                       audio/ (synthesised Web Audio), api/ client, server/ (content, rate limit, delivery),
                       store/ (low-frequency state), textures/ (procedural paper, grain, decree), analytics
  styles/              globals.css (tokens per era), fonts.ts (next/font)
```

### Loading manager
`src/lib/loading/LoadingManager.ts` runs a dependency graph of tasks with weighted progress, per-task
timeouts, and retry of failed tasks only. `boot.ts` registers: environment detection, **backend
`/api/init`**, critical fonts, the **logo image** and company name, founder portraits (non-critical),
procedural textures, and the **three.js modules**. The door opens only after every critical task
succeeds (plus a short presentational beat, `LOADING.minDoorTime`). Any failure shows
**"THE SHOW CANNOT BEGIN"** with a working **Retry**.

### Scroll
Native scrolling remains the source of truth (keyboard, scrollbar, touch and assistive tech all work).
Lenis only smooths wheel input, which turns coarse low-DPI wheel notches into a continuous glide; touch
keeps native momentum. Each chapter is a sticky frame whose GSAP timeline is scrubbed by **normalised
progress** (0 → 1) — no animation depends on precise pixel deltas. Scroll is locked only during the
intro (with a Skip button).

### WebGL — only where it matters
- Curtains (velvet folds, gathering, spring-lagged hem) — raw WebGL fragment shader
- Film damage (grain, scratches, dust, hair, flicker) at projector frame rate — raw WebGL
- King's Order roll — three.js vertex-shader deformation, rendered on demand only
- Snap light burst — raw WebGL, alive ~2.4 s
- 2060 cubes — three.js InstancedMesh, fog, depth of field on capable desktops, adaptive quality

Every WebGL piece has a CSS fallback (`?webgl=off` to test).

### Accessibility
Semantic sections and headings, skip link, keyboard-operable chapter nav, visible focus styles,
screen-reader text for canvas content, labelled form with inline errors and live status.
`prefers-reduced-motion` switches every chapter to calm crossfades (no shake, flicker, burst or
camera moves) and disables smooth scrolling; it also follows OS changes live.

### Audio
Synthesised with Web Audio (no files). Muted by default; the Sound toggle is the user gesture that
enables it.

### Analytics
`track()` in `src/lib/analytics.ts` pushes to `window.dataLayer` and dispatches `site:analytics` DOM
events: loading, intro, chapter views, snap, sound, contact submit/success/error.

## Development switches (ignored in production)

| URL | Effect |
|-----|--------|
| `?debugDelay=4000` | API init waits 4 s (watch the door shake) |
| `?debugFail=fail` | API init fails → error state + Retry |
| `?debugFail=flaky` | fails ~50% of the time (test Retry) |
| `?motion=reduced` | force reduced-motion mode |
| `?webgl=off` | force CSS fallbacks |
| `?quality=low\|medium\|high` | force a performance tier |

`window.__experience` exposes the state store in development.
