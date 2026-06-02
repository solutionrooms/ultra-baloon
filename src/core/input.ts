import { Action, KeyBindings, loadBindings } from './preferences';

export interface Pointer {
  id: number;
  x: number; // canvas backing-store px
  y: number;
  downX: number;
  downY: number;
}

/**
 * Low-level input: keyboard (bound to actions) + raw pointers (mouse/touch).
 * Higher layers (touch controls, menus) read pointers / action state from here.
 */
export class InputManager {
  bindings: KeyBindings;
  private readonly held = new Set<string>(); // currently-down key codes
  private readonly pressedThisFrame = new Set<string>(); // edge-down codes
  readonly pointers = new Map<number, Pointer>();
  readonly taps: { x: number; y: number }[] = []; // pointerdown locations this frame

  /** Action states injected by on-screen touch controls (cleared by their owner each frame). */
  readonly touchActions = new Set<Action>();

  /** When set, the next keydown is captured here instead of normal handling (key rebinding). */
  captureKey: ((code: string) => void) | null = null;

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindings = loadBindings();

    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  reloadBindings(): void {
    this.bindings = loadBindings();
  }

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / r.width;
    const sy = this.canvas.height / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.captureKey) {
      e.preventDefault();
      const cb = this.captureKey;
      this.captureKey = null;
      cb(e.code);
      return;
    }
    // prevent page scroll for keys we use
    if (this.isBoundCode(e.code) || e.code === 'Space') e.preventDefault();
    if (!this.held.has(e.code)) this.pressedThisFrame.add(e.code);
    this.held.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onBlur = (): void => {
    this.held.clear();
    this.pointers.clear();
    this.touchActions.clear();
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.toCanvasCoords(e.clientX, e.clientY);
    this.pointers.set(e.pointerId, { id: e.pointerId, x: p.x, y: p.y, downX: p.x, downY: p.y });
    this.taps.push({ x: p.x, y: p.y });
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const existing = this.pointers.get(e.pointerId);
    if (!existing) return;
    const p = this.toCanvasCoords(e.clientX, e.clientY);
    existing.x = p.x;
    existing.y = p.y;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
  };

  private isBoundCode(code: string): boolean {
    for (const a of Object.keys(this.bindings) as Action[]) {
      if (this.bindings[a].includes(code)) return true;
    }
    return false;
  }

  /** Held = keyboard binding down OR touch control active. */
  isHeld(action: Action): boolean {
    if (this.touchActions.has(action)) return true;
    for (const code of this.bindings[action]) if (this.held.has(code)) return true;
    return false;
  }

  /** Edge: pressed since last endFrame() (keyboard only — taps cover touch menus). */
  wasPressed(action: Action): boolean {
    for (const code of this.bindings[action]) if (this.pressedThisFrame.has(code)) return true;
    return false;
  }

  anyPressed(): boolean {
    return this.pressedThisFrame.size > 0 || this.taps.length > 0;
  }

  /** Enter / Space pressed this frame (menu confirm). */
  anyPressedConfirm(): boolean {
    return this.pressedThisFrame.has('Enter') || this.pressedThisFrame.has('Space');
  }

  /** True if the given key code went down this frame (for rebinding / debug). */
  codePressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.taps.length = 0;
  }
}
