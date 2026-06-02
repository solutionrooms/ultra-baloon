import { Renderer } from './renderer';
import iconJson from '../data/extracted/icon.json';

const ICON = iconJson as unknown as { width: number; height: number; pixels: number[][] };

/** Draw the byte-exact recovered 32×32 app icon at (x,y) top-left, each source pixel `scale` px. */
export function drawIcon(r: Renderer, x: number, y: number, scale: number, color: string): void {
  const { ctx } = r;
  ctx.fillStyle = color;
  for (let row = 0; row < ICON.height; row++) {
    const line = ICON.pixels[row];
    for (let col = 0; col < ICON.width; col++) {
      if (line[col]) ctx.fillRect(x + col * scale, y + row * scale, scale + 0.5, scale + 0.5);
    }
  }
}

export const ICON_SIZE = ICON.width;
