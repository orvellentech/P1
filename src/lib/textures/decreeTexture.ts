import { getPaperCanvas } from "./procedural";
import { FONT_FAMILY } from "@/styles/fonts";
import type { SiteContent } from "@/config/types";

/** Portrait decree proportions (height / width). */
export const DECREE_ASPECT = 1.4;

const INK = "#3a2714";
const INK_FADED = "#6e5332";
const SEAL = "#8e1b1b";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (from `max` down) at which `text` fits the box. */
function fitParagraph(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxWidth: number, maxHeight: number, max: number, min: number, leading = 1.45) {
  for (let size = max; size >= min; size -= 1) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length * size * leading <= maxHeight) return { size, lines, lineHeight: size * leading };
  }
  ctx.font = font(min);
  const lines = wrap(ctx, text, maxWidth);
  const maxLines = Math.max(1, Math.floor(maxHeight / (min * leading)));
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return { size: min, lines, lineHeight: min * leading };
}

function drawCornerFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sx: number, sy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.moveTo(0, s * 1.6);
  ctx.bezierCurveTo(0, s * 0.6, s * 0.2, 0, s * 1.6, 0);
  ctx.moveTo(s * 0.35, s * 0.9);
  ctx.bezierCurveTo(s * 0.35, s * 0.4, s * 0.5, s * 0.35, s * 0.9, s * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.62, s * 0.62, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Wax seal with the company logo pressed into it. */
function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, logo: HTMLImageElement | null) {
  ctx.save();
  // Irregular wax blob.
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const wobble = 1 + 0.05 * Math.sin(a * 5 + 1.3) + 0.03 * Math.sin(a * 11);
    const x = cx + Math.cos(a) * r * wobble;
    const y = cy + Math.sin(a) * r * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, "#c2413b");
  g.addColorStop(0.55, SEAL);
  g.addColorStop(1, "#4d0a0a");
  ctx.fillStyle = g;
  ctx.shadowColor = "rgba(40, 10, 5, 0.45)";
  ctx.shadowBlur = r * 0.2;
  ctx.shadowOffsetY = r * 0.06;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Pressed rim.
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = "rgba(60, 5, 5, 0.55)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 170, 150, 0.25)";
  ctx.lineWidth = r * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.015, r * 0.77, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Logo, tinted into the wax.
  if (logo && logo.naturalWidth) {
    const size = r * 1.05;
    const off = document.createElement("canvas");
    off.width = off.height = Math.ceil(size * 2);
    const o = off.getContext("2d")!;
    const ar = logo.naturalWidth / logo.naturalHeight;
    const w = ar >= 1 ? off.width : off.height * ar;
    const h = ar >= 1 ? off.width / ar : off.height;
    o.drawImage(logo, (off.width - w) / 2, (off.height - h) / 2, w, h);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = "rgba(55, 6, 6, 0.8)";
    o.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(off, cx - size / 2, cy - size / 2, size, size);
  }
  ctx.restore();
}

/**
 * Paints the King's Order sheet. All wording that could be read as a
 * company claim comes from configuration; the rest is period framing.
 */
