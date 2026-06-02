import { Scene, SceneContext } from './scene';
import { PALETTE, OVERLAY } from '../render/colors';
import { Menu } from './ui';
import { ACTIONS, ACTION_LABELS, DEFAULT_BINDINGS, KeyBindings, loadBindings, saveBindings } from '../core/preferences';

function keyName(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  return code.replace('Left', ' L').replace('Right', ' R');
}

export class PreferencesScene implements Scene {
  private menu!: Menu;
  private bindings: KeyBindings = loadBindings();
  private capturing: string | null = null;

  onEnter(ctx: SceneContext): void {
    this.bindings = loadBindings();
    const items = ACTIONS.map((a) => ({
      label: () => `${ACTION_LABELS[a]}: ${this.bindings[a].map(keyName).join(' / ')}`,
      onSelect: () => this.beginCapture(ctx, a),
    }));
    items.push({ label: () => 'Reset to Defaults', onSelect: () => this.reset(ctx) });
    items.push({ label: () => 'Back', onSelect: () => void import('./options-scene').then((m) => ctx.setScene(new m.OptionsScene())) });
    this.menu = new Menu(items, ctx.audio);
  }

  private beginCapture(ctx: SceneContext, action: string): void {
    this.capturing = action;
    ctx.input.captureKey = (code: string) => {
      this.capturing = null;
      if (code === 'Escape') return;
      this.bindings[action as keyof KeyBindings] = [code];
      saveBindings(this.bindings);
      ctx.input.reloadBindings();
    };
  }

  private reset(ctx: SceneContext): void {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    saveBindings(this.bindings);
    ctx.input.reloadBindings();
  }

  update(_dt: number, ctx: SceneContext): void {
    if (this.capturing) {
      // Allow cancelling a rebind by tapping (touch devices have no keyboard to press Esc).
      if (ctx.input.taps.length > 0) {
        this.capturing = null;
        ctx.input.captureKey = null;
      }
      return;
    }
    const r = ctx.r;
    const big = Math.min(r.width, r.height);
    this.menu.update(r, ctx.input, r.width / 2, r.height * 0.24, big * 0.04, big * 0.075);
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const big = Math.min(r.width, r.height);
    r.text('REMAP KEYS', r.width / 2, r.height * 0.12, big * 0.07, PALETTE.ink, 'center', 'middle');
    this.menu.render(r, r.width / 2, r.height * 0.24, big * 0.04, big * 0.075);
    if (this.capturing) {
      r.ctx.fillStyle = OVERLAY.panel;
      r.ctx.fillRect(0, 0, r.width, r.height);
      r.text('Press a key…', r.width / 2, r.height * 0.46, big * 0.06, PALETTE.bg, 'center', 'middle');
      r.text('(Esc or tap to cancel)', r.width / 2, r.height * 0.54, big * 0.035, PALETTE.light, 'center', 'middle');
    }
  }
}
