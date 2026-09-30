# Storyline & Implementation Guide

This document explains **what the visitor experiences** (the storyline) and **how each moment is built** (the implementation), chapter by chapter. For setup commands see `README.md`.

---

## Part 1 — The storyline

The site tells one continuous story: a company's journey from the past into the year 2060. The visitor is never "on a web page" — they arrive at a theater, watch an old film, step through the company's logo into history, watch that history become the present, and then a single finger snap throws them into the future.

```
THEATER → MOVIE → LOGO → PAST → TRANSFORMATION → PRESENT → MAGIC → FUTURE → CONTACT
```

### Prologue — The closed door (loading)
It is dark. The visitor stands in front of old wooden theater doors under a "NOW SHOWING" marquee. Warm light leaks through the gap and the porthole windows. The doors rattle, and every so often something *thumps* them from inside, shaking dust off the frame.
**Meaning:** something is being prepared behind the door. The site really is loading; the door only opens when it's genuinely ready.
If loading fails, the light behind the door dies and a card reads **"THE SHOW CANNOT BEGIN"** with a **Retry** button.

### Chapter I — The Theater
The shaking stops. A pause. The handles give, the left door swings, then the right, and light floods out. The camera walks through the doorway into a dim picture palace: a gilded arch, red velvet curtains, footlights, rows of empty seats in the foreground. The house lights slowly rise.
After a breath (0.75 s), the heavy curtains part — slowly at first, then with weight, the hems swinging as they settle at the sides.

### Chapter II — The Picture (black & white film)
The house lights dip as the projector starts. The screen stutters and flickers, then light comes up. A classic countdown leader sweeps **3 · 2 · 1**. One dark frame, then the title card: an art-deco frame, the **company logo** fading in out of a soft blur, the **company name** appearing letter by letter, the tagline between two ruled lines. Grain, scratches, dust and gate-weave make it feel like a real reel.
Then the film steadies and **everything holds still**. The introduction is over. A small "SCROLL" cue invites the next chapter.

### Chapter III — The Portal
The visitor scrolls, and the camera moves toward the screen. The seats rush past below; the theater grows until the screen fills the view. The logo grows faster and faster — and inside the logo's own shape, warm parchment appears. The camera passes *through* the logo; a breath of projector light; the old world is gone.
**Meaning:** the company's identity is the doorway into its history.

### Chapter IV — Our Beginnings (the antique page)
Aged, yellowed paper. "Chapter the Fourth", an engraved flourish, the company name in 17th-century type, "Being a true account of our beginnings." As the visitor reads, the words darken like ink soaking into paper, and ornaments draw themselves like pen strokes. The company **introduction**, **mission** and **vision** are set as a printed document.

### Chapter V — The King's Order
A royal decree appears: "BY ROYAL DECREE", the company name, the mission and vision, the founders' names on signature lines, and a red wax seal pressed with the logo.
As the visitor scrolls, the old paper's corners curl, then the whole sheet **rolls up from the bottom into a scroll**, the camera following it. The finished scroll turns and flies away into the distance.

### Transformation — Past to Present
While the scroll recedes, the yellow parchment bleaches to clean modern white and the paper texture fades. A heading appears in antique type inside an ornate double frame, labelled "The Past". Letter by letter, the old letterforms dissolve and modern ones resolve; the ornate frame collapses into a single hairline; the label becomes "The Present".
The heading now reads, in contemporary type: **About the Company**.

### Chapter VI — About Us
A clean, modern editorial page. The company information rises line by line out of invisible masks. Mission and vision reappear, now set in modern type. Then **The founders**: three portraits unveiled by rising clip reveals, names set letter by letter, large outline numerals drifting on their own depth plane. On desktop the founders slide past horizontally like a documentary film strip; on phones they stack.

