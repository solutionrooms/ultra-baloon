import { Renderer } from './renderer';
import { PALETTE, OVERLAY } from './colors';

export interface HudData {
  score: number;
  lives: number;
  levelName: string;
  timer: number; // 0..timerStart
  timerStart: number;
  flagA: boolean;
  flagB: boolean;
  slowmo: boolean;
  blowerWarn: number; // 0..1
}

export function hudHeight(r: Renderer): number {
  return Math.max(28, Math.min(r.width, r.height) * 0.07);
}

export function renderHud(r: Renderer, d: HudData): void {
  const { ctx } = r;
  const h = hudHeight(r);
  const fs = h * 0.42;

  // light bar with an ink baseline (matches the original's white status bar)
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, r.width, h);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, h - 2, r.width, 2);

  // Score
  r.text('SCORE ' + String(d.score).padStart(6, '0'), 10, h * 0.5, fs, PALETTE.ink, 'left', 'middle');

  // Flags (A / B), filled when collected
  const fx = r.width * 0.5;
  r.text(d.flagA ? '◆A' : '◇A', fx - fs * 1.6, h * 0.5, fs, d.flagA ? PALETTE.ink : PALETTE.mid, 'center', 'middle');
  r.text(d.flagB ? '◆B' : '◇B', fx + fs * 1.6, h * 0.5, fs, d.flagB ? PALETTE.ink : PALETTE.mid, 'center', 'middle');

  // Lives (balloon glyphs)
  let lx = r.width - 10;
  for (let i = 0; i < d.lives; i++) {
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.ellipse(lx - h * 0.22, h * 0.42, h * 0.12, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(lx - h * 0.23, h * 0.55, h * 0.02, h * 0.14);
    lx -= h * 0.42;
  }

  // Timer bar (second row beneath the panel) with a clock glyph + count
  const barY = h + 6;
  r.text('◷', 12, barY + 1, fs * 0.85, PALETTE.mid, 'left', 'middle');
  const barX = 30;
  const barW = r.width - barX - 64;
  const frac = Math.max(0, Math.min(1, d.timer / d.timerStart));
  ctx.fillStyle = OVERLAY.faint;
  ctx.fillRect(barX, barY - 2, barW, 4);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(barX, barY - 2, barW * frac, 4);
  r.text(String(Math.ceil(d.timer)).padStart(3, '0'), r.width - 12, barY + 1, fs * 0.8, PALETTE.mid, 'right', 'middle');

  // Level name + slow-mo indicator
  r.text(d.levelName, 12, barY + 18, fs * 0.68, PALETTE.mid, 'left', 'middle', '700');
  if (d.slowmo) r.text('SLOW-MO', r.width - 12, barY + 18, fs * 0.68, PALETTE.ink, 'right', 'middle');

  // Blower warning flash
  if (d.blowerWarn > 0.6) {
    const a = (d.blowerWarn - 0.6) / 0.4;
    ctx.fillStyle = `rgba(22,22,19,${0.12 * a})`;
    ctx.fillRect(0, 0, r.width, r.height);
    if (Math.floor(performance.now() / 200) % 2 === 0) {
      r.text('KEEP MOVING!', r.width / 2, r.height * 0.16, fs * 1.1, PALETTE.ink, 'center', 'middle');
    }
  }
}
