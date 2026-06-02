import { PHYSICS } from '../core/constants';
import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';
import { Balloon } from './balloon';
import { Audio } from '../core/audio';
import { drawBlowerFace } from '../render/sprites';

/** Appears when the player idles too long and blows the balloon toward a wall. */
export class MrBlower {
  private idle = 0;
  blowing = 0; // seconds of blow animation remaining
  side: 'left' | 'right' = 'left';
  private atY = 0;

  reset(): void {
    this.idle = 0;
    this.blowing = 0;
  }

  /** 0..1 — how close to blowing (for the on-screen warning). */
  get idleRatio(): number {
    return Math.min(1, this.idle / PHYSICS.blowerIdleSeconds);
  }

  update(dt: number, balloon: Balloon, worldW: number, audio: Audio): void {
    if (this.blowing > 0) this.blowing -= dt;
    this.atY = balloon.y;
    if (this.blowing <= 0) this.side = balloon.x < worldW / 2 ? 'left' : 'right';

    // "Remain stationary" = the player isn't actively steering.
    if (balloon.thrusting) {
      this.idle = Math.max(0, this.idle - dt * 2);
    } else {
      this.idle += dt;
    }

    if (this.idle >= PHYSICS.blowerIdleSeconds && this.blowing <= 0) {
      this.side = balloon.x < worldW / 2 ? 'left' : 'right';
      const dir = this.side === 'left' ? 1 : -1;
      balloon.addImpulse(dir * PHYSICS.blowerForce, -PHYSICS.blowerForce * 0.1);
      this.blowing = 1.0;
      this.idle = 0;
      audio.play('blower');
    }
  }

  render(r: Renderer, worldW: number): void {
    const blow = this.blowing > 0 ? Math.min(1, this.blowing) : 0;
    const warn = this.idleRatio > 0.5 ? (this.idleRatio - 0.5) / 0.5 : 0;
    const faceOut = blow > 0 ? 1 : warn; // 0 hidden, 1 fully out
    if (faceOut <= 0.02) return;

    const { ctx } = r;
    const dir = this.side === 'left' ? 1 : -1;
    const targetH = r.sl(40); // ~40 world units tall, like the original
    const ex = r.sx(this.side === 'left' ? 0 : worldW);
    // slide the head partway off the edge when only warning (not yet blowing)
    const slide = (1 - faceOut) * targetH * 0.5;
    const edgeX = ex - dir * slide;
    const cy = r.sy(this.atY);

    // wind puff lines while actively blowing
    if (blow > 0) {
      ctx.strokeStyle = PALETTE.mid;
      ctx.lineWidth = Math.max(1, r.sl(1.4));
      const mouthX = edgeX + dir * targetH * 0.85;
      for (let i = 0; i < 4; i++) {
        const yy = cy + (i - 1.5) * targetH * 0.18;
        const reach = targetH * (0.4 + 2.4 * blow + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(mouthX, yy);
        ctx.lineTo(mouthX + dir * reach, yy);
        ctx.stroke();
      }
    }

    // recovered Mr. Blower face — frame 1 (mouth wide) while blowing, with a quick huff;
    // frame 0 (calmer) while only warning.
    const frame = blow > 0 ? (Math.floor(performance.now() / 110) % 2 === 0 ? 1 : 3) : 0;
    drawBlowerFace(r, frame, edgeX, cy, targetH, this.side);
  }
}
