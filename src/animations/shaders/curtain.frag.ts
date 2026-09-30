/**
 * Heavy velvet stage curtains + valance.
 *
 * The cloth is modelled in "cloth space" u ∈ [0,1] (outer edge → inner hem).
 * Opening moves the hem toward the wings; the same number of folds is then
 * packed into less screen width, so folds deepen and tighten — the gathering
 * look of real traveller curtains. The hem's bottom follows the top through
 * a spring (uOpenBottom) for secondary, weighty motion.
 */
export const curtainFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uOpenTop;
uniform float uOpenBottom;
uniform float uLight;
uniform float uValance;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

const vec3 VELVET_DEEP = vec3(0.10, 0.004, 0.012);
const vec3 VELVET_MID  = vec3(0.42, 0.03, 0.05);
const vec3 VELVET_HI   = vec3(0.78, 0.16, 0.14);
const vec3 GOLD_LO     = vec3(0.35, 0.22, 0.06);
const vec3 GOLD_HI     = vec3(0.95, 0.76, 0.38);

// Stage lighting: a warm spot pooled at centre-stage plus general house light.
float lightAt(vec2 uv) {
  vec2 d = (uv - vec2(0.5, 0.42)) * vec2(1.25, 1.0);
  float pool = exp(-dot(d, d) * 3.2);
  return uLight * (0.22 + 0.95 * pool);
}

vec3 shadeVelvet(float slope, float h, float uvY, vec2 uv, float micro) {
  vec3 n = normalize(vec3(-slope, 0.0, 1.0));
  vec3 L = normalize(vec3((0.5 - uv.x) * 0.9, 0.55, 0.85));
  float diff = max(dot(n, L), 0.0);
  // Velvet: pile catches light at grazing angles (bright fold ridges' flanks).
  float sheen = pow(1.0 - n.z, 1.6);
  float ao = mix(0.45, 1.0, clamp((h + 1.3) / 2.6, 0.0, 1.0));
  vec3 col = mix(VELVET_DEEP, VELVET_MID, diff * ao);
  col += VELVET_HI * sheen * 0.55 * ao;
  col *= 0.85 + micro * 0.3;
  return col * lightAt(uv) * (0.75 + 0.35 * uvY);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float micro = noise(uv * vec2(420.0, 900.0));

  // ---- Valance (fixed pelmet across the top) ----
  float scallop = abs(sin(uv.x * 3.14159 * 7.0));
  float valanceEdge = 1.0 - uValance + 0.035 * (1.0 - scallop);
  if (uv.y > valanceEdge) {
    float yy = (uv.y - valanceEdge) / uValance;
    float ph = uv.x * 90.0 + sin(uv.x * 22.0) * 1.2;
    float h = sin(ph) * 0.4 + sin(yy * 6.2831 * 1.5 + uv.x * 44.0) * 0.6;
    float slope = cos(ph) * 0.25 * (1.0 - yy) + cos(yy * 9.4 + uv.x * 44.0) * 0.35;
    vec3 col = shadeVelvet(slope, h, 1.0, uv, micro) * 0.9;
    // Gold braid near the scalloped hem.
    float braid = smoothstep(0.0, 0.012, uv.y - valanceEdge) * (1.0 - smoothstep(0.012, 0.03, uv.y - valanceEdge));
    float twist = 0.5 + 0.5 * sin(uv.x * uRes.x * 0.35);
    col = mix(col, mix(GOLD_LO, GOLD_HI, twist) * lightAt(uv) * 1.2, braid);
    gl_FragColor = vec4(col, 1.0);
    return;
  }
  // Tassel fringe hanging under the valance.
  float fringeY = valanceEdge - uv.y;
  if (fringeY < 0.03) {
    float strand = step(0.45, fract(uv.x * uRes.x / 5.0));
    float len = 0.018 + 0.012 * scallop;
    if (fringeY < len && strand > 0.5) {
      vec3 g = mix(GOLD_LO, GOLD_HI, 0.5 + 0.5 * sin(uv.x * 800.0)) * lightAt(uv) * (1.0 - fringeY / len * 0.6);
      gl_FragColor = vec4(g, 1.0);
      return;
    }
  }

  // ---- Main traveller curtains ----
  bool left = uv.x < 0.5;
  float x = left ? uv.x : 1.0 - uv.x;
  float open = mix(uOpenBottom, uOpenTop, pow(clamp(uv.y, 0.0, 1.0), 0.65));
  float closedEdge = 0.506;
  float gathered = 0.085;
  float edge = mix(closedEdge, gathered, open);
  // Hem bows slightly while moving.
  edge += 0.012 * sin(uv.y * 3.14159) * (uOpenTop - uOpenBottom) * 4.0;

  if (x > edge) {
    // Soft contact shadow the curtain casts on the screen behind.
    float d = (x - edge) * aspect;
    float sh = 0.6 * exp(-d * 18.0) * (1.0 - open * 0.3);
    gl_FragColor = vec4(0.0, 0.0, 0.0, sh);
    return;
  }

  float u = x / edge;
  float compression = closedEdge / edge;
  float folds = 8.5;
  float ph = u * folds * 6.28318 + 0.9 * sin(u * 13.0 + 1.3) + (1.0 - uv.y) * 0.9 * u;
  float h = sin(ph) + 0.3 * sin(2.0 * ph + 0.7);
  float dh = cos(ph) + 0.6 * cos(2.0 * ph + 0.7);
  float depth = mix(0.55, 1.35, clamp((compression - 1.0) / 3.5, 0.0, 1.0));
  float slope = dh * depth * (left ? 1.0 : -1.0);

  vec3 col = shadeVelvet(slope, h * depth, uv.y, uv, micro);

  // Rolled inner hem and weighted bottom hem.
  col *= mix(1.0, 0.55, smoothstep(0.965, 1.0, u));
  col *= mix(0.6, 1.0, smoothstep(0.0, 0.04, uv.y));
  float hemBand = smoothstep(0.012, 0.018, uv.y) * (1.0 - smoothstep(0.03, 0.036, uv.y));
  col = mix(col, mix(GOLD_LO, GOLD_HI, 0.5 + 0.5 * sin(ph * 2.0)) * lightAt(uv), hemBand * 0.85);

  gl_FragColor = vec4(col, 1.0);
}`;
