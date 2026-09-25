/**
 * Opt-in generative ambience with the raw Web Audio API:
 * filtered-noise rain, a slow detuned drone and sparse pentatonic pings
 * through a feedback delay. Muted until the listener turns it on.
 */
const PENTATONIC = [0, 3, 5, 7, 10, 12, 15, 17];
const ROOT_HZ = 220;
const CHAPTER_CUTOFF = [520, 760, 1400, 980, 1200];

export class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private pingTimer = 0;
  private playing = false;

  get isPlaying(): boolean {
    return this.playing;
  }

  toggle(force?: boolean): boolean {
    const want = force ?? !this.playing;
    if (want) this.start();
    else this.stop();
    return this.playing;
  }

  setChapter(index: number): void {
    if (!this.ctx || !this.droneFilter) return;
    this.droneFilter.frequency.setTargetAtTime(CHAPTER_CUTOFF[index] ?? 700, this.ctx.currentTime, 1.5);
  }

  private build(): void {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    // Rain: looping white noise through a band-pass with a slow wobble.
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400;
    band.Q.value = 0.6;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.07;
    noise.connect(band).connect(rainGain).connect(master);
    noise.start();

    // Drone: two detuned saws and a sub sine through a low-pass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 520;
    droneFilter.Q.value = 4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneFilter.connect(droneGain).connect(master);
    const voices: Array<[OscillatorType, number, number]> = [['sawtooth', 55, -7], ['sawtooth', 82.4, 6], ['sine', 27.5, 0]];
    voices.forEach(([type, f, detune]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(droneFilter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start();

    this.ctx = ctx;
    this.master = master;
    this.droneFilter = droneFilter;
  }

  private ping(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const semis = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = ROOT_HZ * 2 ** (semis / 12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    osc.connect(env);
    env.connect(master);
    env.connect(delay).connect(fb).connect(delay);
    fb.connect(master);
    osc.start(t);
    osc.stop(t + 2.5);
    window.setTimeout(() => {
      env.disconnect();
      delay.disconnect();
      fb.disconnect();
    }, 6000);
  }

  private start(): void {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    void ctx.resume();
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
    const loop = () => {
      this.ping();
      this.pingTimer = window.setTimeout(loop, 1800 + Math.random() * 4200);
    };
    window.clearTimeout(this.pingTimer);
    this.pingTimer = window.setTimeout(loop, 1200);
    this.playing = true;
  }

  private stop(): void {
    window.clearTimeout(this.pingTimer);
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      const ctx = this.ctx;
      window.setTimeout(() => {
        if (!this.playing) void ctx.suspend();
      }, 1500);
    }
    this.playing = false;
  }
}