export function drawDecree(content: SiteContent, logo: HTMLImageElement | null, width: number) {
  const W = Math.round(width);
  const H = Math.round(width * DECREE_ASPECT);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const u = W / 100; // 1 unit = 1% of width

  // Paper.
  ctx.fillStyle = "#efdfb4";
  ctx.fillRect(0, 0, W, H);
  const pattern = ctx.createPattern(getPaperCanvas(), "repeat");
  if (pattern) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // Aged, darkened edges.
  const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  edge.addColorStop(0, "rgba(120, 78, 28, 0)");
  edge.addColorStop(0.75, "rgba(120, 78, 28, 0.14)");
  edge.addColorStop(1, "rgba(80, 45, 12, 0.5)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // Borders.
  ctx.strokeStyle = INK_FADED;
  ctx.fillStyle = INK_FADED;
  ctx.lineWidth = u * 0.35;
  ctx.strokeRect(u * 5, u * 5, W - u * 10, H - u * 10);
  ctx.lineWidth = u * 0.12;
  ctx.strokeRect(u * 6.4, u * 6.4, W - u * 12.8, H - u * 12.8);
  ctx.lineWidth = u * 0.22;
  const f = u * 4.2;
  drawCornerFlourish(ctx, u * 7.6, u * 7.6, f, 1, 1);
  drawCornerFlourish(ctx, W - u * 7.6, u * 7.6, f, -1, 1);
  drawCornerFlourish(ctx, u * 7.6, H - u * 7.6, f, 1, -1);
  drawCornerFlourish(ctx, W - u * 7.6, H - u * 7.6, f, -1, -1);

  const cx = W / 2;
  const inner = W - u * 26;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = u * 17;

  // Heading.
  ctx.fillStyle = INK_FADED;
  ctx.font = `${u * 2.6}px "${FONT_FAMILY.antique}"`;
  ctx.letterSpacing = `${u * 0.9}px`;
  ctx.fillText("BY ROYAL DECREE", cx, y);
  ctx.letterSpacing = "0px";
  y += u * 3.4;
  ctx.lineWidth = u * 0.15;
  ctx.strokeStyle = INK_FADED;
  ctx.beginPath();
  ctx.moveTo(cx - u * 16, y);
  ctx.lineTo(cx - u * 2, y);
  ctx.moveTo(cx + u * 2, y);
  ctx.lineTo(cx + u * 16, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y - u * 1);
  ctx.lineTo(cx + u * 1, y);
  ctx.lineTo(cx, y + u * 1);
  ctx.lineTo(cx - u * 1, y);
  ctx.fill();
  y += u * 9.5;

  // Company name.
  ctx.fillStyle = INK;
  const nameFit = fitParagraph(ctx, content.companyName, (px) => `${px}px "${FONT_FAMILY.antique}"`, inner, u * 22, Math.round(u * 8.5), Math.round(u * 4.5), 1.1);
  ctx.font = `${nameFit.size}px "${FONT_FAMILY.antique}"`;
  nameFit.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * nameFit.lineHeight));
  y += nameFit.lines.length * nameFit.lineHeight + u * 3.5;

  ctx.fillStyle = INK_FADED;
  ctx.font = `italic ${u * 3}px "${FONT_FAMILY.antique}"`;
  ctx.fillText("Be it known unto all who read these words:", cx, y);
  y += u * 7;

  // Mission + vision.
  ctx.fillStyle = INK;
  const bodyTop = y;
  const bodyBottom = H - u * 38;
  const half = (bodyBottom - bodyTop - u * 8) / 2;
  const mission = fitParagraph(ctx, content.mission, (px) => `${px}px "${FONT_FAMILY.antiqueBody}"`, inner, half, Math.round(u * 3.6), Math.round(u * 2.2));
  ctx.font = `${mission.size}px "${FONT_FAMILY.antiqueBody}"`;
  mission.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * mission.lineHeight));
  y += mission.lines.length * mission.lineHeight + u * 3;

  ctx.fillStyle = INK_FADED;
  ctx.font = `italic ${u * 2.6}px "${FONT_FAMILY.antique}"`;
  ctx.fillText("— and further —", cx, y);
  y += u * 5.5;

  ctx.fillStyle = INK;
  const vision = fitParagraph(ctx, content.vision, (px) => `italic ${px}px "${FONT_FAMILY.antiqueBody}"`, inner, half, Math.round(u * 3.6), Math.round(u * 2.2));
  ctx.font = `italic ${vision.size}px "${FONT_FAMILY.antiqueBody}"`;
  vision.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * vision.lineHeight));

  // Signatures.
  const sigY = H - u * 28;
  ctx.textAlign = "left";
  ctx.fillStyle = INK_FADED;
  ctx.font = `${u * 2.2}px "${FONT_FAMILY.antique}"`;
  ctx.letterSpacing = `${u * 0.5}px`;
  ctx.fillText("SEALED BY THE FOUNDERS", u * 13, sigY);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = INK;
  const founders = content.founders.slice(0, 4);
  founders.forEach((fd, i) => {
    const fy = sigY + u * 5 + i * u * 4.4;
    ctx.font = `italic ${u * 3.1}px "${FONT_FAMILY.antique}"`;
    let label = fd.name;
    while (ctx.measureText(label).width > u * 44 && label.length > 4) label = label.slice(0, -2) + "…";
    ctx.fillText(label, u * 13, fy);
    ctx.strokeStyle = "rgba(58, 39, 20, 0.35)";
    ctx.lineWidth = u * 0.1;
    ctx.beginPath();
    ctx.moveTo(u * 13, fy + u * 1.1);
    ctx.lineTo(u * 58, fy + u * 1.1);
    ctx.stroke();
  });

  drawSeal(ctx, W - u * 25, H - u * 20, u * 10, logo);
  return c;
}