### Chapter VII — Magic
The page empties. Huge letters rise: **BORING ?** — the question mark lands late, tipping over. Then, in italics: **LET'S DO A MAGIC**. The room holds its breath; the words lift and tighten.
A white-gloved magician's hand rises from the bottom, thumb and middle finger pressed together. It pauses. "Keep scrolling to snap."
**SNAP.** The middle finger slams down; for two frames a motion smear; the hand recoils. From the fingertips: a flash, radial rays of coloured light, sparks and a chromatic shockwave. The white page **tears open** in a growing circle, the letters are blown outward, and behind the tear is a different world.
**Meaning:** the old world ends here. (Scroll back up and the snap reverses.)

### Chapter VIII — 2060
Deep space-blue. Coloured, iridescent cubes float in real 3D depth — near, middle and far — slowly rotating, spinning faster when the visitor scrolls fast. A HUD frames the view: "EPOCH 2060 · ONLINE".
Letters swing up out of depth:
**WELCOME TO — 2060 — ERA OF TECHNOLOGY — AND LIMITLESS POSSIBILITIES.**
Then the headline flies past the camera.

### Chapter IX — Contact
Still inside 2060, a glass panel floats among the cubes, its border traced by travelling light: "Let's build what comes next." The visitor can send a message, or use the configured email, phone, WhatsApp or social links. The footer offers "↑ Back to the beginning."

---

## Part 2 — Implementation guide

### 2.1 Stack
| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Animation | GSAP 3 + ScrollTrigger + SplitText + CustomEase |
| Smooth scroll | Lenis (wheel only; touch keeps native momentum) |
| 3D | three.js (decree roll, cube world) |
| 2D shaders | Raw WebGL (`lib/gl/ShaderCanvas.ts`) — curtains, film damage, snap burst |
| Audio | Web Audio API, synthesised (no audio files) |
| Fonts | `next/font/google`: Cinzel, IM Fell English, EB Garamond, Instrument Serif, Manrope, Unbounded |

### 2.2 Folder map
```
src/
  app/
    layout.tsx, page.tsx          HTML shell, fonts, metadata, <noscript> fallback
    api/init/route.ts             backend initialisation (door waits for it)
    api/contact/route.ts          contact form endpoint
  config/
    site.config.ts                ALL company content (edit this)
    animation.config.ts           ALL timings, scroll ranges, quality budgets
    types.ts                      content types shared by server & client
  components/
    Experience.tsx                orchestrator: boot → door → stage → chrome
    Stage.tsx                     mounts the nine chapters, scroll lock, refresh
    SplitWords.tsx                word splitting for the ink reveal
    ui/Chrome.tsx                 sound toggle, skip intro, scroll cue, chapter nav, grain
  sections/                       one folder per chapter (markup + CSS module)
    loader/  theater/  antique/  decree/  about/  magic/  future/  contact/
  animations/                     timeline builders (no JSX)
    door.ts intro.ts portal.ts antique.ts decree.ts about.ts magic.ts future.ts
    theater.ts                    CurtainController, FilmController
    DustField.ts                  canvas dust particles
    shaders/                      curtain / film / burst fragment shaders
    gl/DecreeRoll.ts, gl/CubeWorld.ts   three.js scenes
  hooks/
    useGsap.ts                    scoped gsap.context per component
    useChapterTracking.ts         active chapter + UI colour tone
  lib/
    loading/                      LoadingManager + boot tasks
    scroll/scrollEngine.ts        Lenis + ScrollTrigger glue, lock/unlock
    store/experienceStore.ts      tiny state store (phases, era, settings)
    gl/                           ShaderCanvas, lazy 3D module loader
    audio/AudioEngine.ts          synthesised sound design
    textures/                     procedural paper, grain, decree canvas
    server/                       content source, rate limit, contact delivery
    api/client.ts, validation/, analytics.ts, events.ts, device.ts, placeholder.ts
  styles/globals.css, styles/fonts.ts
```

### 2.3 Runtime flow
```
page.tsx
 └─ Experience.tsx
     ├─ boot()                         lib/loading/boot.ts → LoadingManager
     │    environment → api(/api/init) → fonts → brand(logo) → portraits
     │    → textures → 3d modules          progress + stage label → store
     ├─ <TheaterDoor/>                 shakes while store.load === "loading"
     │                                 shows error + Retry when "error"
     ├─ <Stage/>  (mounted only after load === "success")
     │    └─ sets stageReady → door opens (after LOADING.minDoorTime)
     └─ UI chrome
```
**Intro phases** (`store.intro`): `door → opening → theater → curtains → film → complete`.
Scroll is locked (`scrollEngine.lock()`) until `complete`, then every chapter is driven by scroll.
**Skip intro** sets `introSkipped`; `TheaterStage` jumps every intro timeline to its final frame.

