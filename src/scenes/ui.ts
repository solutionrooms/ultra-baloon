import { Renderer } from '../render/renderer';
import { InputManager } from '../core/input';
import { PALETTE, OVERLAY } from '../render/colors';
import { Audio } from '../core/audio';

export interface MenuItem {
  label: () => string;
  onSelect: () => void;
}

/** Vertical list menu: keyboard (up/down/enter) + pointer tap. */
export class Menu {
  index = 0;
  private rects: { x: number; y: number; w: number; h: number }[] = [];

  constructor(
    public items: MenuItem[],
    private audio: Audio,
  ) {}

  update(r: Renderer, input: InputManager, centerX: number, startY: number, _fontSize: number, spacing: number): void {
    // layout
    this.rects = this.items.map((_, i) => {
      const y = startY + i * spacing;
      return { x: centerX - r.width * 0.4, y: y - spacing * 0.45, w: r.width * 0.8, h: spacing * 0.9 };
    });

    if (input.wasPressed('up') || input.wasPressed('left')) {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.audio.play('menu');
    }
    if (input.wasPressed('down') || input.wasPressed('right')) {
      this.index = (this.index + 1) % this.items.length;
      this.audio.play('menu');
    }
    // Enter / Space select
    if (input.anyPressedConfirm()) {
      this.audio.play('menu');
      this.items[this.index].onSelect();
      return;
    }
    // taps
    for (const t of input.taps) {
      const tx = t.x / r.dpr;
      const ty = t.y / r.dpr;
      for (let i = 0; i < this.rects.length; i++) {
        const rc = this.rects[i];
        if (tx >= rc.x && tx <= rc.x + rc.w && ty >= rc.y && ty <= rc.y + rc.h) {
          this.index = i;
          this.audio.play('menu');
          this.items[i].onSelect();
          return;
        }
      }
    }
  }

  render(r: Renderer, centerX: number, startY: number, fontSize: number, spacing: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const y = startY + i * spacing;
      const sel = i === this.index;
      if (sel) {
        const w = r.measure(this.items[i].label(), fontSize) + fontSize * 2;
        r.roundRect(centerX - w / 2, y - spacing * 0.4, w, spacing * 0.8, spacing * 0.18, OVERLAY.faint);
      }
      r.text(
        (sel ? '▸ ' : '') + this.items[i].label(),
        centerX,
        y,
        fontSize,
        PALETTE.ink,
        'center',
        'middle',
      );
    }
  }
}
