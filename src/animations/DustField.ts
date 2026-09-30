/**
 * Lightweight Canvas2D dust: ambient motes drifting in light, plus falling
 * bursts (dust shaken off the door lintel). Pauses itself when idle.
 */

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  life: number;
  maxLife: number;
  falling: boolean;
  phase: number;
}

export interface DustOptions {
  ambient: number;
  /** rgb triplet, e.g. "255, 214, 160". */
  color: string;
  /** Optional mask: returns 0..1 visibility of a mote at (x, y) in CSS px (e.g. inside a light beam). */
  lightAt?: (x: number, y: number, w: number, h: number) => number;
}

export class DustField {
  private ctx: CanvasRenderingContext2D;
  private motes: Mote[] = [];
  private raf = 0;
  private last = 0;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private ro: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: DustOptions,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    for (let i = 0; i < opts.ambient; i++) this.motes.push(this.ambientMote(true));
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = this.canvas.clientWidth || 1;
    this.h = this.canvas.clientHeight || 1;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  private ambientMote(randomAge: boolean): Mote {
    const maxLife = 6 + Math.random() * 8;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.3) * 5,
      r: 0.5 + Math.random() * 1.4,
      a: 0.25 + Math.random() * 0.6,
      life: randomAge ? Math.random() * maxLife : 0,
      maxLife,
      falling: false,
      phase: Math.random() * Math.PI * 2,
    };
  }

  /** Dust falling from a horizontal edge (x..x+width at y), in CSS px. */
  burst(x: number, y: number, width: number, count: number) {
    for (let i = 0; i < count; i++) {
      const maxLife = 1.2 + Math.random() * 1.6;
      this.motes.push({
        x: x + Math.random() * width,
        y: y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 14,
        vy: 10 + Math.random() * 30,
        r: 0.4 + Math.random() * 1.3,
        a: 0.35 + Math.random() * 0.5,
        life: 0,
        maxLife,
        falling: true,
        phase: Math.random() * 6,
      });
    }
    this.start();
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.step(dt, now / 1000);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private step(dt: number, t: number) {
    const { ctx, dpr, w, h } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const color = this.opts.color;

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.life += dt;
      if (m.falling) {
        m.vy += 40 * dt;
        m.vx += Math.sin(t * 3 + m.phase) * 8 * dt;
      } else {
        m.vx += Math.sin(t * 0.6 + m.phase) * 0.8 * dt;
        m.vy += Math.cos(t * 0.5 + m.phase) * 0.6 * dt;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      if (m.life > m.maxLife || m.y > h + 10 || m.x < -10 || m.x > w + 10) {
        if (m.falling) this.motes.splice(i, 1);
        else this.motes[i] = this.ambientMote(false);
        continue;
      }
      const lifeFade = Math.sin((m.life / m.maxLife) * Math.PI);
      const light = this.opts.lightAt ? this.opts.lightAt(m.x, m.y, w, h) : 1;
      const twinkle = 0.7 + 0.3 * Math.sin(t * 2 + m.phase);
      const alpha = m.a * lifeFade * light * twinkle;
      if (alpha < 0.02) continue;
      ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.motes = [];
  }
}
