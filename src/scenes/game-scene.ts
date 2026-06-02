import { Scene, SceneContext, GameSession } from './scene';
import { LevelData } from '../levels/level-data';
import { loadLevel } from '../levels/level-loader';
import { Balloon } from '../entities/balloon';
import { Flag } from '../entities/flag';
import { renderGoal } from '../entities/goal';
import { SpikyBall } from '../entities/spiky-ball';
import { MrBlower } from '../entities/mr-blower';
import { HazardField } from '../entities/hazards';
import { resolveCircleVsRects } from '../levels/maze';
import { PHYSICS, SCORING, TIMER_UNITS_PER_SEC } from '../core/constants';
import { SWING_BY_DIFFICULTY, saveProgress, loadProgress } from '../core/settings';
import { Renderer } from '../render/renderer';
import { PALETTE, OVERLAY } from '../render/colors';
import { renderHud, hudHeight, hudTotalHeight } from '../render/hud';
import { TouchControls } from '../render/touch-controls';
import { pointInRect } from '../math/collision';
import { clamp } from '../math/vec2';
import { BonusScene } from './bonus-scene';
import { GameOverScene } from './game-over-scene';
import { Menu } from './ui';

type Phase = 'ready' | 'playing' | 'dying' | 'paused';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function startNewGame(): GameScene {
  const session: GameSession = {
    score: 0,
    lives: SCORING.startingLives,
    level: 1,
    nextExtraLifeAt: SCORING.extraLifeEvery,
  };
  return new GameScene(session);
}

export class GameScene implements Scene {
  private readonly level: LevelData;
  private readonly balloon = new Balloon();
  private readonly flagA: Flag;
  private readonly flagB: Flag;
  private readonly spiky: SpikyBall | null;
  private readonly blower = new MrBlower();
  private readonly hazards: HazardField;
  private readonly touch = new TouchControls();

  private phase: Phase = 'ready';
  private phaseT = 0;
  private timer = SCORING.timerStart;
  private aBeforeB = false;
  private invuln = 0;
  private goalPulse = 0;
  private particles: Particle[] = [];
  private pauseBtn = { x: 0, y: 0, w: 0, h: 0 };
  private pauseMenu: Menu | null = null;
  private audio!: import('../core/audio').Audio;

  constructor(private readonly session: GameSession) {
    this.level = loadLevel(session.level);
    this.flagA = new Flag(this.level.flagA.x, this.level.flagA.y, 'A');
    this.flagB = new Flag(this.level.flagB.x, this.level.flagB.y, 'B');
    this.spiky = this.level.spikyBall ? new SpikyBall(this.level.spikyBall) : null;
    this.hazards = new HazardField(this.level);
  }

  onEnter(ctx: SceneContext): void {
    this.audio = ctx.audio;
    // record progress
    const prog = loadProgress();
    if (this.session.level > prog.highestLevel) {
      prog.highestLevel = this.session.level;
      saveProgress(prog);
    }
    this.resetLevelState(true);
  }

  private resetLevelState(full: boolean): void {
    this.balloon.reset(this.level.spawn.x, this.level.spawn.y);
    this.flagA.reset();
    this.flagB.reset();
    this.spiky?.reset();
    this.hazards.reset();
    this.blower.reset();
    this.aBeforeB = false;
    this.invuln = 1.0;
    this.phase = 'ready';
    this.phaseT = 0;
    if (full) this.timer = SCORING.timerStart;
  }

  private addScore(n: number, ctx: SceneContext): void {
    this.session.score += n;
    while (this.session.score >= this.session.nextExtraLifeAt) {
      this.session.lives++;
      this.session.nextExtraLifeAt += SCORING.extraLifeEvery;
      ctx.audio.play('extraLife');
    }
  }

  private layoutPauseBtn(r: import('../render/renderer').Renderer): void {
    const ps = hudHeight(r) * 0.8;
    this.pauseBtn = { x: r.width - ps - 6, y: hudHeight(r) + 26, w: ps, h: ps };
  }

  private buildPauseMenu(ctx: SceneContext): Menu {
    return new Menu(
      [
        {
          label: () => 'RESUME',
          onSelect: () => {
            this.phase = 'playing';
            this.pauseMenu = null;
          },
        },
        {
          label: () => 'QUIT TO TITLE',
          onSelect: () => ctx.setScene(new GameOverScene(this.session)),
        },
      ],
      ctx.audio,
    );
  }

