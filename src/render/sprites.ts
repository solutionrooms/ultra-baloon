import { Renderer } from './renderer';
import { PALETTE } from './colors';
import iconJson from '../data/extracted/icon.json';

const ICON = iconJson as unknown as { width: number; height: number; pixels: number[][] };

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

const WHITE = '#f4f4ec';

/**
 * Mr. Blower — a side-profile blowing face. The original has no clean profile sprite
 * (its sheet holds the title letters / props), so this is a faithful vector recreation:
 * round head with a gray back, effort brow + eye, nose, puffed cheek, and a blowing
 * mouth with wind streams. `edgeX`/`cy` are screen px; the face looks/blows inward
 * (right from the left edge, left from the right edge).
 */
export function drawBlowerFace(
  r: Renderer,
  edgeX: number,
  cy: number,
  targetH: number,
  side: 'left' | 'right',
  blowing: boolean,
): void {
  const { ctx } = r;
  const dir = side === 'left' ? 1 : -1; // inward (look + blow direction)
  const h = targetH;
  const rx = 0.36 * h;
  const ry = 0.46 * h;
  const hx = edgeX + dir * rx * 0.7;
  const hy = cy;
  const lw = Math.max(1.5, h * 0.045);
  const INK = PALETTE.ink;
  const GRAY = PALETTE.mid;

  const ell = (cx: number, cyy: number, ax: number, ay: number, fill: string | null, stroke: boolean): void => {
    ctx.beginPath();
    ctx.ellipse(cx, cyy, ax, ay, 0, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) ctx.stroke();
  };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;

  ell(hx, hy, rx, ry, GRAY, false); // gray head base
  ell(hx + dir * rx * 0.4, hy, rx * 0.9, ry - 2, WHITE, false); // white face front
  ell(hx, hy, rx, ry, null, true); // head outline

  // puffed cheek (front-lower)
  ell(hx + dir * rx * 0.62, hy + ry * 0.3, 0.17 * h, 0.17 * h, WHITE, true);

  // nose (front bump)
  ctx.beginPath();
  ctx.moveTo(hx + dir * rx * 0.7, hy - ry * 0.12);
  ctx.lineTo(hx + dir * rx * 1.12, hy + ry * 0.04);
  ctx.lineTo(hx + dir * rx * 0.66, hy + ry * 0.12);
  ctx.closePath();
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.stroke();

  // eye + pupil
  const ex = hx + dir * rx * 0.22;
  const ey = hy - ry * 0.44;
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ell(ex, ey, 0.07 * h, 0.07 * h, WHITE, true);
  ell(ex + dir * h * 0.018, ey, 0.033 * h, 0.033 * h, INK, false);

  // effort brow
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(ex - dir * 0.09 * h, ey - 0.12 * h);
  ctx.lineTo(ex + dir * 0.07 * h, ey - 0.04 * h);
  ctx.stroke();

  // blowing mouth
  const mx = hx + dir * rx * 0.95;
  const my = hy + ry * 0.1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(mx, my, 0.045 * h, 0.07 * h, 0, 0, Math.PI * 2);
  ctx.fill();

  // wind streams while blowing
  if (blowing) {
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = Math.max(2, h * 0.04);
    for (let i = 0; i < 4; i++) {
      const yy = my + (i - 1.5) * 0.11 * h;
      ctx.beginPath();
      ctx.moveTo(mx + dir * 0.08 * h, yy);
      ctx.lineTo(mx + dir * (0.42 + i * 0.1) * h, yy);
      ctx.stroke();
    }
  }

  ctx.restore();
}
