import { Scene, SceneContext, GameSession } from './scene';
import { Balloon } from '../entities/balloon';
import { resolveCircleVsRects } from '../levels/maze';
import { Rect } from '../levels/level-data';
import { PHYSICS, SCORING } from '../core/constants';
import { SWING_BY_DIFFICULTY } from '../core/settings';
import { PALETTE, OVERLAY } from '../render/colors';
import { renderHud, hudHeight } from '../render/hud';
import { TouchControls } from '../render/touch-controls';
import { circleCircle } from '../math/collision';

export type BonusMode = 'room' | 'survival';

interface Diamond {
  x: number;
  y: number;
  taken: boolean;
  spin: number;
}
interface Bouncer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const W = 180;
const H = 168;

export class BonusScene implements Scene {
  private readonly balloon = new Balloon();
  private readonly walls: Rect[] = [
    { x: 0, y: 0, w: W, h: 10 },
    { x: 0, y: H - 10, w: W, h: 10 },
    { x: 0, y: 0, w: 10, h: H },
    { x: W - 10, y: 0, w: 10, h: H },
  ];
  private diamonds: Diamond[] = [];
  private bouncers: Bouncer[] = [];
  private collected = 0;
  private timeLeft: number;
  private touch = new TouchControls();
  private intro = 1.6;
  private over = 0;
  private audio!: import('../core/audio').Audio;

  constructor(
    private readonly mode: BonusMode,
    private readonly session: GameSession,
    private readonly buildNext: () => Scene,
  ) {
    this.timeLeft = mode === 'room' ? 11 : 30;
  }

