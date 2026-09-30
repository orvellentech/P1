import * as THREE from "three";

/**
 * The King's Order: a parchment sheet that bends, curls at the corners, then
 * rolls up from the bottom into a scroll (vertex-shader deformation of a
 * finely subdivided plane). Rendered on demand — only when the scroll
 * position changes — so it costs nothing while idle.
 */

const vertex = /* glsl */ `
uniform float uRollY;
uniform float uRadius;
uniform float uCurl;
uniform float uW;
uniform float uH;
varying vec2 vUv;
varying vec3 vNormal;
varying float vRolled;
varying float vFlatY;
varying float vCurlShade;

void main() {
  vUv = uv;
  vec3 p = position;
  vec3 n = vec3(0.0, 0.0, 1.0);
  float bx = p.x / (uW * 0.5);
  float by = (p.y + uH * 0.5) / uH;

  // Pre-roll: corners lift and the sheet bows, like old paper that wants to curl.
  float cornerB = pow(abs(bx), 3.0) * pow(1.0 - by, 2.5);
  float cornerT = pow(abs(bx), 3.0) * pow(by, 3.0);
  float bow = 1.0 - bx * bx;
  float lift = uCurl * uW * (cornerB * 0.26 + cornerT * 0.08 + bow * 0.03);
  p.z += lift;
  vCurlShade = uCurl * (cornerB + cornerT * 0.4);
  // Approximate normal tilt from the curl gradient.
  n = normalize(vec3(-sign(bx) * uCurl * cornerB * 0.9, uCurl * cornerB * 0.6, 1.0));

  vFlatY = p.y;
  vRolled = 0.0;

  // Roll: material below the roll line wraps around a cylinder in front of the sheet.
  float d = uRollY - p.y;
  if (d > 0.0) {
    float theta = d / uRadius;
    float r = uRadius + 0.0035 * theta; // paper thickness → spiral, no z-fighting between turns
    p.y = uRollY - r * sin(theta);
    p.z = r * (1.0 - cos(theta)) + lift * max(0.0, 1.0 - theta);
    n = vec3(0.0, sin(theta), cos(theta));
    vRolled = 1.0;
  }

  vNormal = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uRollY;
uniform float uRadius;
uniform float uRollActive;
varying vec2 vUv;
varying vec3 vNormal;
varying float vRolled;
varying float vFlatY;
varying float vCurlShade;

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(vec3(-0.35, 0.55, 0.85));
  float diff = 0.62 + 0.38 * max(dot(N, L), 0.0);
  float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * 0.08;

  vec3 front = texture2D(uMap, vUv).rgb;
  // Back of the sheet: plain paper with faint ink show-through.
  vec3 through = texture2D(uMap, vec2(1.0 - vUv.x, vUv.y)).rgb;
  vec3 back = mix(vec3(0.86, 0.76, 0.55), through, 0.12);
  vec3 base = gl_FrontFacing ? front : back;

  // Contact shadow cast by the roll onto the flat sheet above it.
  float shadow = 1.0;
  if (vRolled < 0.5 && uRollActive > 0.5) {
    float dy = vFlatY - uRollY;
    shadow = 1.0 - 0.45 * exp(-max(dy, 0.0) / (uRadius * 1.6));
  }
  base *= 1.0 - vCurlShade * 0.18;
  gl_FragColor = vec4(base * diff * shadow + spec, uOpacity);
}`;

export interface DecreeState {
  curl: number;
  roll: number;
  fly: number;
  opacity: number;
}

export class DecreeRoll {
  readonly state: DecreeState = { curl: 0, roll: 0, fly: 0, opacity: 1 };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private group = new THREE.Group();
  private sheet: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private texture: THREE.CanvasTexture;
  private W = 1;
  private H: number;
  private ro: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    source: HTMLCanvasElement,
    private dprCap: number,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.H = source.height / source.width;
    this.texture = new THREE.CanvasTexture(source);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    const geo = new THREE.PlaneGeometry(this.W, this.H, 24, 220);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uMap: { value: this.texture },
        uRollY: { value: -this.H / 2 },
        uRadius: { value: 0.045 },
        uCurl: { value: 0 },
        uW: { value: this.W },
        uH: { value: this.H },
        uOpacity: { value: 1 },
        uRollActive: { value: 0 },
      },
    });
    this.sheet = new THREE.Mesh(geo, mat);

    // Soft drop shadow on the desk.
    const shadowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0.35 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uOpacity; varying vec2 vUv; void main(){ vec2 d = (vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.55, max(abs(d.x), abs(d.y))); gl_FragColor = vec4(0.23, 0.14, 0.05, a * uOpacity); }`,
    });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(this.W * 1.12, this.H * 1.08), shadowMat);
    this.shadow.position.set(0.02, -0.03, -0.05);

    this.group.add(this.shadow, this.sheet);
    this.scene.add(this.group);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Fit the sheet: ~78% of the height, or ~86% of the width on narrow screens.
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distForH = (this.H / 0.78) / 2 / Math.tan(fov / 2);
    const distForW = (this.W / 0.86) / 2 / Math.tan(fov / 2) / this.camera.aspect;
    this.baseDistance = Math.max(distForH, distForW);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private baseDistance = 3;

  render() {
    const { curl, roll, fly, opacity } = this.state;
    const u = this.sheet.material.uniforms;
    const rollY = -this.H / 2 + roll * (this.H + 0.02);
    u.uCurl.value = curl * (1 - roll * 0.6);
    u.uRollY.value = rollY;
    u.uRollActive.value = roll > 0.001 ? 1 : 0;
    u.uOpacity.value = opacity;
    this.shadow.material.uniforms.uOpacity.value = 0.35 * opacity * (1 - roll * 0.7);
    // Shadow shrinks toward the scroll as the sheet rolls away.
    const flat = Math.max(0.08, 1 - roll);
    this.shadow.scale.y = flat;
    this.shadow.position.y = -0.03 + (this.H / 2) * (1 - flat);

    // Camera follows the roll and tilts to look down at it.
    const followY = roll * this.H * 0.5;
    this.camera.position.set(0, followY - 0.1 * curl - roll * 0.25, this.baseDistance * (1 + curl * 0.06 - roll * 0.12));
    this.camera.lookAt(0, followY, 0);

    // Fly-away: the finished scroll turns and recedes.
    this.group.position.set(fly * 0.1, fly * 0.4, -fly * 3.5);
    this.group.rotation.set(-fly * 0.45, fly * 0.3, fly * 0.35);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.ro.disconnect();
    this.sheet.geometry.dispose();
    this.sheet.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.texture.dispose();
    // No forceContextLoss(): React may re-mount onto the same <canvas>.
    this.renderer.dispose();
  }
}
