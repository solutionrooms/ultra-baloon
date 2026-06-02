import { Renderer } from '../render/renderer';
import { InputManager } from '../core/input';
import { Audio } from '../core/audio';
import { Settings } from '../core/settings';

/** Shared services handed to every scene. */
export interface SceneContext {
  r: Renderer;
  input: InputManager;
  audio: Audio;
  settings: Settings;
  saveSettings(): void;
  setScene(s: Scene): void;
}

export interface Scene {
  onEnter?(ctx: SceneContext): void;
  onExit?(ctx: SceneContext): void;
  /** dt is seconds (already clamped). */
  update(dt: number, ctx: SceneContext): void;
  render(ctx: SceneContext): void;
}

/** A run-through's persistent state (score, lives) shared across gameplay scenes. */
export interface GameSession {
  score: number;
  lives: number;
  level: number;
  nextExtraLifeAt: number;
}
