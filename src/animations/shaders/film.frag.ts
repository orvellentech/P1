/**
 * Projected film damage overlay: grain, vertical scratches, dust, hair,
 * vignette and projector flicker. Output is premultiplied so it can both
 * lighten and darken the DOM title card beneath without blend modes.
 * uFrame advances at the projector's frame rate, not the display's.
 */
export const filmFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uFrame;
uniform float uIntensity;
uniform float uFlicker;
uniform float uVignette;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  float f = floor(uFrame);
  float aspect = uRes.x / uRes.y;

  // Grain — clumped at ~2px like silver halide.
  vec2 gp = floor(uv * uRes / 2.0);
  float g = hash(gp + f * 17.13) * 2.0 - 1.0;
  g *= 0.2 * uIntensity;

  // Vertical scratches that persist for a few frames and wander slightly.
  float light = 0.0;
  float dark = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float seed = floor(f / (3.0 + fi * 2.0)) + fi * 31.0;
    float present = step(0.5, hash(vec2(seed, 9.1)));
    float x0 = 0.08 + 0.84 * hash(vec2(seed, 1.7));
    x0 += 0.003 * sin(uv.y * 14.0 + seed);
    float w = (0.6 + 1.2 * hash(vec2(seed, 4.4))) / uRes.x;
    float line = 1.0 - smoothstep(w * 0.4, w, abs(uv.x - x0));
    float broken = step(0.3, hash(vec2(seed, floor(uv.y * 5.0 + seed))));
    float s = present * line * broken * uIntensity;
    if (hash(vec2(seed, 2.2)) > 0.35) light += s * 0.55; else dark += s * 0.5;
  }

  // Dust specks (dark) and emulsion holes (light).
  vec2 grid = vec2(22.0, 14.0);
  vec2 cell = floor(uv * grid);
  float r = hash(cell + f * 1.37);
  vec2 c = (cell + vec2(hash(cell + f), hash(cell - f + 3.1))) / grid;
  float d = length((uv - c) * vec2(aspect, 1.0));
  float size = 0.0012 + 0.003 * hash(cell * 1.7 + f);
  float speck = step(0.992, r) * (1.0 - smoothstep(size * 0.5, size, d)) * uIntensity;
  if (hash(cell + f * 3.3) > 0.5) dark += speck * 0.85; else light += speck * 0.6;

  // Occasional hair caught in the gate.
  float hs = floor(f / 9.0);
  if (hash(vec2(hs, 7.7)) > 0.72) {
    vec2 hc = vec2(hash(vec2(hs, 1.0)), hash(vec2(hs, 2.0)));
    vec2 q = (uv - hc) * vec2(aspect, 1.0);
    float curve = q.y - 0.8 * q.x * q.x * (hash(vec2(hs, 3.0)) - 0.5) * 8.0;
    float hair = (1.0 - smoothstep(0.0008, 0.0022, abs(curve))) * step(abs(q.x), 0.06);
    dark += hair * 0.7 * uIntensity;
  }

  // Vignette + flicker.
  vec2 v = (uv - 0.5) * vec2(1.0, 1.08);
  float vig = smoothstep(0.3, 0.78, length(v)) * uVignette;
  dark += vig * 0.75 + uFlicker;
  // Grain mostly darkens (silver in the emulsion), with softer highlights.
  light += max(g, 0.0) * 0.5;
  dark += max(-g, 0.0);

  float a = clamp(dark + light, 0.0, 1.0);
  gl_FragColor = vec4(vec3(clamp(light, 0.0, 1.0)), a);
}`;
