import { PHYSICS } from '../core/constants';
import { PALETTE } from '../render/colors';
import { Renderer } from '../render/renderer';

export interface ThrustInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/**
 * The balloon. Crisp direct-thrust movement (faithful to the recovered ±1px/frame model),
 * with an ever-present gentle horizontal "swing" the player must account for — the
 * manual's signature mechanic. No gravity. Blower gusts apply a separate decaying push.
 */
export class Balloon {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  swingPhase = 0;
  radius = PHYSICS.balloonRadius;
  thrusting = false;
  private pushVx = 0;
  private pushVy = 0;

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.pushVx = 0;
    this.pushVy = 0;
    this.swingPhase = 0;
    this.thrusting = false;
  }

  /** A gust (Mr. Blower) — added as a decaying push so it visibly shoves the balloon. */
  addImpulse(ix: number, iy: number): void {
    this.pushVx += ix;
    this.pushVy += iy;
  }

  update(dt: number, input: ThrustInput, swingMult: number): void {
    this.swingPhase += PHYSICS.swing.angularFreqBase * swingMult * dt;

    let tx = 0;
    let ty = 0;
    if (input.left) tx -= PHYSICS.moveSpeed;
    if (input.right) tx += PHYSICS.moveSpeed;
    if (input.up) ty -= PHYSICS.moveSpeed;
    if (input.down) ty += PHYSICS.moveSpeed;
    this.thrusting = input.left || input.right || input.up || input.down;

    // gentle swing rides on top of the player's horizontal target velocity
    const swingVel = PHYSICS.swing.velAmplitude * Math.sin(this.swingPhase);
    const targetVx = tx + swingVel;
    const targetVy = ty;

    const k = Math.min(1, PHYSICS.responsiveness * dt);
    this.vx += (targetVx - this.vx) * k;
    this.vy += (targetVy - this.vy) * k;

    // apply movement + decaying gust push
    this.x += (this.vx + this.pushVx) * dt;
    this.y += (this.vy + this.pushVy) * dt;
    const decay = Math.max(0, 1 - PHYSICS.pushDecayPerSec * dt);
    this.pushVx *= decay;
    this.pushVy *= decay;
  }

  render(r: Renderer): void {
    const { ctx } = r;
    const cx = r.sx(this.x);
    const cy = r.sy(this.y);
    const rad = r.sl(this.radius);
    const sway = Math.sin(this.swingPhase);

    // Player = balloon on a string with a little square basket/robot head below.
    const basketSize = rad * 1.05;
    const basketCx = cx;
    const basketCy = cy + rad * 0.95;
    const balloonCx = cx + sway * rad * 0.7;
    const balloonCy = cy - rad * 1.15;
    const balloonR = rad * 0.92;

    // string (balloon bottom -> basket top)
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = Math.max(1, rad * 0.16);
    ctx.beginPath();
    ctx.moveTo(balloonCx, balloonCy + balloonR);
    ctx.lineTo(basketCx, basketCy - basketSize * 0.5);
    ctx.stroke();

    // balloon
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.ellipse(balloonCx, balloonCy, balloonR, balloonR * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // balloon highlight
    ctx.fillStyle = PALETTE.bg;
    ctx.beginPath();
    ctx.ellipse(balloonCx - balloonR * 0.32, balloonCy - balloonR * 0.4, balloonR * 0.2, balloonR * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // basket / robot head: filled square with a light face and two eyes
    const bx = basketCx - basketSize / 2;
    const by = basketCy - basketSize / 2;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(bx, by, basketSize, basketSize);
    ctx.fillStyle = PALETTE.bg;
    const inset = basketSize * 0.16;
    ctx.fillRect(bx + inset, by + inset, basketSize - inset * 2, basketSize - inset * 2);
    // eyes
    ctx.fillStyle = PALETTE.ink;
    const eye = basketSize * 0.18;
    ctx.fillRect(basketCx - eye * 1.6, basketCy - eye * 0.6, eye, eye);
    ctx.fillRect(basketCx + eye * 0.6, basketCy - eye * 0.6, eye, eye);
  }
}
