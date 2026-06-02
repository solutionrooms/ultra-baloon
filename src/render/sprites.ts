import { Renderer } from './renderer';
import iconJson from '../data/extracted/icon.json';
import blowerJson from '../data/extracted/blower.json';

const ICON = iconJson as unknown as { width: number; height: number; pixels: number[][] };

interface BlowerFrame {
  w: number;
  h: number;
  rowBytes: number;
  p0: string;
  p1: string;
}
const BLOWER = blowerJson as unknown as { frames: BlowerFrame[] };

function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Pre-rendered offscreen canvases for each Blower frame (built once).
const blowerCanvases: (HTMLCanvasElement | null)[] = BLOWER.frames.map(() => null);

function buildBlowerCanvas(idx: number): HTMLCanvasElement {
  const f = BLOWER.frames[idx];
  const cv = document.createElement('canvas');
  cv.width = f.w;
  cv.height = f.h;
  const c = cv.getContext('2d')!;
  const p0 = b64(f.p0);
  const p1 = b64(f.p1);
  const img = c.createImageData(f.w, f.h);
  const ink = [0x16, 0x16, 0x13];
  const mid = [0x6f, 0x6f, 0x68];
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const bit = (m: Uint8Array) => (m[y * f.rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
      const o = (y * f.w + x) * 4;
      if (bit(p0)) {
        img.data[o] = ink[0]; img.data[o + 1] = ink[1]; img.data[o + 2] = ink[2]; img.data[o + 3] = 255;
      } else if (bit(p1)) {
        img.data[o] = mid[0]; img.data[o + 1] = mid[1]; img.data[o + 2] = mid[2]; img.data[o + 3] = 255;
      } else {
        img.data[o + 3] = 0;
      }
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

/** Draw a recovered Mr. Blower face frame. The face blows toward +x (mouth on the right);
 * for the right edge it is flipped. `edgeX`/`cy` are screen px; `targetH` is on-screen height. */
export function drawBlowerFace(
  r: Renderer,
  idx: number,
  edgeX: number,
  cy: number,
  targetH: number,
  side: 'left' | 'right',
): void {
  const f = BLOWER.frames[idx];
  if (!blowerCanvases[idx]) blowerCanvases[idx] = buildBlowerCanvas(idx);
  const cv = blowerCanvases[idx]!;
  const scale = targetH / f.h;
  const w = f.w * scale;
  const h = f.h * scale;
  const { ctx } = r;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (side === 'left') {
    // head-back at the left edge, mouth points right (into play)
    ctx.translate(edgeX, cy - h / 2);
    ctx.drawImage(cv, 0, 0, w, h);
  } else {
    // flip: head-back at the right edge, mouth points left
    ctx.translate(edgeX, cy - h / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, 0, 0, w, h);
  }
  ctx.restore();
}

/** Draw the byte-exact recovered 32×32 app icon at (x,y) top-left, each source pixel `scale` px. */
export function drawIcon(r: Renderer, x: number, y: number, scale: number, color: string): void {
  const { ctx } = r;
  ctx.fillStyle = color;
  for (let row = 0; row < ICON.height; row++) {
    const line = ICON.pixels[row];
    for (let col = 0; col < ICON.width; col++) {
      if (line[col]) ctx.fillRect(x + col * scale, y + row * scale, scale + 0.5, scale + 0.5);
    }
  }
}

export const ICON_SIZE = ICON.width;