### 2.4 State & events
- `lib/store/experienceStore.ts` holds **low-frequency** state only: load status, intro phase, `era` (`past`/`future`), tone, active chapter, sound, reduced motion, quality tier, WebGL support. React reads it with `useExperience(selector)`; animation code uses `watchExperience()`.
- Per-frame values (scroll progress, uniforms, spring physics) never touch React. They live in refs, GSAP targets and plain objects.
- `lib/events.ts` carries one-shot cues: `door:dolly` (door → theater camera hand-off), `snap:impact` (snap origin → cube spawn), `snap:reverse`.

### 2.5 Scroll engine
- Native document scroll stays the source of truth (keyboard, scrollbar, touch and screen readers all work).
- Lenis (`SCROLL.lerp = 0.085`) interpolates **wheel** input only, which smooths coarse low-DPI mouse notches. Touch uses native momentum.
- Each chapter is a tall `<section>` with a `position: sticky` 100vh frame. A GSAP timeline normalised to length 1 is scrubbed by `ScrollTrigger` from `top top` to `bottom bottom` (`SCROLL.scrub = 0.45` s catch-up). Animations therefore respond to **normalised progress 0→1**, never to pixel deltas.
- Chapter heights (vh) are in `CHAPTER_HEIGHT`; progress ranges per chapter are in `PORTAL`, `DECREE`, `MAGIC`, `FUTURE`.
- A ResizeObserver on `<main>` re-runs `ScrollTrigger.refresh()` whenever page height changes.

### 2.6 Chapter-by-chapter implementation

#### Loading door — `sections/loader/TheaterDoor.tsx`, `animations/door.ts`
- **Real loading:** `LoadingManager` runs a dependency graph of tasks with weights, per-task timeouts (15 s) and retry of failed tasks only. Critical tasks: environment, `/api/init`, fonts, logo, textures, 3D modules. Founder portraits are non-critical.
- **Wall with a hole:** the doorway's `box-shadow: 0 0 0 300vmax` *is* the wall, so the doorway stays transparent and the real theater shows through when the doors open.
- **Shake:** `startDoorShake()` combines a continuous value-noise rattle (on the GSAP ticker) with random "thumps" every 1.2–2.6 s that push the doors ajar, flare the seam light and trigger `DustField.burst()`.
- **Open:** `createDoorOpen()` settles, pauses, depresses the handles, swings each leaf with a custom `hinge` ease, then scales the camera 3.6× through the doorway while emitting `door:dolly`, so the theater scales from 0.72→1 at the same time (parallax).
- Error: shake stops, light stutters out, focus moves to **Retry**, which calls `retryBoot()`.

#### I–III Theater, film, portal — `sections/theater/*`, `animations/{theater,intro,portal}.ts`
- **Curtains:** `shaders/curtain.frag.ts` renders velvet in "cloth space": opening moves the hem toward the wings, so the same folds pack tighter and deepen (gathering). The bottom hem follows the top through a damped spring in `CurtainController` for weighty secondary motion. Includes valance, gold fringe and a contact shadow. CSS fallback without WebGL.
- **Film:** `shaders/film.frag.ts` draws grain, scratches, dust, hair, vignette and flicker as a premultiplied overlay at 18 fps (`FILM.fps`). `FilmController.stop()` freezes a clean frame for the still hold. The countdown sweep is a `conic-gradient` driven by a CSS variable.
- **Title card:** `FilmTitle.tsx`. The container uses `cq*` units so it scales with the screen. Name letters are individual spans for the stagger.
- **Portal:** `createPortal()` is built only after the intro completes, with explicit from-values so scrolling back restores the held frame.
  1. The world scales to fill the viewport and translates so the screen is centred. Seats move faster (nearest plane).
  2. The logo scales exponentially (`expo.in`, max 24×) so the approach reads as constant speed.
  3. The parchment layer is masked with **the logo image itself** (`mask-image: url(logo)`), with size and position synced every frame to the logo's on-screen rect, plus a growing radial iris that guarantees full coverage for any logo shape.
  4. Once the iris covers the screen, the giant logo layer and the theater are hidden (a GPU-memory safeguard).

