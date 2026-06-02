/** Lightweight Web Audio SFX — tiny synthesized bleeps, no assets. */
export type Sfx =
  | 'thrust'
  | 'flagA'
  | 'flagB'
  | 'diamond'
  | 'death'
  | 'extraLife'
  | 'blower'
  | 'goal'
  | 'menu'
  | 'launch';

export class Audio {
  private ctx: AudioContext | null = null;
  enabled = true;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call on first user gesture to unlock audio on mobile. Primes the context with a
   * silent buffer so the very first SFX isn't dropped while resume() is still pending (iOS). */
  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol = 0.18, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(sfx: Sfx): void {
    if (!this.enabled) return;
    switch (sfx) {
      case 'flagA':
        this.beep(660, 0.12, 'square', 0.16, 990);
        break;
      case 'flagB':
        this.beep(880, 0.16, 'square', 0.16, 1320);
        break;
      case 'diamond':
        this.beep(1200, 0.08, 'triangle', 0.14, 1700);
        break;
      case 'goal':
        this.beep(523, 0.1, 'square', 0.18);
        setTimeout(() => this.beep(784, 0.18, 'square', 0.18), 90);
        break;
      case 'death':
        this.beep(300, 0.45, 'sawtooth', 0.2, 60);
        break;
      case 'extraLife':
        this.beep(880, 0.1, 'square', 0.16);
        setTimeout(() => this.beep(1175, 0.16, 'square', 0.16), 100);
        break;
      case 'blower':
        this.beep(140, 0.5, 'sawtooth', 0.16, 90);
        break;
      case 'launch':
        this.beep(420, 0.07, 'square', 0.1, 220);
        break;
      case 'menu':
        this.beep(700, 0.05, 'square', 0.1);
        break;
      case 'thrust':
        // handled via setThrust()
        break;
    }
  }

  /** Continuous thrust hiss controlled by intensity 0..1. */
  setThrust(intensity: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (intensity > 0.01) {
      if (!this.thrustOsc) {
        this.thrustOsc = ctx.createOscillator();
        this.thrustGain = ctx.createGain();
        this.thrustOsc.type = 'sawtooth';
        this.thrustOsc.frequency.value = 90;
        this.thrustGain.gain.value = 0;
        this.thrustOsc.connect(this.thrustGain).connect(ctx.destination);
        this.thrustOsc.start();
      }
      this.thrustGain!.gain.setTargetAtTime(0.05 * intensity, ctx.currentTime, 0.03);
    } else if (this.thrustGain) {
      this.thrustGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
  }
}
