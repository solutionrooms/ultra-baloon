import { COLORS, PALETTE } from './colors';

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Canvas renderer. Drawing happens in CSS-pixel "screen" space (this.width x this.height).
 * A camera maps world units -> screen px (set via fitWorld / follow before drawing the world).
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width = 0; // CSS px
  height = 0;
  dpr = 1;

  // camera: screenX = (worldX - camX) * zoom + offX
  private camX = 0;
  private camY = 0;
  private zoom = 1;
  private offX = 0;
  private offY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unsupported');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = Math.max(1, Math.floor(window.innerWidth));
    const cssH = Math.max(1, Math.floor(window.innerHeight));
    this.dpr = dpr;
    this.width = cssW;
    this.height = cssH;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
  }

  beginFrame(): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  // ---- Camera --------------------------------------------------------------

  /** Fit a world rect into a screen rect, preserving aspect (contain), and center it. */
  fitWorld(world: ScreenRect, screen: ScreenRect): void {
    const zx = screen.w / world.w;
    const zy = screen.h / world.h;
    this.zoom = Math.min(zx, zy);
    const drawnW = world.w * this.zoom;
    const drawnH = world.h * this.zoom;
    this.offX = screen.x + (screen.w - drawnW) / 2;
    this.offY = screen.y + (screen.h - drawnH) / 2;
    this.camX = world.x;
    this.camY = world.y;
  }

  /** Center the camera on a world point at a fixed zoom (world units per screen). */
  follow(centerX: number, centerY: number, worldUnitsAcross: number, screen: ScreenRect): void {
    this.zoom = screen.w / worldUnitsAcross;
    this.camX = centerX - screen.w / 2 / this.zoom;
    this.camY = centerY - screen.h / 2 / this.zoom;
    this.offX = screen.x;
    this.offY = screen.y;
  }

  get worldZoom(): number {
    return this.zoom;
  }
  sx(wx: number): number {
    return (wx - this.camX) * this.zoom + this.offX;
  }
  sy(wy: number): number {
    return (wy - this.camY) * this.zoom + this.offY;
  }
  sl(len: number): number {
    return len * this.zoom;
  }

  // ---- World-space primitives ---------------------------------------------

  worldRect(wx: number, wy: number, w: number, h: number, fill: string): void {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(this.sx(wx), this.sy(wy), w * this.zoom, h * this.zoom);
  }

  /** Brick-textured wall: black fill, light grid lines, gray diamonds — aligned to a world grid
   * so adjacent walls tile seamlessly (matches the original game's wall look). */
  texturedWorldRect(wx: number, wy: number, w: number, h: number): void {
    const { ctx } = this;
    const sx0 = this.sx(wx);
    const sy0 = this.sy(wy);
    const sw = w * this.zoom;
    const sh = h * this.zoom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx0, sy0, sw, sh);
    ctx.clip();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(sx0, sy0, sw, sh);

    const CELL = 9; // world units
    const cellPx = CELL * this.zoom;
    if (cellPx >= 4) {
      const gx0 = Math.floor(wx / CELL) * CELL;
      const gy0 = Math.floor(wy / CELL) * CELL;
      ctx.strokeStyle = PALETTE.light;
      ctx.lineWidth = Math.max(0.5, this.zoom * 0.5);
      for (let gx = gx0; gx <= wx + w + CELL; gx += CELL) {
        const X = this.sx(gx);
        ctx.beginPath();
        ctx.moveTo(X, sy0);
        ctx.lineTo(X, sy0 + sh);
        ctx.stroke();
      }
      for (let gy = gy0; gy <= wy + h + CELL; gy += CELL) {
        const Y = this.sy(gy);
        ctx.beginPath();
        ctx.moveTo(sx0, Y);
        ctx.lineTo(sx0 + sw, Y);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.mid;
      const ds = cellPx * 0.3;
      for (let gx = gx0; gx <= wx + w + CELL; gx += CELL) {
        for (let gy = gy0; gy <= wy + h + CELL; gy += CELL) {
          const cxp = this.sx(gx + CELL / 2);
          const cyp = this.sy(gy + CELL / 2);
          ctx.beginPath();
          ctx.moveTo(cxp, cyp - ds);
          ctx.lineTo(cxp + ds, cyp);
          ctx.lineTo(cxp, cyp + ds);
          ctx.lineTo(cxp - ds, cyp);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  worldRectOutline(wx: number, wy: number, w: number, h: number, stroke: string, lw = 1): void {
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = lw;
    this.ctx.strokeRect(this.sx(wx), this.sy(wy), w * this.zoom, h * this.zoom);
  }

  worldCircle(wx: number, wy: number, r: number, fill: string): void {
    this.ctx.fillStyle = fill;
    this.ctx.beginPath();
    this.ctx.arc(this.sx(wx), this.sy(wy), r * this.zoom, 0, Math.PI * 2);
    this.ctx.fill();
  }

  worldLine(x1: number, y1: number, x2: number, y2: number, stroke: string, lw = 1): void {
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = lw;
    this.ctx.beginPath();
    this.ctx.moveTo(this.sx(x1), this.sy(y1));
    this.ctx.lineTo(this.sx(x2), this.sy(y2));
    this.ctx.stroke();
  }

  // ---- Screen-space helpers ------------------------------------------------

  rect(x: number, y: number, w: number, h: number, fill: string): void {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(x, y, w, h);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, fill: string): void {
    const { ctx } = this;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  text(
    str: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left',
    baseline: CanvasTextBaseline = 'alphabetic',
    weight = '700',
  ): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(str, x, y);
  }

  measure(str: string, size: number, weight = '700'): number {
    this.ctx.font = `${weight} ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    return this.ctx.measureText(str).width;
  }
}