#### IV Antique page — `sections/antique/*`, `animations/antique.ts`
- Background `.parchment-bg` (global CSS) is shared with the portal layer so the join is invisible. The paper texture is procedural (`lib/textures/procedural.ts`).
- Ink reveal: words darken from faint to full ink (opacity + colour only, cheap). Ornaments draw via `stroke-dashoffset`.

#### V King's Order + transformation — `sections/decree/*`, `animations/decree.ts`, `gl/DecreeRoll.ts`
- The decree sheet is painted on a canvas (`lib/textures/decreeTexture.ts`): borders, flourishes, auto-fitted text, founder signature lines and a wax seal with the logo tinted into it. A screen-reader copy of the text is in the DOM.
- `DecreeRoll` uses a plane with 24×220 segments. Its vertex shader curls the corners, then wraps everything below a moving roll line around a spiral cylinder (radius grows per turn, so there's no z-fighting). The fragment shader shows the back of the paper on the outside of the roll and casts a contact shadow. It renders **only when scroll changes**.
- The same timeline fades the parchment layer to white and runs the heading morph: two stacked layers (IM Fell antique / Instrument Serif modern), cross-dissolved letter by letter. The ornate frame collapses and a hairline draws in.

#### VI About — `sections/about/*`, `animations/about.ts`
- Paragraphs: `SplitText` lines with `mask: "lines"`, `autoSplit` (re-splits on resize/font changes).
- Founders on desktop (≥900px): the track translates horizontally inside a sticky frame. Each card's reveals use `containerAnimation` so they trigger by horizontal position. Below 900px: vertical triggers, zig-zag layout.
- Pointer tilt (`attachTilt`) uses interpolated `quickTo`, only on fine pointers.
- An empty `image` renders a monogram placeholder marked `[FOUNDER PHOTO]`.

#### VII Magic — `sections/magic/*`, `animations/magic.ts`
- The build-up (statement, anticipation, hand rise) is **scroll-scrubbed**.
- The hand is an SVG glove with jointed fingers (`Hand.tsx`). `HandRig` writes rotations straight to each joint's `transform` attribute. Poses: `POSE_READY → POSE_TENSE → POSE_SNAPPED`.
- The snap is **time-based** (a snap can't be scrubbed). It plays when progress crosses `MAGIC.snapAt` (0.7) and reverses below 0.65 (hysteresis). At impact:
  - `era → "future"`
  - `SnapBurst` shader (flash, rays, chromatic ring, sparks) starts from the fingertip point (computed with `getScreenCTM`)
  - the white paper gets a growing hole via a radial `mask-image`. The ring radius in the shader and the mask radius come from the **same tweened value**, so the energy wave and the world change stay in sync.
  - letters are blown outward from the origin.
- Letters are double-wrapped so the scroll timeline and the snap timeline never animate the same element.

#### VIII 2060 — `sections/future/*`, `animations/future.ts`, `gl/CubeWorld.ts`
- `FutureBackdrop` is a fixed full-screen layer (behind chapters VIII–IX), hidden and not rendering until `era === "future"`.
- `CubeWorld`: one `InstancedMesh` of rounded cubes (MeshPhysical with clearcoat + iridescence, RoomEnvironment reflections), wireframe "blueprint" cubes, star particles, fog, and three coloured point lights. Cubes sit in foreground, midground and background bands, with a clear corridor along the camera path. They spawn outward from the snap point with an ease-out-back.
- The camera travels forward with scroll (`FUTURE.cameraTravel`), spin reacts to scroll velocity, and the pointer adds lerped parallax.
- Depth of field (BokehPass) only on the `high` tier. **Adaptive quality:** if the average frame exceeds 22 ms, DoF is dropped; if it exceeds 26 ms, the pixel ratio drops to 1. Paused when the tab is hidden. CSS 3D cubes as fallback.
- Typography: characters rotate up from `rotationX: -95`, `z: -160` with blur, staggered per line; the headline flies past the camera at the end.

#### IX Contact — `sections/contact/*`, `api/contact/route.ts`
- Channels are built only from `contact`/`social` config. Empty values are hidden; in development a dashed note says none are configured.
- Form: shared validation (`lib/validation/contact.ts`) on blur and submit, `aria-invalid` + described-by errors, focus moves to the first invalid field, live status, honeypot field, success state with "Send another message".
- Server: JSON only, 16 KB body cap, rate limit 5 per 10 min per IP (in-memory), sanitising, then delivery via Resend or a webhook (`.env`). With neither configured: a dev file log in development, a clear 503 in production.

### 2.7 Customising
| To change… | Edit |
|---|---|
| Company name, tagline, year, logo, intro, mission, vision, about, founders, contact, social, SEO | `src/config/site.config.ts` |
| Any duration, delay, scroll range, chapter length, particle/cube counts, quality tiers | `src/config/animation.config.ts` |
| Colours per era | `src/styles/globals.css` (`:root` tokens) |
| Fonts | `src/styles/fonts.ts` |
| Content source (CMS/database) | `getSiteContent()` in `src/lib/server/content.ts` |
| Contact delivery | `.env` (see `.env.example`), `src/lib/server/contactDelivery.ts` |
| Chapter order / adding a chapter | `src/components/Stage.tsx`, `CHAPTERS` in `animation.config.ts` |

**Logo rules:** it must be a same-origin file in `public/brand/` (it's used as a CSS mask), ideally SVG or transparent PNG. Set `logo.aspectRatio` to width ÷ height.

**Adding a chapter:** create `sections/<name>/<Name>.tsx` with a tall `<section data-tone="…">` and a sticky inner frame, build its timeline in `animations/<name>.ts` with a `ScrollTrigger` scrubbed from `top top` to `bottom bottom`, add a `data-chapter` marker, register it in `CHAPTERS`, and mount it in `Stage.tsx`.

### 2.8 Accessibility & reduced motion
- Semantic sections and headings; `h1` is the company name on the title card. The skip link goes to contact; the chapter nav is keyboard operable; focus styles are visible.
- Canvas content has DOM text equivalents (decree, film title, headline `aria-label`s).
- `prefers-reduced-motion` (or `?motion=reduced`): no door shake, no flicker, no burst, no camera moves; chapters become calm crossfades, Lenis is disabled, and cubes barely rotate. OS changes are followed live.

### 2.9 Performance notes
- WebGL is used only for curtains, film, decree roll, snap burst and cubes. Every renderer stops when idle (film freezes, decree renders on demand, burst lives ~2.4 s, cubes run only in the future era).
- Quality tier (`lib/device.ts`) sets DPR caps, cube/star/mote counts and DoF.
- Never animate `filter` on elements that get scaled large (see the portal logo). Keep filters static or on small elements.
- 3D modules are code-split and preloaded during the door phase.

### 2.10 Testing switches (development only)
| URL | Effect |
|---|---|
| `?debugDelay=4000` | `/api/init` waits 4 s (watch the door shake) |
| `?debugFail=fail` / `?debugFail=flaky` | init fails always / ~50% (test the error card and Retry) |
| `?motion=reduced` | force reduced motion |
| `?webgl=off` | force CSS fallbacks |
| `?quality=low\|medium\|high` | force a quality tier |

`window.__experience` exposes the state store in the browser console (development only), e.g. `__experience.set({ introSkipped: true })`.

### 2.11 Build & deploy
```bash
npm install
npm run dev        # development
npm run build      # production build (type-checks)
npm start          # serve the build
```
Deploy to any Node host or Vercel. Set the contact environment variables there. On serverless or multi-instance hosting, replace the in-memory rate limiter with a shared store.
