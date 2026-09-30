/**
 * The snap: flash, volumetric radial rays, a chromatic shockwave ring and
 * sparks, all radiating from the fingertips. uRing is driven by the same
 * GSAP tween as the CSS clip-path that reveals the future world, so the
 * energy wave and the world change stay perfectly in sync.
 */
export const burstFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uOrigin;   // px, top-left origin
uniform float uT;       // seconds since impact
uniform float uRing;    // ring radius, px
uniform float uAmount;  // master fade

float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 d = p - uOrigin;
  float dist = length(d);
  float diag = length(uRes);
  float nd = dist / diag;
  float ang = atan(d.y, d.x);
  float t = uT;

  // Flash core.
  float flash = exp(-nd * 9.0) * exp(-t * 4.0) * 1.6 + exp(-t * 7.0) * 0.55;

  // Rays: two layers of angular noise, extending outward with time.
  float a1 = noise1(ang * 9.0 + 3.0 + t * 0.4);
  float a2 = noise1(ang * 23.0 - t * 0.8);
  float rays = pow(a1, 3.0) * 0.8 + pow(a2, 6.0) * 0.6;
  float reach = smoothstep(0.0, 0.35, t) * 1.2;
  rays *= exp(-nd / max(0.001, reach * 0.35)) * exp(-t * 0.9);
  vec3 rayCol = mix(vec3(1.0, 0.95, 0.85), spectrum(ang / 6.28318 + t * 0.15), 0.55);

  // Shockwave ring with chromatic separation.
  float w = 6.0 + 30.0 * (uRing / diag);
  vec3 ring;
  ring.r = exp(-pow((dist - uRing - 6.0) / w, 2.0));
  ring.g = exp(-pow((dist - uRing) / w, 2.0));
  ring.b = exp(-pow((dist - uRing + 6.0) / w, 2.0));
  ring *= exp(-t * 0.8) * 0.9;

  // Sparks.
  vec3 sparks = vec3(0.0);
  for (int i = 0; i < 36; i++) {
    float fi = float(i);
    float sa = hash(fi * 7.1) * 6.28318;
    float sp = (0.18 + 0.5 * hash(fi * 3.3)) * diag;
    float life = 0.6 + 0.9 * hash(fi * 5.7);
    if (t > life) continue;
    vec2 sd = vec2(cos(sa), sin(sa));
    float travel = sp * (1.0 - exp(-t * 2.2)) / 2.2;
    vec2 sPos = uOrigin + sd * travel + vec2(0.0, 60.0 * t * t);
    float sDist = length(p - sPos);
    float fade = 1.0 - t / life;
    sparks += spectrum(hash(fi) + 0.1) * exp(-sDist * 0.35) * fade * 1.4;
  }

  vec3 col = vec3(flash) + rayCol * rays + ring + sparks;
  col *= uAmount;
  float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;
