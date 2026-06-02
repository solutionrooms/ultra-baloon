import { Scene, SceneContext } from './scene';
import { PALETTE, OVERLAY } from '../render/colors';
import { MAX_LEVEL, levelName } from '../levels/level-loader';

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
}

/** Pick any of the 10 levels to start from. */
export class LevelSelectScene implements Scene {
  private index = 0;
  private cells: Cell[] = [];
  private backRect = { x: 0, y: 0, w: 0, h: 0 };

  private readonly cols = 2;
  private readonly rows = Math.ceil(MAX_LEVEL / 2);

  private layout(ctx: SceneContext): void {
    const r = ctx.r;
    const top = r.height * 0.2;
    const areaH = r.height * 0.62;
    const cellH = areaH / this.rows;
    const cellW = Math.min(r.width * 0.42, 360);
    const gapX = r.width * 0.04;
    const totalW = this.cols * cellW + gapX;
    const startX = (r.width - totalW) / 2;
    this.cells = [];
    for (let i = 0; i < MAX_LEVEL; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      this.cells.push({
        x: startX + col * (cellW + gapX),
        y: top + row * cellH,
        w: cellW,
        h: cellH * 0.86,
        level: i + 1,
      });
    }
    const bw = r.width * 0.3;
    this.backRect = { x: r.width / 2 - bw / 2, y: top + this.rows * cellH + 8, w: bw, h: r.height * 0.07 };
  }

  private start(ctx: SceneContext, level: number): void {
    ctx.audio.unlock();
    void import('./game-scene').then((m) => ctx.setScene(m.startNewGame(level)));
  }

  update(_dt: number, ctx: SceneContext): void {
    this.layout(ctx);
    const input = ctx.input;
    if (input.wasPressed('left')) {
      this.index = (this.index + MAX_LEVEL - 1) % MAX_LEVEL;
      ctx.audio.play('menu');
    }
    if (input.wasPressed('right')) {
      this.index = (this.index + 1) % MAX_LEVEL;
      ctx.audio.play('menu');
    }
    if (input.wasPressed('up')) {
      this.index = (this.index + MAX_LEVEL - this.cols) % MAX_LEVEL;
      ctx.audio.play('menu');
    }
    if (input.wasPressed('down')) {
      this.index = (this.index + this.cols) % MAX_LEVEL;
      ctx.audio.play('menu');
    }
    if (input.anyPressedConfirm()) {
      this.start(ctx, this.index + 1);
      return;
    }
    if (input.wasPressed('pause')) {
      void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene()));
      return;
    }
    for (const t of input.taps) {
      const tx = t.x / ctx.r.dpr;
      const ty = t.y / ctx.r.dpr;
      for (const c of this.cells) {
        if (tx >= c.x && tx <= c.x + c.w && ty >= c.y && ty <= c.y + c.h) {
          this.start(ctx, c.level);
          return;
        }
      }
      if (tx >= this.backRect.x && tx <= this.backRect.x + this.backRect.w && ty >= this.backRect.y && ty <= this.backRect.y + this.backRect.h) {
        void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene()));
        return;
      }
    }
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('SELECT LEVEL', r.width / 2, r.height * 0.12, big * 0.07, PALETTE.ink, 'center', 'middle');
    const fs = Math.min(big * 0.034, 22);
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      const sel = i === this.index;
      r.roundRect(c.x, c.y, c.w, c.h, 6, sel ? OVERLAY.btnHeld : OVERLAY.btn);
      const cyc = c.y + c.h / 2;
      r.text(`${c.level}.`, c.x + fs, cyc, fs, sel ? PALETTE.bg : PALETTE.ink, 'left', 'middle');
      r.text(levelName(c.level), c.x + fs * 2.4, cyc, fs * 0.92, sel ? PALETTE.bg : PALETTE.mid, 'left', 'middle');
    }
    const sel = this.backRect;
    r.roundRect(sel.x, sel.y, sel.w, sel.h, 6, OVERLAY.faint);
    r.text('BACK', r.width / 2, sel.y + sel.h / 2, big * 0.04, PALETTE.ink, 'center', 'middle');
  }
}
