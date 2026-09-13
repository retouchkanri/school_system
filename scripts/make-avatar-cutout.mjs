/**
 * Heuristic subject cutout for chat-avatar.jpg → chat-avatar-cutout.png
 * Color-distance from edge samples + elliptical prior; hardened alpha for Three.js.
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "public/images/chat-avatar.jpg");
const outputPath = path.join(root, "public/images/chat-avatar-cutout.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: w, height: h } = info;
const rgba = Buffer.from(data);

/** @type {{r:number,g:number,b:number}[]} */
const bgSamples = [];
const pushSample = (x, y) => {
  const i = (Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4;
  bgSamples.push({ r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] });
};

for (let t = 0; t <= 1; t += 0.04) {
  const x = Math.floor(t * (w - 1));
  for (const yy of [0, 2, 4, Math.floor(h * 0.03), Math.floor(h * 0.06)]) pushSample(x, yy);
  pushSample(x, h - 1);
  pushSample(x, h - 3);
}
for (let t = 0; t <= 1; t += 0.04) {
  const y = Math.floor(t * (h - 1));
  pushSample(0, y);
  pushSample(2, y);
  pushSample(w - 1, y);
  pushSample(w - 3, y);
}

function minBgDist(r, g, b) {
  let best = Infinity;
  for (const s of bgSamples) {
    const dr = r - s.r;
    const dg = g - s.g;
    const db = b - s.b;
    const d = Math.sqrt(dr * dr * 0.85 + dg * dg * 1.25 + db * db * 0.9);
    if (d < best) best = d;
  }
  return best;
}

const cx = w * 0.5;
const cy = h * 0.5;
const out = Buffer.alloc(w * h * 4);
const alpha = new Float32Array(w * h);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const dist = minBgDist(r, g, b);

    // Stronger separation threshold
    let colorKeep = (dist - 28) / 48;
    if (colorKeep < 0) colorKeep = 0;
    if (colorKeep > 1) colorKeep = 1;

    // Tighter body+horse ellipse
    const nx = (x - cx) / (w * 0.38);
    const ny = (y - cy) / (h * 0.48);
    const ell = nx * nx + ny * ny;
    let spatial = ell < 0.55 ? 1 : ell < 1.05 ? 1 - (ell - 0.55) / 0.5 : 0;

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const isWarmBrown = r > 65 && r > g + 6 && r > b + 12 && g > b - 5;
    const isDarkCool = luminance < 100 && b >= g - 12 && r < 90;
    const isSkin = r > 135 && g > 90 && b > 75 && r > b && r - g < 75 && g - b < 55;

    const faceNx = (x - cx) / (w * 0.2);
    const faceNy = (y - h * 0.3) / (h * 0.24);
    const inFace = faceNx * faceNx + faceNy * faceNy < 1.1;

    let keep = colorKeep * 0.5 + spatial * 0.5;
    if (isWarmBrown && spatial > 0.2) keep += 0.22;
    if (isDarkCool && spatial > 0.15) keep += 0.2;
    if (inFace && isSkin) keep += 0.35;
    if (inFace && luminance > 40 && luminance < 210) keep += 0.12;

    // Kill distant corners / upper sides
    if (ell > 1.15) keep *= 0.05;
    if (y < h * 0.08 && Math.abs(x - cx) > w * 0.22) keep *= 0.08;
    if (x < w * 0.06 || x > w * 0.94) keep *= 0.25;

    keep = Math.max(0, Math.min(1, keep));
    // Harden
    let a = keep < 0.35 ? 0 : keep > 0.62 ? 1 : (keep - 0.35) / 0.27;
    alpha[y * w + x] = a;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
}

// Morphological-ish cleanup: 5×5 average then re-harden
const smoothed = new Float32Array(w * h);
for (let y = 2; y < h - 2; y++) {
  for (let x = 2; x < w - 2; x++) {
    let sum = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) sum += alpha[(y + dy) * w + (x + dx)];
    }
    smoothed[y * w + x] = sum / 25;
  }
}

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let a = smoothed[y * w + x] || alpha[y * w + x];
    a = a < 0.4 ? 0 : a > 0.7 ? 1 : (a - 0.4) / 0.3;
    // Light edge feather
    if (a > 0 && a < 1) {
      // keep soft band
    }
    const ai = Math.round(a * 255);
    out[i + 3] = ai;
    // Premultiply-ish clear: zero RGB when fully transparent to avoid black fringes in some viewers
    if (ai === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
  }
}

await sharp(out, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toFile(outputPath);

let opaque = 0;
let soft = 0;
let clear = 0;
for (let i = 3; i < out.length; i += 4) {
  const a = out[i];
  if (a > 240) opaque++;
  else if (a < 16) clear++;
  else soft++;
}
console.log("Wrote", outputPath, { opaque, soft, clear });
