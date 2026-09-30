import { ShaderCanvas } from "@/lib/gl/ShaderCanvas";
import { curtainFrag } from "@/animations/shaders/curtain.frag";
import { filmFrag } from "@/animations/shaders/film.frag";
import { THEATER, FILM } from "@/config/animation.config";

/**
 * Curtain state machine. `openTop` is driven by GSAP (the fly-system pull);
 * `openBottom` follows through a damped spring so the heavy hem lags,
 * overshoots slightly and settles — secondary motion that sells the weight.
 */
export class CurtainController {
  openTop = 0;
  openBottom = 0;
  light = 0.12;
  private vel = 0;
  private shader: ShaderCanvas | null = null;
  private raf = 0;
  private last = 0;
  private idleFor = 0;

  constructor(
    canvas: HTMLCanvasElement | null,
    dpr: number,
    private fallback: { left: HTMLElement; right: HTMLElement } | null,
    onFail: () => void,
  ) {
    if (canvas) {
      try {
        this.shader = new ShaderCanvas(canvas, curtainFrag, {
          dpr,
          uniforms: { uOpenTop: 0, uOpenBottom: 0, uLight: this.light, uValance: 0.13, uTime: 0 },
          onContextLost: onFail,
        });
      } catch (err) {
        console.warn("[curtains] WebGL unavailable, using CSS fallback", err);
        this.shader = null;
        onFail();
      }
    }
    this.apply();
  }

  get usingWebGL() {
    return !!this.shader;
  }

  private apply() {
    if (this.shader) {
      this.shader.set("uOpenTop", this.openTop);
      this.shader.set("uOpenBottom", this.openBottom);
      this.shader.set("uLight", this.light);
      this.shader.render();
    } else if (this.fallback) {
      const o = this.openBottom * 0.5 + this.openTop * 0.5;
      this.fallback.left.style.transform = `translateX(${-o * 84}%) scaleX(${1 - o * 0.55})`;
      this.fallback.right.style.transform = `translateX(${o * 84}%) scaleX(${1 - o * 0.55})`;
      this.fallback.left.style.filter = this.fallback.right.style.filter = `brightness(${0.3 + this.light * 0.8})`;
    }
  }

  /** Call whenever a driven value changes; runs the spring until it settles. */
  wake() {
    this.idleFor = 0;
    if (this.raf) return;
    this.last = performance.now();
    const { stiffness, damping } = THEATER.curtainSpring;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      const acc = stiffness * (this.openTop - this.openBottom) - damping * this.vel;
      this.vel += acc * dt;
      this.openBottom += this.vel * dt;
      this.apply();
      const settled = Math.abs(this.openTop - this.openBottom) < 0.0005 && Math.abs(this.vel) < 0.0005;
      this.idleFor = settled ? this.idleFor + dt : 0;
      if (this.idleFor > 0.4) {
        this.raf = 0;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Jump to a state instantly (skip intro / reduced motion). */
  snapTo(open: number, light: number) {
    this.openTop = this.openBottom = open;
    this.vel = 0;
    this.light = light;
    this.apply();
  }

  resize() {
    this.shader?.resize();
    this.apply();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.shader?.dispose();
  }
}

/**
 * Projector: film damage shader + gate weave at the projector frame rate.
 * `stop()` freezes the last frame — the "static hold" after the titles.
 */
export class FilmController {
  intensity = 1;
  flickerAmp = 0;
  weaveAmp = 1;
  vignette = 1;
  private shader: ShaderCanvas | null = null;
  private frame = 0;
  private fallbackRaf = 0;
  private running = false;

  constructor(
    canvas: HTMLCanvasElement | null,
    private weaveEl: HTMLElement,
    private fallbackEl: HTMLElement | null,
  ) {
    if (canvas) {
      try {
        this.shader = new ShaderCanvas(canvas, filmFrag, { dpr: 0.75, uniforms: { uFrame: 0, uIntensity: 1, uFlicker: 0, uVignette: 1 } });
      } catch {
        this.shader = null;
      }
    }
  }

  private step() {
    this.frame++;
    const flicker = this.flickerAmp * (Math.random() < 0.18 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.25);
    // Gate weave: small, frame-locked jitter; occasional vertical slip.
    const slip = Math.random() < 0.02 ? (Math.random() - 0.5) * 6 : 0;
    const wx = (Math.random() - 0.5) * 1.2 * this.weaveAmp;
    const wy = ((Math.random() - 0.5) * 1.6 + slip) * this.weaveAmp;
    this.weaveEl.style.transform = `translate3d(${wx.toFixed(2)}px, ${wy.toFixed(2)}px, 0)`;
    if (this.shader) {
      this.shader.set("uFrame", this.frame);
      this.shader.set("uIntensity", this.intensity);
      this.shader.set("uFlicker", flicker);
      this.shader.set("uVignette", this.vignette);
    } else if (this.fallbackEl) {
      this.fallbackEl.style.opacity = String(0.35 * this.intensity + flicker);
      this.fallbackEl.style.backgroundPosition = `${Math.floor(Math.random() * 180)}px ${Math.floor(Math.random() * 180)}px`;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.shader) {
      this.shader.start(() => this.step(), FILM.fps);
    } else {
      let last = 0;
      const loop = (now: number) => {
        this.fallbackRaf = requestAnimationFrame(loop);
        if (now - last < 1000 / FILM.fps) return;
        last = now;
        this.step();
      };
      this.fallbackRaf = requestAnimationFrame(loop);
    }
  }

  /** Freeze on a clean frame. */
  stop() {
    this.running = false;
    this.shader?.stop();
    cancelAnimationFrame(this.fallbackRaf);
    this.weaveEl.style.transform = "translate3d(0,0,0)";
    if (this.shader) {
      this.shader.set("uFlicker", 0);
      this.shader.set("uIntensity", this.intensity);
      this.shader.set("uVignette", this.vignette);
      this.shader.render();
    }
  }

  get isRunning() {
    return this.running;
  }

  resize() {
    this.shader?.resize();
  }

  dispose() {
    this.stop();
    this.shader?.dispose();
  }
}
