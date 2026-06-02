import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';
import { Rect } from '../levels/level-data';

export function renderGoal(r: Renderer, g: Rect, pulse: number): void {
  const { ctx } = r;
  const x = r.sx(g.x);
  const y = r.sy(g.y);
  const w = r.sl(g.w);
  const h = r.sl(g.h);
  // checkered/striped doorway
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.ink : PALETTE.light;
    ctx.fillRect(x + (w / stripes) * i, y, w / stripes + 0.5, h);
  }
  const glow = 0.5 + 0.5 * Math.sin(pulse * 4);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1 + glow * 2;
  ctx.strokeRect(x, y, w, h);
  r.text('GOAL', x + w / 2, y + h + r.sl(9), r.sl(7), PALETTE.ink, 'center', 'middle');
}