  update(dtRaw: number, ctx: SceneContext): void {
    this.touch.update(ctx.r, ctx.input);
    this.goalPulse += dtRaw;
    this.layoutPauseBtn(ctx.r);

    // pause toggle (keyboard edge or touch button tap)
    const pauseTap = ctx.input.taps.some((t) =>
      pointInRect(t.x / ctx.r.dpr, t.y / ctx.r.dpr, this.pauseBtn),
    );
    if (ctx.input.wasPressed('pause') || pauseTap) {
      if (this.phase === 'playing') {
        this.phase = 'paused';
        this.pauseMenu = this.buildPauseMenu(ctx);
      } else if (this.phase === 'paused') {
        this.phase = 'playing';
        this.pauseMenu = null;
      }
    }

    if (this.phase === 'paused') {
      this.audio?.setThrust(0);
      if (this.pauseMenu) {
        const big = Math.min(ctx.r.width, ctx.r.height);
        this.pauseMenu.update(ctx.r, ctx.input, ctx.r.width / 2, ctx.r.height * 0.55, big * 0.05, big * 0.1);
      }
      return;
    }

    const slowmo = ctx.input.isHeld('slowmo') && this.phase === 'playing';
    const dt = Math.min(dtRaw, 1 / 30) * (slowmo ? PHYSICS.slowMoFactor : 1);

    if (this.phase === 'ready') {
      this.phaseT += dtRaw;
      if (this.phaseT >= 1.3) {
        this.phase = 'playing';
        this.phaseT = 0;
      }
      return;
    }

    if (this.phase === 'dying') {
      this.phaseT += dtRaw;
      this.updateParticles(dtRaw);
      this.audio?.setThrust(0);
      if (this.phaseT >= 1.1) {
        if (this.session.lives <= 0) {
          ctx.setScene(new GameOverScene(this.session));
        } else {
          this.resetLevelState(false);
        }
      }
      return;
    }

    // ---- playing ----
    const swing = SWING_BY_DIFFICULTY[ctx.settings.difficulty] * (1 + 0.12 * (this.session.level - 1));
    const input = {
      left: ctx.input.isHeld('left'),
      right: ctx.input.isHeld('right'),
      up: ctx.input.isHeld('up'),
      down: ctx.input.isHeld('down'),
    };
    this.balloon.update(dt, input, swing);

    // collide vs walls + moving walls
    const solids = [...this.level.walls, ...this.hazards.movingWallRects];
    const res = resolveCircleVsRects(this.balloon, this.balloon.radius, solids);
    if (res.hit) {
      // kill velocity component going into the surface (slide)
      const vn = this.balloon.vx * res.nx + this.balloon.vy * res.ny;
      if (vn < 0) {
        this.balloon.vx -= vn * res.nx;
        this.balloon.vy -= vn * res.ny;
      }
    }

    this.hazards.update(dt, ctx.audio, ctx.settings.sound);
    this.flagA.update(dt);
    this.flagB.update(dt);
    if (this.spiky) this.spiky.update(dt, this.balloon.x, this.balloon.y);
    this.blower.update(dt, this.balloon, this.level.width, ctx.audio);

    if (this.invuln > 0) this.invuln -= dt;

    // timer (recovered ROM rate; see TIMER_UNITS_PER_SEC)
    this.timer = Math.max(0, this.timer - TIMER_UNITS_PER_SEC * dt);

    // thrust sound
    if (ctx.settings.sound) this.audio?.setThrust(this.balloon.thrusting ? 1 : 0);
    else this.audio?.setThrust(0);

    // flag pickups
    const br = this.balloon.radius;
    if (!this.flagA.collected && this.near(this.flagA.x, this.flagA.y, br + 9)) {
      this.flagA.collected = true;
      this.addScore(SCORING.flagA, ctx);
      ctx.audio.play('flagA');
      if (this.level.spikyBallOnFlagA && this.spiky && !this.flagB.collected) this.spiky.activate();
    }
    if (!this.flagB.collected && this.near(this.flagB.x, this.flagB.y, br + 9)) {
      this.flagB.collected = true;
      this.aBeforeB = this.flagA.collected;
      this.addScore(SCORING.flagB, ctx);
      ctx.audio.play('flagB');
      this.spiky?.reset(); // flag B banishes the spiky ball
    }

    // fatal collisions
    if (this.invuln <= 0) {
      const spikyHit = this.spiky?.active && this.near(this.spiky.x, this.spiky.y, br + this.spiky.radius);
      if (this.hazards.hits(this.balloon.x, this.balloon.y, br) || spikyHit) {
        this.die(ctx);
        return;
      }
    }

    // reached goal?
    if (pointInRect(this.balloon.x, this.balloon.y, this.level.goal)) {
      this.win(ctx);
    }
  }

  private near(x: number, y: number, dist: number): boolean {
    const dx = this.balloon.x - x;
    const dy = this.balloon.y - y;
    return dx * dx + dy * dy <= dist * dist;
  }

