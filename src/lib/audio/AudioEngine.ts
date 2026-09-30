"use client";

/**
 * Synthesised sound design (Web Audio, no audio files).
 * Muted by default; the AudioContext is only created from a user gesture
 * (the sound toggle), which satisfies browser autoplay policies.
 */

export type Cue = "latch" | "doors" | "curtain" | "projector-start" | "whoosh" | "snap" | "shimmer";
export type Ambience = "none" | "theater" | "projector" | "future";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambienceNodes: { stop: () => void } | null = null;
  private ambience: Ambience = "none";
  enabled = false;

  async enable() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(2);
    }
    await this.ctx.resume();
    this.enabled = true;
    this.master!.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.3);
    this.startAmbience(this.ambience, true);
  }

  disable() {
    this.enabled = false;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    const ctx = this.ctx;
    setTimeout(() => {
      if (!this.enabled) {
        this.ambienceNodes?.stop();
        this.ambienceNodes = null;
        ctx.suspend();
      }
    }, 600);
  }

  setAmbience(a: Ambience) {
    if (a === this.ambience) return;
    this.ambience = a;
    if (this.enabled) this.startAmbience(a);
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseSource(loop = false) {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  private env(gain: GainNode, t: number, attack: number, peak: number, decay: number) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private startAmbience(a: Ambience, force = false) {
    if (!this.ctx || !this.master) return;
    if (!force && !this.enabled) return;
    const old = this.ambienceNodes;
    this.ambienceNodes = null;
    if (old) old.stop();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + 1.5);
    out.connect(this.master);
    const nodes: AudioScheduledSourceNode[] = [];

    if (a === "theater" || a === "projector") {
      // Room tone: very low filtered noise.
      const room = this.noiseSource(true);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      room.connect(lp).connect(g).connect(out);
      room.start();
      nodes.push(room);
    }
    if (a === "projector") {
      // Film transport: band-passed noise gated at ~18 Hz, plus motor hum.
      const n = this.noiseSource(true);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      bp.Q.value = 1.4;
      const gate = ctx.createGain();
      gate.gain.value = 0.0;
      const lfo = ctx.createOscillator();
      lfo.type = "square";
      lfo.frequency.value = 18;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(gate.gain);
      n.connect(bp).connect(gate).connect(out);
      const hum = ctx.createOscillator();
      hum.frequency.value = 55;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.02;
      hum.connect(humGain).connect(out);
      n.start();
      lfo.start();
      hum.start();
      nodes.push(n, lfo, hum);
    }
    if (a === "future") {
      // Soft detuned pad.
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      lp.connect(out);
      [110, 164.81, 220.5, 329.63].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = (i - 1.5) * 6;
        const g = ctx.createGain();
        g.gain.value = 0.018;
        o.connect(g).connect(lp);
        o.start();
        nodes.push(o);
      });
    }

    this.ambienceNodes = {
      stop: () => {
        const now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setTargetAtTime(0, now, 0.3);
        setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), 1500);
      },
    };
  }

  play(cue: Cue) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const out = this.master;

    const burst = (at: number, freq: number, q: number, peak: number, decay: number, type: BiquadFilterType = "bandpass") => {
      const s = this.noiseSource();
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      this.env(g, at, 0.002, peak, decay);
      s.connect(f).connect(g).connect(out);
      s.start(at);
      s.stop(at + decay + 0.1);
    };

    switch (cue) {
      case "latch":
        burst(t, 1800, 3, 0.5, 0.05);
        burst(t + 0.09, 1200, 4, 0.35, 0.08);
        break;
      case "doors": {
        // Low wooden groan: filtered noise with a slow sweep.
        const s = this.noiseSource();
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 6;
        f.frequency.setValueAtTime(180, t);
        f.frequency.linearRampToValueAtTime(320, t + 1.6);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        s.connect(f).connect(g).connect(out);
        s.start(t);
        s.stop(t + 2.3);
        break;
      }
      case "curtain": {
        const s = this.noiseSource();
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.setValueAtTime(500, t);
        f.frequency.linearRampToValueAtTime(1400, t + 1.2);
        f.frequency.linearRampToValueAtTime(400, t + 3.2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
        s.connect(f).connect(g).connect(out);
        s.start(t);
        s.stop(t + 3.5);
        break;
      }
      case "projector-start":
        for (let i = 0; i < 8; i++) burst(t + i * (0.11 - i * 0.008), 2600, 2, 0.25, 0.03);
        break;
      case "whoosh": {
        const s = this.noiseSource();
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 0.9;
        f.frequency.setValueAtTime(250, t);
        f.frequency.exponentialRampToValueAtTime(4200, t + 1.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        s.connect(f).connect(g).connect(out);
        s.start(t);
        s.stop(t + 1.5);
        break;
      }
      case "snap":
        burst(t, 3200, 1.2, 1.0, 0.07, "highpass");
        burst(t, 2100, 5, 0.6, 0.1);
        break;
      case "shimmer": {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = freq;
          const g = ctx.createGain();
          const at = t + i * 0.06;
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.06, at + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
          o.connect(g).connect(out);
          o.start(at);
          o.stop(at + 2.7);
        });
        break;
      }
    }
  }
}

export const audio = new AudioEngine();
