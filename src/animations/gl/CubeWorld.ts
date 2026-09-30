import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { QUALITY, FUTURE, type QualityTier } from "@/config/animation.config";

/**
 * 2060: a field of floating cubes in real 3D depth.
 *
 *  - One InstancedMesh for all solid cubes (a single draw call).
 *  - Foreground / midground / background bands, with fog + depth of field
 *    (Bokeh) on capable desktops so the headline plane stays in focus.
 *  - Camera travels forward with scroll; rotation speeds up briefly with
 *    scroll velocity; the pointer adds a gentle, interpolated parallax.
 *  - Adaptive quality: if frames get slow, DoF is dropped, then resolution.
 */

const PALETTE = ["#8b6cff", "#3fd8f2", "#ff6b8e", "#ffc86b", "#eef0ff", "#6c8cff"];

interface Cube {
  pos: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
  floatAmp: number;
  floatSpeed: number;
  phase: number;
  spawn: number;
  spawnDelay: number;
}

function gradientBackground() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0d0b2a");
  g.addColorStop(0.5, "#070818");
  g.addColorStop(1, "#04050d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class CubeWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  private composer: EffectComposer | null = null;
  private bokeh: BokehPass | null = null;
  private mesh: THREE.InstancedMesh;
  private wires: THREE.LineSegments[] = [];
  private wireData: Cube[] = [];
  private stars: THREE.Points;
  private cubes: Cube[] = [];
  private dummy = new THREE.Object3D();
  private raf = 0;
  private active = false;
  private last = 0;
  private time = 0;
  private scroll = 0;
  private velocity = 0;
  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private frameTimes: number[] = [];
  private dprCap: number;
  private spawnT = 1;
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    tier: QualityTier,
    private reduced: boolean,
  ) {
    const q = QUALITY[tier];
    this.dprCap = q.dpr;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== "low", powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.background = gradientBackground();
    this.scene.fog = new THREE.Fog("#070818", 18, 62);

    // Lights: coloured key lights give the cubes their 2060 palette.
    this.scene.add(new THREE.HemisphereLight("#8b6cff", "#05060f", 0.7));
    const key = new THREE.DirectionalLight("#ffffff", 1.1);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    const lights: [string, number, number, number][] = [
      ["#8b6cff", -8, 4, 2],
      ["#3fd8f2", 8, -3, 4],
      ["#ff6b8e", 0, 6, -14],
    ];
    lights.forEach(([c, x, y, z]) => {
      const l = new THREE.PointLight(c, 60, 40, 1.6);
      l.position.set(x, y, z);
      this.scene.add(l);
    });

    // Solid cubes.
    const geo = new RoundedBoxGeometry(1, 1, 1, 3, 0.09);
    const mat = new THREE.MeshPhysicalMaterial({
      roughness: 0.22,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      iridescence: 0.55,
      iridescenceIOR: 1.35,
      envMapIntensity: 1.3,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, q.cubes);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const color = new THREE.Color();
    for (let i = 0; i < q.cubes; i++) {
      this.cubes.push(this.makeCube(i, q.cubes));
      color.set(PALETTE[i % PALETTE.length]);
      this.mesh.setColorAt(i, color);
    }
    this.scene.add(this.mesh);

    // Wireframe cubes — the "blueprint" layer.
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i < q.wireCubes; i++) {
      const lm = new THREE.LineBasicMaterial({ color: PALETTE[(i + 1) % 3], transparent: true, opacity: 0.55 });
      const line = new THREE.LineSegments(edges, lm);
      const data = this.makeCube(i + 1000, q.wireCubes);
      data.size *= 1.4;
      this.wires.push(line);
      this.wireData.push(data);
      this.scene.add(line);
    }

    // Distant particles for parallax depth.
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(q.stars * 3);
    for (let i = 0; i < q.stars; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 120;
      pts[i * 3 + 1] = (Math.random() - 0.5) * 70;
      pts[i * 3 + 2] = -Math.random() * 80 + 6;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#c9d2ff", size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
    this.scene.add(this.stars);

    if (q.dof && !reduced) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 12, aperture: 0.0022, maxblur: 0.009 });
      this.composer.addPass(this.bokeh);
      this.composer.addPass(new OutputPass());
    }

    const onPointer = (e: PointerEvent) => {
      this.pointerTarget.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    };
    const onVisibility = () => {
      if (document.hidden) this.stopLoop();
      else if (this.active) this.startLoop();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    this.disposers.push(() => window.removeEventListener("pointermove", onPointer));
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVisibility));

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    this.disposers.push(() => ro.disconnect());
    this.resize();
    this.update(0);
  }

  /** Distributes cubes in three depth bands, keeping the headline area clear up close. */
  private makeCube(i: number, n: number): Cube {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const band = i % 10 < 1 ? "fore" : i % 10 < 5 ? "mid" : "back";
    const z = band === "fore" ? r(3, 7) : band === "mid" ? r(-12, 1) : r(-50, -12);
    const spreadX = 9 + Math.abs(z - 12) * 0.42;
    const spreadY = 5 + Math.abs(z - 12) * 0.26;
    let x = r(-spreadX, spreadX);
    const y = r(-spreadY, spreadY);
    // Keep a corridor along the camera path clear, so type and the form stay readable.
    const corridor = z > -8 ? 4.5 : 3.2;
    if (Math.abs(x) < corridor && Math.abs(y) < corridor * 0.8) x = Math.sign(x || 1) * r(corridor, Math.max(corridor + 1, spreadX));
    const size = band === "fore" ? r(1.4, 2.2) : band === "mid" ? r(0.5, 1.3) : r(0.4, 1.6);
    return {
      pos: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler(r(0, Math.PI), r(0, Math.PI), r(0, Math.PI)),
      spin: new THREE.Vector3(r(-0.25, 0.25), r(-0.3, 0.3), r(-0.2, 0.2)),
      size,
      floatAmp: r(0.12, 0.45),
      floatSpeed: r(0.25, 0.6),
      phase: r(0, Math.PI * 2),
      spawn: 1,
      spawnDelay: (i / n) * 0.2,
    };
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(dpr);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // Narrow screens: widen the view so the field isn't cropped to a sliver.
    this.camera.fov = w / h < 0.8 ? 62 : 45;
    this.camera.updateProjectionMatrix();
    if (!this.active) this.render();
  }

  /** Normalised scroll progress through the future chapters. */
  setScroll(p: number) {
    this.scroll = p;
  }

  setVelocity(v: number) {
    this.velocity = v;
  }

  /** Cubes materialise outward from the snap point (NDC coordinates). */
  spawn(origin?: { x: number; y: number }) {
    const o = new THREE.Vector3(origin?.x ?? 0, origin?.y ?? -0.2, 0.5).unproject(this.camera);
    let maxD = 1;
    const dist = this.cubes.map((c) => {
      const d = c.pos.distanceTo(o);
      maxD = Math.max(maxD, d);
      return d;
    });
    this.cubes.forEach((c, i) => {
      c.spawn = 0;
      c.spawnDelay = this.reduced ? 0 : (dist[i] / maxD) * 0.9;
    });
    this.wireData.forEach((c) => {
      c.spawn = 0;
      c.spawnDelay = this.reduced ? 0 : 0.3 + Math.random() * 0.6;
    });
    this.spawnT = 0;
  }

  setActive(on: boolean) {
    this.active = on;
    if (on) this.startLoop();
    else this.stopLoop();
  }

  private startLoop() {
    if (this.raf || document.hidden) return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.adapt(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private update(dt: number) {
    const motion = this.reduced ? 0.15 : 1;
    this.time += dt * motion;
    this.spawnT += dt;
    const boost = 1 + Math.min(4, Math.abs(this.velocity) * 0.08);
    const t = this.time;

    const place = (c: Cube, obj: THREE.Object3D) => {
      const local = Math.max(0, Math.min(1, (this.spawnT - c.spawnDelay) / 0.9));
      // Ease-out-back for a confident "materialise" without cartoon bounce.
      const k = 1.2;
      const e = local === 0 ? 0 : 1 + (k + 1) * Math.pow(local - 1, 3) + k * Math.pow(local - 1, 2);
      c.spawn = local;
      c.rot.x += c.spin.x * dt * boost * motion;
      c.rot.y += c.spin.y * dt * boost * motion;
      c.rot.z += c.spin.z * dt * boost * motion;
      obj.position.set(c.pos.x, c.pos.y + Math.sin(t * c.floatSpeed + c.phase) * c.floatAmp, c.pos.z);
      obj.rotation.copy(c.rot);
      obj.scale.setScalar(Math.max(0.0001, c.size * e));
    };

    this.cubes.forEach((c, i) => {
      place(c, this.dummy);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.wires.forEach((w, i) => place(this.wireData[i], w));
    this.stars.rotation.z = t * 0.004;

    // Camera: scroll travel + interpolated pointer parallax.
    this.pointer.lerp(this.pointerTarget, 1 - Math.pow(0.02, dt));
    const z = 12 - this.scroll * FUTURE.cameraTravel;
    this.camera.position.set(this.pointer.x * 1.4, -this.pointer.y * 0.9, z);
    this.camera.lookAt(this.pointer.x * 0.4, -this.pointer.y * 0.2, z - 12);
    this.camera.rotation.z += this.velocity * 0.0006;
    this.velocity *= Math.pow(0.1, dt);

    if (this.bokeh) {
      (this.bokeh.uniforms as unknown as Record<string, { value: number }>)["focus"].value = 12;
    }
  }

  private render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** Drop DoF, then resolution, if the device can't hold ~45fps. */
  private adapt(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 0.022 && this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bokeh = null;
      console.info("[cubes] depth of field disabled to keep the frame rate up");
    } else if (avg > 0.026 && this.dprCap > 1) {
      this.dprCap = 1;
      this.resize();
      console.info("[cubes] resolution lowered to keep the frame rate up");
    }
  }

  dispose() {
    this.stopLoop();
    this.disposers.forEach((d) => d());
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.wires.forEach((w) => (w.material as THREE.Material).dispose());
    this.wires[0]?.geometry.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.composer?.dispose();
    // No forceContextLoss(): React may re-mount onto the same <canvas>.
    this.renderer.dispose();
  }
}
