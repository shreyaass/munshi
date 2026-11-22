/**
 * soundcn-inspired Audio & Tactile Feedback Engine for Munshi
 * 
 * - Zero external assets, 100% offline, zero CORS/network delay.
 * - Powered by browser-native Web Audio API & mobile haptic vibration.
 * - Works identically on Web, PWA, and Capacitor Android.
 */

export type SoundType =
  | 'click'
  | 'theme'
  | 'income'
  | 'expense'
  | 'goal'
  | 'sync'
  | 'delete';

const STORAGE_KEY = 'em.sound_enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean;
  private listeners = new Set<(enabled: boolean) => void>();

  constructor() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    // Enabled by default unless explicitly turned off
    this.enabled = saved === null ? true : saved === 'true';
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(val));
    }
    this.listeners.forEach((fn) => fn(val));
    if (val) {
      this.play('click');
    }
  }

  public subscribe(fn: (enabled: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private haptic(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics fail silently on unsupported platforms
    }
  }

  public play(type: SoundType) {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        this.haptic(3);
        // Ultra-refined, timid tactile tick (soft high-frequency micropulse)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.009);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.009);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.012);
        break;
      }

      case 'theme': {
        this.haptic([10, 20, 15]);
        // Dual-impulse tactile switch snap
        const click1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        click1.type = 'triangle';
        click1.frequency.setValueAtTime(1600, now);
        click1.frequency.exponentialRampToValueAtTime(400, now + 0.015);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        click1.connect(gain1);
        gain1.connect(ctx.destination);
        click1.start(now);
        click1.stop(now + 0.02);

        const click2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        click2.type = 'sine';
        click2.frequency.setValueAtTime(950, now + 0.025);
        click2.frequency.exponentialRampToValueAtTime(280, now + 0.065);
        gain2.gain.setValueAtTime(0.15, now + 0.025);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        click2.connect(gain2);
        gain2.connect(ctx.destination);
        click2.start(now + 0.025);
        click2.stop(now + 0.07);
        break;
      }

      case 'income': {
        this.haptic([12, 35, 18]);
        // Triumphant credit coin chime
        const notes = [1046.5, 1567.98, 2093.0]; // C6, G6, C7
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.07;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.36);
        });
        break;
      }

      case 'expense': {
        this.haptic(15);
        // Grounded solid ledger stamp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'goal': {
        this.haptic([10, 25, 12, 25, 18]);
        // Uplifting ascending major triad
        const notes = [739.99, 932.33, 1108.73, 1479.98]; // F#5, A#5, C#6, F#6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.06;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.42);
        });
        break;
      }

      case 'sync': {
        this.haptic([8, 20, 8]);
        // High-speed telemetry chirp
        [980, 1470].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.045;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
        });
        break;
      }

      case 'delete': {
        this.haptic(22);
        // Low muted paper crumple / trash puff
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
    }
  }
}

export const sound = new SoundEngine();