  private die(ctx: SceneContext): void {
    this.session.lives--;
    this.phase = 'dying';
    this.phaseT = 0;
    ctx.audio.play('death');
    this.audio?.setThrust(0);
    this.particles = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const sp = 40 + Math.random() * 70;
      this.particles.push({
        x: this.balloon.x,
        y: this.balloon.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
      });
    }
  }

  private win(ctx: SceneContext): void {
    ctx.audio.play('goal');
    this.audio?.setThrust(0);
    const timeBonus = Math.floor(this.timer) * SCORING.timeBonusPerUnit;
    this.addScore(timeBonus, ctx);
    const orderedFlags = this.aBeforeB && this.flagA.collected && this.flagB.collected;
    const both = this.flagA.collected && this.flagB.collected;

    const session = this.session;
    const nextLap = (): Scene => {
      session.level++;
      return new GameScene(session);
    };

    if (orderedFlags) {
      // bonus ROOM, then bonus LEVEL, then next lap
      ctx.setScene(new BonusScene('room', session, () => new BonusScene('survival', session, nextLap)));
    } else if (both) {
      ctx.setScene(new BonusScene('survival', session, nextLap));
    } else {
      ctx.setScene(nextLap());
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt * 0.9;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private playRect(r: Renderer): { x: number; y: number; w: number; h: number } {
    const top = hudTotalHeight(r);
    return { x: 0, y: top, w: r.width, h: r.height - top };
  }

  render(ctx: SceneContext): void {
    const r = ctx.r;
    r.beginFrame();
    const area = this.playRect(r);
    const viewW = this.level.width;
    const viewH = Math.min(144, this.level.height);
    const camY =
      this.level.height > viewH ? clamp(this.balloon.y - 72, 0, this.level.height - viewH) : 0;
    r.ctx.save();
    r.ctx.beginPath();
    r.ctx.rect(area.x, area.y, area.w, area.h);
    r.ctx.clip();
    r.fitWorld({ x: 0, y: camY, w: viewW, h: viewH }, area);

    // play-field backdrop
    r.worldRect(0, camY, viewW, viewH, PALETTE.bg);

    // walls (brick-textured)
    for (const w of this.level.walls) {
      r.texturedWorldRect(w.x, w.y, w.w, w.h);
    }
    // spikes
    for (const s of this.level.spikes) {
      r.worldRect(s.x, s.y, s.w, s.h, PALETTE.mid);
      const { ctx: c } = r;
      c.fillStyle = PALETTE.ink;
      const n = Math.max(2, Math.floor(s.w / 6));
      for (let i = 0; i < n; i++) {
        const x0 = r.sx(s.x + (s.w / n) * i);
        const x1 = r.sx(s.x + (s.w / n) * (i + 0.5));
        const x2 = r.sx(s.x + (s.w / n) * (i + 1));
        const yb = r.sy(s.y);
        const yt = r.sy(s.y - 4);
        c.beginPath();
        c.moveTo(x0, yb);
        c.lineTo(x1, yt);
        c.lineTo(x2, yb);
        c.fill();
      }
    }

    renderGoal(r, this.level.goal, this.goalPulse);
    this.hazards.render(r);
    this.flagA.render(r);
    this.flagB.render(r);
    if (this.spiky) this.spiky.render(r);

    // balloon (flicker while invulnerable)
    if (this.phase !== 'dying') {
      if (this.invuln <= 0 || Math.floor(performance.now() / 90) % 2 === 0) this.balloon.render(r);
    } else {
      this.renderParticles(r);
    }

    this.blower.render(r, this.level.width);
    r.ctx.restore();

    // HUD
    renderHud(r, {
      score: this.session.score,
      lives: this.session.lives,
      levelName: `LVL ${((this.session.level - 1) % 10) + 1} · ${this.level.name}`,
      timer: this.timer,
      timerStart: SCORING.timerStart,
      flagA: this.flagA.collected,
      flagB: this.flagB.collected,
      slowmo: ctx.input.isHeld('slowmo') && this.phase === 'playing',
      blowerWarn: this.phase === 'playing' ? this.blower.idleRatio : 0,
    });

    // pause button (rect computed in update so the hit-test is never stale)
    const pb = this.pauseBtn;
    r.roundRect(pb.x, pb.y, pb.w, pb.h, 4, OVERLAY.btn);
    r.text(this.phase === 'paused' ? '▶' : 'II', pb.x + pb.w / 2, pb.y + pb.h / 2, pb.w * 0.5, PALETTE.ink, 'center', 'middle');

    this.touch.render(r, ctx.input);

    // overlays
    if (this.phase === 'ready') {
      this.banner(r, this.phaseT < 1.0 ? 'READY' : 'GO!');
    } else if (this.phase === 'paused') {
      this.dim(r);
      const big = Math.min(r.width, r.height);
      r.text('PAUSED', r.width / 2, r.height * 0.34, big * 0.1, PALETTE.ink, 'center', 'middle');
      if (this.pauseMenu) this.pauseMenu.render(r, r.width / 2, r.height * 0.55, big * 0.05, big * 0.1);
    }
  }

  private renderParticles(r: Renderer): void {
    const { ctx } = r;
    ctx.fillStyle = PALETTE.ink;
    for (const p of this.particles) {
      const s = Math.max(1, r.sl(2.5 * p.life));
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(r.sx(p.x) - s / 2, r.sy(p.y) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private dim(r: Renderer): void {
    r.ctx.fillStyle = OVERLAY.scrimLight;
    r.ctx.fillRect(0, 0, r.width, r.height);
  }

  private banner(r: Renderer, text: string): void {
    r.text(text, r.width / 2, r.height * 0.42, Math.min(r.width, r.height) * 0.11, PALETTE.ink, 'center', 'middle');
  }
}
