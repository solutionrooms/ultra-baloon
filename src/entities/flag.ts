import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';

export class Flag {
  collected = false;
  private wave = 0;
  constructor(
    readonly x: number,
    readonly y: number,
    readonly letter: 'A' | 'B',
  ) {}

  reset(): void {
    this.collected = false;
  }

  update(dt: number): void {
    this.wave += dt * 5;
  }

  render(r: Renderer): void {
    if (this.collected) return;
    const { ctx } = r;
    const px = r.sx(this.x);
    const py = r.sy(this.y);
    const h = r.sl(16);
    const w = r.sl(11);
    // pole
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = Math.max(1, r.sl(1.4));
    ctx.beginPath();
    ctx.moveTo(px, py + h * 0.5);
    ctx.lineTo(px, py - h * 0.5);
    ctx.stroke();
    // pennant (black with white letter, like the original)
    const flutter = Math.sin(this.wave) * w * 0.18;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(px, py - h * 0.5);
    ctx.lineTo(px + w, py - h * 0.28 + flutter);
    ctx.lineTo(px, py - h * 0.06);
    ctx.closePath();
    ctx.fill();
    // letter
    r.text(this.letter, px + w * 0.42, py - h * 0.27 + flutter, r.sl(7), PALETTE.bg, 'center', 'middle');
  }
}
