// Generates eazydock brand assets (no native image deps — raw PNG encoding).
// Mark: a rounded "parking pin" knockout, in the brand blue.
// Run: node scripts/gen-assets.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BRAND = [0x20, 0x8a, 0xef]; // #208AEF
const BRAND_DARK = [0x10, 0x6c, 0xcf]; // gradient bottom
const NAVY = [0x0b, 0x1f, 0x33]; // splash backdrop
const WHITE = [0xff, 0xff, 0xff];

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---- PNG encoder ----
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// signed area sign for point-in-triangle
const sign = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// pin coverage at (x,y) via supersampling. scale = fraction of canvas the pin spans.
function pinCoverage(x, y, size, scale) {
  const R = size * 0.18 * scale;
  const cx = size / 2;
  const cy0 = size * 0.40;
  const tipY = cy0 + R * 2.55;
  const holeR = R * 0.46;
  const SS = 3;
  let cov = 0;
  for (let sx = 0; sx < SS; sx++) {
    for (let sy = 0; sy < SS; sy++) {
      const px = x + (sx + 0.5) / SS;
      const py = y + (sy + 0.5) / SS;
      const dC = (px - cx) ** 2 + (py - cy0) ** 2 <= R * R;
      const dT = inTriangle(px, py, cx, tipY, cx - R, cy0, cx + R, cy0);
      const inHole = (px - cx) ** 2 + (py - cy0) ** 2 <= holeR * holeR;
      if ((dC || dT) && !inHole) cov++;
    }
  }
  return cov / (SS * SS);
}

// background: 'transparent' | 'gradient' | rgb
function render(size, { bg, mark = WHITE, scale = 1 }) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const t = y / size;
    let base = null;
    let baseA = 0;
    if (bg === 'gradient') {
      base = mix(BRAND, BRAND_DARK, t);
      baseA = 255;
    } else if (Array.isArray(bg)) {
      base = bg;
      baseA = 255;
    }
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cov = pinCoverage(x, y, size, scale);
      let r, g, b, a;
      if (base) {
        r = base[0];
        g = base[1];
        b = base[2];
        a = baseA;
      } else {
        r = g = b = 0;
        a = 0;
      }
      if (cov > 0) {
        r = lerp(r, mark[0], cov);
        g = lerp(g, mark[1], cov);
        b = lerp(b, mark[2], cov);
        a = Math.max(a, Math.round(cov * 255));
      }
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }
  return encodePNG(size, size, buf);
}

function out(path, png) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log('wrote', path, `(${png.length} bytes)`);
}

const A = 'assets/images';
out(`${A}/icon.png`, render(1024, { bg: 'gradient', mark: WHITE }));
out(`${A}/favicon.png`, render(196, { bg: 'gradient', mark: WHITE }));
out(`${A}/splash-icon.png`, render(512, { bg: 'transparent', mark: WHITE, scale: 1.1 }));
out(`${A}/android-icon-background.png`, render(1024, { bg: 'gradient' }));
out(`${A}/android-icon-foreground.png`, render(1024, { bg: 'transparent', mark: WHITE, scale: 0.62 }));
out(`${A}/android-icon-monochrome.png`, render(1024, { bg: 'transparent', mark: WHITE, scale: 0.62 }));