  onEnter(ctx: SceneContext): void {
    this.audio = ctx.audio;
    this.balloon.reset(W / 2, H - 30);
    if (this.mode === 'room') {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          this.diamonds.push({
            x: 30 + col * 40,
            y: 32 + row * 34,
            taken: false,
            spin: Math.random() * 6,
          });
        }
      }
    } else {
      this.spawnDiamond();
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 55 + Math.random() * 30;
        this.bouncers.push({
          x: 30 + Math.random() * (W - 60),
          y: 30 + Math.random() * (H - 80),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: 7,
        });
      }
    }
  }

  private spawnDiamond(): void {
    this.diamonds = [
      {
        x: 25 + Math.random() * (W - 50),
        y: 25 + Math.random() * (H - 60),
        taken: false,
        spin: 0,
      },
    ];
  }

  update(dtRaw: number, ctx: SceneContext): void {
    this.touch.update(ctx.r, ctx.input);
    if (this.intro > 0) {
      this.intro -= dtRaw;
      return;
    }
    if (this.over > 0) {
      this.over -= dtRaw;
      if (this.over <= 0) ctx.setScene(this.buildNext());
      return;
    }

    const slowmo = ctx.input.isHeld('slowmo');
    const dt = Math.min(dtRaw, 1 / 30) * (slowmo ? PHYSICS.slowMoFactor : 1);
    const swing = SWING_BY_DIFFICULTY[ctx.settings.difficulty];

    this.balloon.update(dt, {
      left: ctx.input.isHeld('left'),
      right: ctx.input.isHeld('right'),
      up: ctx.input.isHeld('up'),
      down: ctx.input.isHeld('down'),
    }, swing);
    const res = resolveCircleVsRects(this.balloon, this.balloon.radius, this.walls);
    if (res.hit) {
      const vn = this.balloon.vx * res.nx + this.balloon.vy * res.ny;
      if (vn < 0) {
        this.balloon.vx -= vn * res.nx;
        this.balloon.vy -= vn * res.ny;
      }
    }
    if (ctx.settings.sound) this.audio.setThrust(this.balloon.thrusting ? 0.7 : 0);

    // diamonds
    for (const d of this.diamonds) {
      d.spin += dt * 4;
      if (!d.taken && circleCircle(this.balloon.x, this.balloon.y, this.balloon.radius + 7, d.x, d.y, 6)) {
        d.taken = true;
        this.collected++;
        ctx.audio.play('diamond');
        if (this.mode === 'room') {
          this.session.score += SCORING.bonusRoomPerDiamond;
        } else {
          this.session.score += SCORING.bonusLevelDiamondBase + SCORING.bonusLevelDiamondStep * (this.collected - 1);
          this.spawnDiamond();
        }
        this.checkExtraLife(ctx);
      }
    }
    if (this.mode === 'room' && this.diamonds.every((d) => d.taken)) this.finish(ctx);

    // bouncers (survival)
    for (const b of this.bouncers) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 10 + b.r) {
        b.x = 10 + b.r;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > W - 10 - b.r) {
        b.x = W - 10 - b.r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < 10 + b.r) {
        b.y = 10 + b.r;
        b.vy = Math.abs(b.vy);
      }
      if (b.y > H - 10 - b.r) {
        b.y = H - 10 - b.r;
        b.vy = -Math.abs(b.vy);
      }
      if (circleCircle(this.balloon.x, this.balloon.y, this.balloon.radius, b.x, b.y, b.r)) {
        this.finish(ctx); // hit ends the bonus (no life lost)
        return;
      }
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.finish(ctx);
  }

  private checkExtraLife(ctx: SceneContext): void {
    while (this.session.score >= this.session.nextExtraLifeAt) {
      this.session.lives++;
      this.session.nextExtraLifeAt += SCORING.extraLifeEvery;
      ctx.audio.play('extraLife');
    }
  }

  private finish(ctx: SceneContext): void {
    if (this.over > 0) return;
    this.audio.setThrust(0);
    ctx.audio.play('goal');
    this.over = 1.4;
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const top = hudHeight(r) + 24;
    r.fitWorld({ x: 0, y: 0, w: W, h: H }, { x: 0, y: top, w: r.width, h: r.height - top });

    r.worldRect(0, 0, W, H, PALETTE.bg);
    for (const w of this.walls) r.texturedWorldRect(w.x, w.y, w.w, w.h);

    // diamonds
    for (const d of this.diamonds) {
      if (d.taken) continue;
      const cx = r.sx(d.x);
      const cy = r.sy(d.y);
      const s = r.sl(6 + Math.sin(d.spin) * 1.2);
      r.ctx.fillStyle = PALETTE.ink;
      r.ctx.beginPath();
      r.ctx.moveTo(cx, cy - s);
      r.ctx.lineTo(cx + s * 0.8, cy);
      r.ctx.lineTo(cx, cy + s);
      r.ctx.lineTo(cx - s * 0.8, cy);
      r.ctx.closePath();
      r.ctx.fill();
    }

    // bouncers
    for (const b of this.bouncers) {
      r.worldCircle(b.x, b.y, b.r, PALETTE.ink);
      r.ctx.fillStyle = PALETTE.bg;
      const ex = r.sl(b.r * 0.3);
      r.ctx.fillRect(r.sx(b.x) - ex * 1.6, r.sy(b.y) - ex, ex, ex);
      r.ctx.fillRect(r.sx(b.x) + ex * 0.6, r.sy(b.y) - ex, ex, ex);
    }

    this.balloon.render(r);

    renderHud(r, {
      score: this.session.score,
      lives: this.session.lives,
      levelName: this.mode === 'room' ? 'BONUS ROOM' : 'BONUS LEVEL',
      timer: this.timeLeft,
      timerStart: this.mode === 'room' ? 11 : 30,
      flagA: false,
      flagB: false,
      slowmo: ctx.input.isHeld('slowmo'),
      blowerWarn: 0,
    });
    this.touch.render(r, ctx.input);

    const big = Math.min(r.width, r.height);
    if (this.intro > 0) {
      r.ctx.fillStyle = OVERLAY.scrimLight;
      r.ctx.fillRect(0, 0, r.width, r.height);
      r.text(this.mode === 'room' ? 'BONUS ROOM!' : 'SURVIVE!', r.width / 2, r.height * 0.4, big * 0.09, PALETTE.ink, 'center', 'middle');
      r.text(
        this.mode === 'room' ? 'grab the diamonds' : 'dodge the bouncers · grab diamonds',
        r.width / 2,
        r.height * 0.4 + big * 0.07,
        big * 0.035,
        PALETTE.mid,
        'center',
        'middle',
      );
    } else if (this.over > 0) {
      r.text(`+${this.mode === 'room' ? 'BONUS' : 'SURVIVED'}`, r.width / 2, r.height * 0.4, big * 0.07, PALETTE.ink, 'center', 'middle');
    }
  }
}
