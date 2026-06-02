export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Closest point on an axis-aligned rect to point (px, py). */
export function closestPointOnRect(px: number, py: number, r: Rect): { x: number; y: number } {
  return {
    x: px < r.x ? r.x : px > r.x + r.w ? r.x + r.w : px,
    y: py < r.y ? r.y : py > r.y + r.h ? r.y + r.h : py,
  };
}

/** Does circle (cx,cy,radius) overlap axis-aligned rect r? */
export function circleRect(cx: number, cy: number, radius: number, r: Rect): boolean {
  const c = closestPointOnRect(cx, cy, r);
  const dx = cx - c.x;
  const dy = cy - c.y;
  return dx * dx + dy * dy <= radius * radius;
}

/** Circle vs circle overlap. */
export function circleCircle(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
