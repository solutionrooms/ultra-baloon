import { Renderer } from './render/renderer';
import { InputManager } from './core/input';
import { Audio } from './core/audio';
import { loadSettings, saveSettings } from './core/settings';
import { Scene, SceneContext } from './scenes/scene';
import { TitleScene } from './scenes/title-scene';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputManager(canvas);
const audio = new Audio();
const settings = loadSettings();
audio.enabled = settings.sound;

let current: Scene;
let pending: Scene | null = null;

const ctx: SceneContext = {
  r: renderer,
  input,
  audio,
  settings,
  saveSettings: () => saveSettings(settings),
  setScene: (s: Scene) => {
    // First request wins — avoids async-import races queuing two transitions.
    if (pending) return;
    pending = s;
  },
};

function activate(scene: Scene): void {
  current?.onExit?.(ctx);
  current = scene;
  input.resetTransient();
  current.onEnter?.(ctx);
}

window.addEventListener('resize', () => renderer.resize());
// unlock audio on first gesture (mobile autoplay policy)
const unlock = (): void => audio.unlock();
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

let last = performance.now();
function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp big stalls (tab switches)

  renderer.resize();
  try {
    current.update(dt, ctx);
    current.render(ctx);
  } catch (e) {
    // Keep the loop alive on a transient error rather than freezing the game.
    console.error('[ultra-balloon] frame error:', e);
  }
  input.endFrame();

  if (pending) {
    const next = pending;
    pending = null;
    activate(next);
  }
  requestAnimationFrame(frame);
}

activate(new TitleScene());
requestAnimationFrame(frame);
