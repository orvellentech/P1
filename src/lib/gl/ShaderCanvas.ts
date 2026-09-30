/**
 * Minimal full-screen fragment-shader renderer (raw WebGL 1).
 * Used for 2D effects — curtains, film damage, the snap burst — where a
 * whole 3D engine would be overkill. Renders on demand or in a throttled loop.
 */

type UniformValue = number | [number, number] | [number, number, number];

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export interface ShaderCanvasOptions {
  dpr?: number;
  uniforms?: Record<string, UniformValue>;
  onContextLost?: () => void;
}

export class ShaderCanvas {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private values = new Map<string, UniformValue>();
  private raf = 0;
  private lastFrame = 0;
  private ro: ResizeObserver;
  private disposed = false;
  private dpr: number;
  width = 1;
  height = 1;

  constructor(
    readonly canvas: HTMLCanvasElement,
    fragment: string,
    opts: ShaderCanvasOptions = {},
  ) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    this.dpr = opts.dpr ?? 1;
    this.program = this.link(VERT, fragment);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(this.program);
    gl.disable(gl.DEPTH_TEST);

    for (const [k, v] of Object.entries(opts.uniforms ?? {})) this.set(k, v);

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.stop();
      opts.onContextLost?.();
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  private compile(type: number, src: string) {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return sh;
  }

  private link(vs: string, fs: string) {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Program link failed: ${gl.getProgramInfoLog(p)}`);
    return p;
  }

  setDpr(dpr: number) {
    this.dpr = dpr;
    this.resize();
  }

  resize() {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    // getBoundingClientRect includes CSS transforms; use layout size instead.
    const w = this.canvas.clientWidth || rect.width;
    const h = this.canvas.clientHeight || rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.dpr;
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    if (W !== this.canvas.width || H !== this.canvas.height) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.width = W;
    this.height = H;
    this.gl.viewport(0, 0, W, H);
    this.set("uRes", [W, H]);
    this.render();
  }

  set(name: string, value: UniformValue) {
    this.values.set(name, value);
  }

  private upload() {
    const gl = this.gl;
    for (const [name, v] of this.values) {
      if (!this.locations.has(name)) this.locations.set(name, gl.getUniformLocation(this.program, name));
      const loc = this.locations.get(name);
      if (!loc) continue;
      if (typeof v === "number") gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else gl.uniform3f(loc, v[0], v[1], v[2]);
    }
  }

  render() {
    if (this.disposed || this.gl.isContextLost()) return;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.upload();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Runs `onFrame` then renders, capped at `fps`. */
  start(onFrame: (time: number, dt: number) => void, fps = 60) {
    this.stop();
    const interval = 1000 / fps;
    let prev = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (now - this.lastFrame < interval - 1) return;
      this.lastFrame = now;
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      onFrame(now / 1000, dt);
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  get running() {
    return this.raf !== 0;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.ro.disconnect();
    // Free GPU objects but keep the context alive: React may re-mount onto the
    // same <canvas> (Strict Mode / Fast Refresh), and a lost context can't be recovered.
    this.gl.deleteProgram(this.program);
  }
}
