import { Scene, SceneContext } from './scene';
import { PALETTE } from '../render/colors';
import { loadHighScores, rankTitle } from '../core/highscores';
import { Menu } from './ui';

export class HighScoresScene implements Scene {
  private menu!: Menu;
  private rows = loadHighScores();

  onEnter(ctx: SceneContext): void {
    this.rows = loadHighScores();
    this.menu = new Menu(
      [{ label: () => 'BACK', onSelect: () => void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene())) }],
      ctx.audio,
    );
  }

  update(_dt: number, ctx: SceneContext): void {
    const r = ctx.r;
    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.9, big * 0.045, big * 0.08);
    if (ctx.input.wasPressed('pause')) this.menu.items[0].onSelect();
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('HIGH SCORES', r.width / 2, r.height * 0.12, big * 0.08, PALETTE.ink, 'center', 'middle');
    const top = this.rows[0];
    if (top) r.text(rankTitle(top.score) + ' LIST', r.width / 2, r.height * 0.18, big * 0.035, PALETTE.mid, 'center', 'middle');

    const fs = big * 0.045;
    let y = r.height * 0.26;
    for (let i = 0; i < this.rows.length; i++) {
      const s = this.rows[i];
      const line = `${(i + 1).toString().padStart(2, ' ')}.  ${s.name.padEnd(3, ' ')}   ${String(s.score).padStart(7, ' ')}`;
      r.text(line, r.width / 2, y, fs, PALETTE.ink, 'center', 'middle', '600');
      y += fs * 1.5;
    }
    this.menu.render(r, r.width / 2, r.height * 0.9, big * 0.045, big * 0.08);
  }
}
