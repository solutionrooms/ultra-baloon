import { Scene, SceneContext } from './scene';
import { PALETTE } from '../render/colors';
import { Menu } from './ui';
import { Difficulty, loadProgress } from '../core/settings';
import { MAX_LEVEL } from '../levels/level-loader';
import { resetHighScores } from '../core/highscores';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

export class OptionsScene implements Scene {
  private menu!: Menu;
  private note = '';

  onEnter(ctx: SceneContext): void {
    const maxStart = Math.max(1, Math.min(loadProgress().highestLevel, MAX_LEVEL));
    this.menu = new Menu(
      [
        {
          label: () => 'Difficulty: ' + ctx.settings.difficulty.toUpperCase(),
          onSelect: () => {
            const i = DIFFS.indexOf(ctx.settings.difficulty);
            ctx.settings.difficulty = DIFFS[(i + 1) % DIFFS.length];
            ctx.saveSettings();
          },
        },
        {
          label: () => 'Sound: ' + (ctx.settings.sound ? 'ON' : 'OFF'),
          onSelect: () => {
            ctx.settings.sound = !ctx.settings.sound;
            ctx.audio.enabled = ctx.settings.sound;
            ctx.saveSettings();
          },
        },
        {
          label: () => 'Start Level: ' + ctx.settings.startLevel + (maxStart <= 1 ? ' (1 available)' : ''),
          onSelect: () => {
            ctx.settings.startLevel = (ctx.settings.startLevel % maxStart) + 1;
            ctx.saveSettings();
          },
        },
        { label: () => 'Remap Keys', onSelect: () => void import('./preferences-scene').then((m) => ctx.setScene(new m.PreferencesScene())) },
        {
          label: () => 'Reset High Scores',
          onSelect: () => {
            resetHighScores();
            this.note = 'High scores reset.';
          },
        },
        { label: () => 'Back', onSelect: () => void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene())) },
      ],
      ctx.audio,
    );
  }

  update(_dt: number, ctx: SceneContext): void {
    const r = ctx.r;
    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.3, big * 0.045, big * 0.095);
    if (ctx.input.wasPressed('pause')) void import('./title-scene').then((m) => ctx.setScene(new m.TitleScene()));
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('OPTIONS', r.width / 2, r.height * 0.14, big * 0.08, PALETTE.ink, 'center', 'middle');
    this.menu.render(r, r.width / 2, r.height * 0.3, big * 0.045, big * 0.095);
    if (this.note) r.text(this.note, r.width / 2, r.height * 0.92, big * 0.032, PALETTE.mid, 'center', 'middle');
  }
}
