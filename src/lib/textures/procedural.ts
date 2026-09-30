/**
 * Procedural textures generated at load time — zero network cost, no
 * image assets to ship. Each is published as a CSS custom property.
 */

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  return { c, ctx };
}

function toObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("Texture encoding failed"))), "image/png");
  });
}

/** Seeded PRNG so textures are identical across loads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable aged-paper detail (stains, fibres, tooth). Transparent — sits over a parchment colour. */
export function paperCanvas(size = 512, seed = 7) {
  const rand = mulberry32(seed);
  const { c, ctx } = makeCanvas(size, size);

  // Pixel tooth.
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rand();
    const dark = n < 0.5;
    img.data[i] = dark ? 70 : 255;
    img.data[i + 1] = dark ? 45 : 250;
    img.data[i + 2] = dark ? 18 : 235;
    img.data[i + 3] = Math.floor(Math.abs(n - 0.5) * 36);
  }
  ctx.putImageData(img, 0, 0);

  // Draw a shape 9× with wrap-around offsets so the tile has no seams.
  const wrapped = (draw: (ox: number, oy: number) => void) => {
    for (let ox = -size; ox <= size; ox += size) for (let oy = -size; oy <= size; oy += size) draw(ox, oy);
  };

  // Soft stains / foxing.
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 110;
    const a = 0.025 + rand() * 0.05;
    wrapped((ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, `rgba(122, 78, 28, ${a})`);
      g.addColorStop(0.7, `rgba(122, 78, 28, ${a * 0.45})`);
      g.addColorStop(1, "rgba(122, 78, 28, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }

  // Fibres.
  ctx.lineCap = "round";
  for (let i = 0; i < 420; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 4 + rand() * 18;
    const ang = rand() * Math.PI;
    const a = 0.04 + rand() * 0.08;
    ctx.strokeStyle = rand() > 0.3 ? `rgba(92, 62, 26, ${a})` : `rgba(255, 250, 230, ${a * 1.6})`;
    ctx.lineWidth = 0.5 + rand() * 0.8;
    wrapped((ox, oy) => {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.quadraticCurveTo(x + ox + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 3, y + oy + Math.sin(ang) * len * 0.5, x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len);
      ctx.stroke();
    });
  }
  return c;
}

/** Film/print grain tile: black & white specks with alpha. */
export function grainCanvas(size = 180, seed = 3) {
  const rand = mulberry32(seed);
  const { c, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rand();
    const v = n > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(Math.pow(Math.abs(n - 0.5) * 2, 2.2) * 90);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let cachedPaper: HTMLCanvasElement | null = null;
export function getPaperCanvas() {
  return (cachedPaper ??= paperCanvas());
}

/** Generates textures and publishes them as CSS variables on <html>. */
export async function publishProceduralTextures() {
  const root = document.documentElement;
  const [paper, grain] = await Promise.all([toObjectUrl(getPaperCanvas()), toObjectUrl(grainCanvas())]);
  root.style.setProperty("--tex-paper", `url("${paper}")`);
  root.style.setProperty("--tex-grain", `url("${grain}")`);
}
