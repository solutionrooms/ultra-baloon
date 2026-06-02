import { Scene, SceneContext, GameSession } from './scene';
import { PALETTE, OVERLAY } from '../render/colors';
import { Renderer } from '../render/renderer';
import { addHighScore, loadHighScores, qualifies, rankTitle, HighScore } from '../core/highscores';
import { Menu } from './ui';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ .';

export class GameOverScene implements Scene {
  private entering = false;
  private initials = [0, 0, 0]; // indices into LETTERS
  private cursor = 0;
  private submitted = false;
  private menu!: Menu;
  private slotRects: { x: number; y: number; w: number; h: number; dir: number; slot: number }[] = [];
  private okRect = { x: 0, y: 0, w: 0, h: 0 };
  private table: HighScore[] = [];
  private t = 0;

  constructor(private readonly session: GameSession) {}

  onEnter(ctx: SceneContext): void {
    this.entering = qualifies(this.session.score);
    this.menu = new Menu(
      [
        { label: () => 'PLAY AGAIN', onSelect: () => this.playAgain(ctx) },
        { label: () => 'TITLE', onSelect: () => this.toTitle(ctx) },
      ],
      ctx.audio,
    );
    if (!this.entering) this.table = loadHighScores();
  }

  private playAgain(ctx: SceneContext): void {
    // lazy import avoids a cycle with game-scene
    void import('./game-scene').then((m) => ctx.setScene(m.startNewGame()));
  }
  private toTitle(ctx: SceneContext): void {
    void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene()));
  }

  private submit(): void {
    const name = this.initials.map((i) => LETTERS[i]).join('').trim() || 'AAA';
    this.table = addHighScore({ name, score: this.session.score, level: this.session.level });
    this.submitted = true;
    this.entering = false;
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    const r = ctx.r;

    if (this.entering) {
      // keyboard letter typing
      for (let c = 0; c < LETTERS.length; c++) {
        const code = c < 26 ? 'Key' + LETTERS[c] : null;
        if (code && ctx.input.codePressed(code)) {
          this.initials[this.cursor] = c;
          this.cursor = Math.min(2, this.cursor + 1);
          ctx.audio.play('menu');
        }
      }
      if (ctx.input.wasPressed('left')) this.cursor = (this.cursor + 2) % 3;
      if (ctx.input.wasPressed('right')) this.cursor = (this.cursor + 1) % 3;
      if (ctx.input.wasPressed('up')) {
        this.initials[this.cursor] = (this.initials[this.cursor] + 1) % LETTERS.length;
        ctx.audio.play('menu');
      }
      if (ctx.input.wasPressed('down')) {
        this.initials[this.cursor] = (this.initials[this.cursor] + LETTERS.length - 1) % LETTERS.length;
        ctx.audio.play('menu');
      }
      if (ctx.input.anyPressedConfirm()) this.submit();

      // touch
      for (const tap of ctx.input.taps) {
        const tx = tap.x / r.dpr;
        const ty = tap.y / r.dpr;
        for (const sr of this.slotRects) {
          if (tx >= sr.x && tx <= sr.x + sr.w && ty >= sr.y && ty <= sr.y + sr.h) {
            this.cursor = sr.slot;
            this.initials[sr.slot] = (this.initials[sr.slot] + sr.dir + LETTERS.length) % LETTERS.length;
            ctx.audio.play('menu');
          }
        }
        if (tx >= this.okRect.x && tx <= this.okRect.x + this.okRect.w && ty >= this.okRect.y && ty <= this.okRect.y + this.okRect.h) {
          this.submit();
        }
      }
      return;
    }

    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.72, big * 0.05, big * 0.09);
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('GAME OVER', r.width / 2, r.height * 0.16, big * 0.1, PALETTE.ink, 'center', 'middle');
    r.text(
      'SCORE ' + this.session.score + '  ·  ' + rankTitle(this.session.score),
      r.width / 2,
      r.height * 0.26,
      big * 0.045,
      PALETTE.mid,
      'center',
      'middle',
    );

    if (this.entering) {
      this.renderEntry(r);
    } else {
      this.renderTable(r);
      const big2 = Math.min(r.width, r.height);
      this.menu.render(r, r.width / 2, r.height * 0.72, big2 * 0.05, big2 * 0.09);
      if (this.submitted) r.text('SAVED!', r.width / 2, r.height * 0.34, big2 * 0.04, PALETTE.mid, 'center', 'middle');
    }
  }

  private renderEntry(r: Renderer): void {
    const big = Math.min(r.width, r.height);
    r.text('NEW HIGH SCORE — ENTER INITIALS', r.width / 2, r.height * 0.36, big * 0.04, PALETTE.ink, 'center', 'middle');
    const cy = r.height * 0.52;
    const slotW = big * 0.13;
    const startX = r.width / 2 - slotW;
    const fs = big * 0.11;
    this.slotRects = [];
    for (let s = 0; s < 3; s++) {
      const cx = startX + s * slotW;
      const sel = s === this.cursor;
      // up arrow
      this.slotRects.push({ x: cx - slotW * 0.35, y: cy - fs * 0.95, w: slotW * 0.7, h: fs * 0.5, dir: 1, slot: s });
      // down arrow
      this.slotRects.push({ x: cx - slotW * 0.35, y: cy + fs * 0.45, w: slotW * 0.7, h: fs * 0.5, dir: -1, slot: s });
      r.text('▲', cx, cy - fs * 0.7, fs * 0.4, PALETTE.mid, 'center', 'middle');
      r.text('▼', cx, cy + fs * 0.7, fs * 0.4, PALETTE.mid, 'center', 'middle');
      if (sel) r.roundRect(cx - slotW * 0.4, cy - fs * 0.4, slotW * 0.8, fs * 0.8, 4, OVERLAY.faint);
      r.text(LETTERS[this.initials[s]], cx, cy, fs, PALETTE.ink, 'center', 'middle');
    }
    const okW = big * 0.26;
    const okH = big * 0.08;
    this.okRect = { x: r.width / 2 - okW / 2, y: r.height * 0.68, w: okW, h: okH };
    r.roundRect(this.okRect.x, this.okRect.y, okW, okH, 6, PALETTE.ink);
    r.text('OK', r.width / 2, this.okRect.y + okH / 2, okH * 0.55, PALETTE.bg, 'center', 'middle');
    r.text('type letters · arrows · Enter', r.width / 2, r.height * 0.8, big * 0.032, PALETTE.mid, 'center', 'middle');
  }

  private renderTable(r: Renderer): void {
    const big = Math.min(r.width, r.height);
    const fs = big * 0.04;
    let y = r.height * 0.36;
    r.text('HIGH SCORES', r.width / 2, y, fs * 1.1, PALETTE.ink, 'center', 'middle');
    y += fs * 1.6;
    const rows = this.table.slice(0, 6);
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      const line = `${(i + 1).toString().padStart(2, ' ')}. ${s.name.padEnd(3, ' ')}  ${String(s.score).padStart(6, ' ')}`;
      r.text(line, r.width / 2, y, fs, PALETTE.mid, 'center', 'middle', '600');
      y += fs * 1.4;
    }
  }
}
