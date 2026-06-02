import { Renderer } from './renderer';
import { InputManager } from '../core/input';
import { Action } from '../core/preferences';
import { PALETTE, OVERLAY } from './colors';

interface Btn {
  action: Action;
  x: number;
  y: number;
  r: number;
  glyph: string;
}

/** On-screen touch buttons for gameplay. Becomes visible after the first touch. */
export class TouchControls {
  visible = false;
  private btns: Btn[] = [];

  static isTouchLikely(): boolean {
    return (
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches)
    );
  }

  private layout(r: Renderer): void {
    const s = Math.max(26, Math.min(Math.min(r.width, r.height) * 0.078, 56));
    const m = s * 1.1;
    const padCx = m + s * 1.3;
    const padCy = r.height - m - s * 1.3;
    const g = s * 1.25;
    this.btns = [
      { action: 'left', x: padCx - g, y: padCy, r: s, glyph: '◀' },
      { action: 'right', x: padCx + g, y: padCy, r: s, glyph: '▶' },
      { action: 'up', x: padCx, y: padCy - g, r: s, glyph: '▲' },
      { action: 'down', x: padCx, y: padCy + g, r: s, glyph: '▼' },
      { action: 'slowmo', x: r.width - m - s, y: r.height - m - s, r: s * 1.15, glyph: '◑' },
    ];
  }

  /** Read pointers -> set held touch actions. Call before scene uses input. */
  update(r: Renderer, input: InputManager): void {
    this.layout(r);
    if (input.pointers.size > 0) this.visible = true;
    if (!this.visible) return;
    input.touchActions.clear();
    for (const p of input.pointers.values()) {
      for (const b of this.btns) {
        const dx = p.x - b.x * r.dpr; // pointers are in backing-store px
        const dy = p.y - b.y * r.dpr;
        if (dx * dx + dy * dy <= (b.r * r.dpr) * (b.r * r.dpr)) input.touchActions.add(b.action);
      }
    }
  }

  render(r: Renderer, input: InputManager): void {
    if (!this.visible) return;
    const { ctx } = r;
    for (const b of this.btns) {
      const held = input.touchActions.has(b.action);
      ctx.fillStyle = held ? OVERLAY.btnHeld : OVERLAY.btn;
      ctx.strokeStyle = OVERLAY.scrim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      r.text(b.glyph, b.x, b.y + 1, b.r * 0.9, held ? PALETTE.bg : PALETTE.ink, 'center', 'middle');
    }
  }
}
