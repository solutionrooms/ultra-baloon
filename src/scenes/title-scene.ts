import { Scene, SceneContext } from './scene';
import { PALETTE } from '../render/colors';
import { Menu } from './ui';
import { drawIcon, ICON_SIZE } from '../render/sprites';

interface Drifter {
  x: number;
  y: number;
  vx: number;
  r: number;
  ph: number;
}

export class TitleScene implements Scene {
  private menu!: Menu;
  private t = 0;
  private drifters: Drifter[] = [];

  onEnter(ctx: SceneContext): void {
    this.menu = new Menu(
      [
        { label: () => 'PLAY', onSelect: () => this.play(ctx) },
        { label: () => 'HIGH SCORES', onSelect: () => void import('./high-scores-scene').then((m) => ctx.setScene(new m.HighScoresScene())) },
        { label: () => 'OPTIONS', onSelect: () => void import('./options-scene').then((m) => ctx.setScene(new m.OptionsScene())) },
        { label: () => 'ABOUT', onSelect: () => void import('./about-scene').then((m) => ctx.setScene(new m.AboutScene())) },
      ],
      ctx.audio,
    );
    this.drifters = [];
    for (let i = 0; i < 6; i++) {
      this.drifters.push({
        x: Math.random(),
        y: Math.random(),
        vx: 0.01 + Math.random() * 0.03,
        r: 6 + Math.random() * 10,
        ph: Math.random() * 6,
      });
    }
  }

  private play(ctx: SceneContext): void {
    ctx.audio.unlock();
    void import('./game-scene').then((m) => ctx.setScene(m.startNewGame()));
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    if (ctx.input.anyPressed()) ctx.audio.unlock();
    for (const d of this.drifters) {
      d.x += d.vx * dt;
      if (d.x > 1.1) d.x = -0.1;
    }
    const r = ctx.r;
    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.56, big * 0.05, big * 0.085);
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);

    // drifting decorative balloons
    for (const d of this.drifters) {
      const x = d.x * r.width;
      const y = d.y * r.height * 0.9 + Math.sin(this.t + d.ph) * 6;
      r.ctx.fillStyle = PALETTE.light;
      r.ctx.beginPath();
      r.ctx.ellipse(x, y, d.r, d.r * 1.12, 0, 0, Math.PI * 2);
      r.ctx.fill();
      r.ctx.strokeStyle = PALETTE.mid;
      r.ctx.lineWidth = 1;
      r.ctx.beginPath();
      r.ctx.moveTo(x, y + d.r);
      r.ctx.lineTo(x, y + d.r * 2.2);
      r.ctx.stroke();
    }

    // logo icon
    const scale = Math.max(2, Math.floor(big * 0.0075));
    const iconW = ICON_SIZE * scale;
    drawIcon(r, r.width / 2 - iconW / 2, r.height * 0.07, scale, PALETTE.ink);

    r.text('ULTRA BALLOON', r.width / 2, r.height * 0.36, big * 0.092, PALETTE.ink, 'center', 'middle');
    r.text('a remake of The Mad Balloon', r.width / 2, r.height * 0.41, big * 0.034, PALETTE.mid, 'center', 'middle');

    this.menu.render(r, r.width / 2, r.height * 0.56, big * 0.05, big * 0.085);

    r.text('© Julian Scott 1998', r.width / 2, r.height * 0.94, big * 0.028, PALETTE.mid, 'center', 'middle');
  }
}
