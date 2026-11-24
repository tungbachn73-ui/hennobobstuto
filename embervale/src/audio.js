export class Ambience {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.nextChirp = 4;
    this._windGain = null;
    this._padGain = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      d[i] = last * 3.2;
    }
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0.16;
    wind.connect(windFilter).connect(this._windGain).connect(this.master);
    wind.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();

    this._padGain = ctx.createGain();
    this._padGain.gain.value = 0.035;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1400;
    this._padGain.connect(padFilter).connect(this.master);
    for (const [freq, detune, gain] of [
      [110, 0, 1], [164.81, 4, 0.6], [220, -3, 0.5], [277.18, 2, 0.35]
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      const trem = ctx.createGain();
      const tlfo = ctx.createOscillator();
      tlfo.frequency.value = 0.05 + Math.random() * 0.05;
      const tg = ctx.createGain();
      tg.gain.value = 0.35 * gain;
      tlfo.connect(tg).connect(trem.gain);
      trem.gain.value = gain;
      tlfo.start();
      osc.connect(g).connect(trem).connect(this._padGain);
      osc.start();
    }

    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 3);
  }

  update(dt, speedNorm) {
    if (!this.ctx || this.muted) return;
    if (this._windGain) {
      const target = 0.14 + speedNorm * 0.1 + Math.random() * 0.02;
      this._windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
    }
    this.nextChirp -= dt;
    if (this.nextChirp <= 0) {
      this.nextChirp = 5 + Math.random() * 11;
      this.chirp();
    }
  }

  chirp() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + Math.random() * 0.4;
    const notes = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const base = 2300 + Math.random() * 900;
      const dur = 0.09 + Math.random() * 0.06;
      const start = t0 + i * (0.14 + Math.random() * 0.1);
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 0.72, start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.028, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g).connect(this.master);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.2);
    }
    return this.muted;
  }
}
