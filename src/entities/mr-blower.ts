import { PHYSICS } from '../core/constants';
import { Renderer } from '../render/renderer';
import { PALETTE } from '../render/colors';
import { Balloon } from './balloon';
import { Audio } from '../core/audio';

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
    const dir = this.side === 'left' ? 1 : -1; // inward direction
    const R = r.sl(20);
    const ex = r.sx(this.side === 'left' ? 0 : worldW);
    // when not fully out, slide the head partway off the edge
    const slide = (1 - faceOut) * R * 1.2;
    const hx = ex - dir * R * 0.35 - dir * -slide; // head centre
    const cx = ex + dir * (R * 0.45) - dir * slide; // face front (nose) area
    const cy = r.sy(this.atY);

    // wind puff lines (longer while actively blowing)
    if (blow > 0) {
      ctx.strokeStyle = PALETTE.mid;
      ctx.lineWidth = Math.max(1, r.sl(1.4));
      for (let i = 0; i < 4; i++) {
        const yy = cy + (i - 1.5) * R * 0.4;
        const reach = R * (1.4 + 2.6 * blow + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(cx + dir * R * 0.5, yy);
        ctx.lineTo(cx + dir * reach, yy);
        ctx.stroke();
      }
    }

    // head (profile): big rounded blob bulging inward from the edge
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.ellipse(hx, cy, R, R * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // nose bump pointing inward
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 0.18);
    ctx.lineTo(cx + dir * R * 0.55, cy);
    ctx.lineTo(cx, cy + R * 0.18);
    ctx.closePath();
    ctx.fill();

    // eye
    ctx.fillStyle = PALETTE.bg;
    ctx.beginPath();
    ctx.arc(hx + dir * R * 0.1, cy - R * 0.45, R * 0.16, 0, Math.PI * 2);
    ctx.fill();
    // pupil
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(hx + dir * R * 0.16, cy - R * 0.45, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // puffing mouth (open while blowing)
    ctx.fillStyle = PALETTE.bg;
    ctx.beginPath();
    ctx.ellipse(cx + dir * R * 0.18, cy + R * 0.12, R * (0.1 + 0.12 * blow), R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
