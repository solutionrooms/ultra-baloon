import { load, save } from './storage';

export type Action = 'left' | 'right' | 'up' | 'down' | 'slowmo' | 'pause';

export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'slowmo', 'pause'];

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Left',
  right: 'Right',
  up: 'Thrust Up',
  down: 'Thrust Down',
  slowmo: 'Slow-Mo',
  pause: 'Pause',
};

/** Maps a keyboard `event.code` to a game action. */
export type KeyBindings = Record<Action, string[]>;

const KEY = 'ultra-balloon-preferences';

export const DEFAULT_BINDINGS: KeyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  slowmo: ['ShiftLeft', 'ShiftRight'],
  pause: ['KeyP', 'Escape'],
};

export function loadBindings(): KeyBindings {
  const stored = load<KeyBindings>(KEY, DEFAULT_BINDINGS);
  // ensure all actions present (forward-compat)
  const result = {} as KeyBindings;
  for (const a of ACTIONS) result[a] = stored[a]?.length ? stored[a] : DEFAULT_BINDINGS[a];
  return result;
}

export function saveBindings(b: KeyBindings): void {
  save(KEY, b);
}
