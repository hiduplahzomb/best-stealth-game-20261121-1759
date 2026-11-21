// Sound, all synthesised with the Web Audio API — no audio files, no
// network. Short blips and tones: a footstep tick, a guard's step (a touch
// lower, so you can tell them apart), a pickup chime, an alarm, and a small
// win arpeggio. The context starts on the first user gesture, and M mutes.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, seconds, type = 'sine', when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(1, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  footstep() {
    this.tone(180, 0.06, 'triangle', 0, 120);
  }

  guardStep() {
    this.tone(140, 0.07, 'triangle', 0, 90);
  }

  pickup() {
    this.tone(660, 0.12, 'sine');
    this.tone(990, 0.18, 'sine', 0.09);
  }

  alarm() {
    this.tone(440, 0.16, 'sawtooth', 0, 620);
    this.tone(440, 0.16, 'sawtooth', 0.2, 620);
  }

  caught() {
    this.tone(220, 0.3, 'sawtooth', 0, 110);
  }

  level() {
    this.tone(523, 0.14, 'sine');
    this.tone(659, 0.14, 'sine', 0.12);
    this.tone(784, 0.22, 'sine', 0.24);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', i * 0.14));
  }

  click() {
    this.tone(880, 0.05, 'sine');
  }
}
