import { Rect } from './level-data';
import { circleRect, closestPointOnRect } from '../math/collision';

/**
 * Resolves a circle (the balloon) against a set of solid rects using
 * iterative minimum-translation push-out (collide-and-slide). Mutates pos.
 * Returns the accumulated push vector (useful to damp velocity on the hit axis).
 */
export function resolveCircleVsRects(
  pos: { x: number; y: number },
  radius: number,
  rects: Rect[],
): { hit: boolean; nx: number; ny: number } {
  let hit = false;
  let nx = 0;
  let ny = 0;
  // a couple of passes so corners settle
  for (let pass = 0; pass < 3; pass++) {
    let movedThisPass = false;
    for (const r of rects) {
      if (!circleRect(pos.x, pos.y, radius, r)) continue;
      const c = closestPointOnRect(pos.x, pos.y, r);
      let dx = pos.x - c.x;
      let dy = pos.y - c.y;
      let d = Math.hypot(dx, dy);
      if (d === 0) {
        // center is inside the rect — push out along the shallowest axis
        const left = pos.x - r.x;
        const right = r.x + r.w - pos.x;
        const top = pos.y - r.y;
        const bottom = r.y + r.h - pos.y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) {
          pos.x = r.x - radius;
          nx -= 1;
        } else if (min === right) {
          pos.x = r.x + r.w + radius;
          nx += 1;
        } else if (min === top) {
          pos.y = r.y - radius;
          ny -= 1;
        } else {
          pos.y = r.y + r.h + radius;
          ny += 1;
        }
        hit = true;
        movedThisPass = true;
        continue;
      }
      const overlap = radius - d;
      if (overlap > 0) {
        dx /= d;
        dy /= d;
        pos.x += dx * overlap;
        pos.y += dy * overlap;
        nx += dx;
        ny += dy;
        hit = true;
        movedThisPass = true;
      }
    }
    if (!movedThisPass) break;
  }
  const nlen = Math.hypot(nx, ny);
  if (nlen > 0) {
    nx /= nlen;
    ny /= nlen;
  }
  return { hit, nx, ny };
}

export function circleHitsAnyRect(
  cx: number,
  cy: number,
  radius: number,
  rects: Rect[],
): boolean {
  for (const r of rects) if (circleRect(cx, cy, radius, r)) return true;
  return false;
}

/**
 * Greedy maximal-rectangle decomposition of a 1bpp wall mask (set bit = wall).
 * `mask` is row-major, `rowBytes` bytes per row, MSB = leftmost pixel.
 * Produces axis-aligned wall Rects (1 unit = 1 pixel) for collision + rendering.
 */
export function maskToRects(mask: Uint8Array, width: number, height: number, rowBytes: number): Rect[] {
  const wall = (x: number, y: number): boolean => {
    const byte = mask[y * rowBytes + (x >> 3)];
    return ((byte >> (7 - (x & 7))) & 1) === 1;
  };
  const used = new Uint8Array(width * height);
  const rects: Rect[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (used[y * width + x] || !wall(x, y)) continue;
      // grow width along the row
      let x2 = x;
      while (x2 < width && !used[y * width + x2] && wall(x2, y)) x2++;
      const w = x2 - x;
      // grow height while the whole [x,x2) span is wall & unused
      let y2 = y + 1;
      grow: for (; y2 < height; y2++) {
        for (let xx = x; xx < x2; xx++) {
          if (used[y2 * width + xx] || !wall(xx, y2)) break grow;
        }
      }
      const h = y2 - y;
      for (let yy = y; yy < y2; yy++) for (let xx = x; xx < x2; xx++) used[yy * width + xx] = 1;
      rects.push({ x, y, w, h });
    }
  }
  return rects;
}

/** Decode a base64 string to a Uint8Array (browser atob). */
export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
