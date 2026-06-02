import { Scene, SceneContext } from './scene';
import { PALETTE } from '../render/colors';
import { Menu } from './ui';
import uiJson from '../data/extracted/ui.json';

const UI = uiJson as unknown as {
  appTitle: string;
  version: string;
  alerts: { about: { message: string } };
};

const LINES: string[] = [
  'A faithful web remake of the 1998 Palm OS',
  `game "The Mad Balloon" / "${UI.appTitle}" v${UI.version},`,
  'by Julian Scott.',
  '',
  `Original about box: "${UI.alerts.about.message}"`,
  '',
  'Guide your swinging balloon through the maze',
  'to the GOAL. Grab flag A then flag B for bonus',
  'points and a shot at the bonus room. Keep moving',
  '— or Mr. Blower will huff you into a wall!',
  '',
  'Controls: arrows/WASD move · Shift slow-mo · P pause',
  '',
  'Level 1 geometry & physics recovered by',
  'reverse-engineering the original ROM.',
];

export class AboutScene implements Scene {
  private menu!: Menu;

  onEnter(ctx: SceneContext): void {
    this.menu = new Menu(
      [{ label: () => 'BACK', onSelect: () => void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene())) }],
      ctx.audio,
    );
  }

  update(_dt: number, ctx: SceneContext): void {
    const r = ctx.r;
    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.92, big * 0.045, big * 0.08);
    if (ctx.input.wasPressed('pause')) this.menu.items[0].onSelect();
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('ABOUT', r.width / 2, r.height * 0.1, big * 0.07, PALETTE.ink, 'center', 'middle');
    const fs = Math.min(big * 0.032, r.width * 0.032);
    let y = r.height * 0.2;
    for (const line of LINES) {
      r.text(line, r.width / 2, y, fs, line.startsWith('Original') ? PALETTE.mid : PALETTE.ink, 'center', 'middle', '500');
      y += fs * 1.7;
    }
    this.menu.render(r, r.width / 2, r.height * 0.92, big * 0.045, big * 0.08);
  }
}
