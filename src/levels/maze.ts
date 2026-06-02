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
