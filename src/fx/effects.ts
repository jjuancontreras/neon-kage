import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform } from 'three';
import signalFrag from '../shaders/fx-signal.frag?raw';
import crtFrag from '../shaders/fx-crt.frag?raw';
import grainFrag from '../shaders/fx-grain.frag?raw';

/** Chromatic aberration + glitch slices + datamosh macroblocks (samples neighbours → convolution). */
export class SignalEffect extends Effect {
  constructor() {
    super('SignalEffect', signalFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uGlitch', new Uniform(0)],
        ['uMosh', new Uniform(0)],
        ['uAberration', new Uniform(0.0015)],
      ]),
    });
  }

  set(name: 'uGlitch' | 'uMosh' | 'uAberration', value: number): void {
    const u = this.uniforms.get(name);
    if (u) u.value = value;
  }
}

export class CrtEffect extends Effect {
  constructor(strength: number) {
    super('CrtEffect', crtFrag, { uniforms: new Map([['uStrength', new Uniform(strength)]]) });
  }

  set strength(v: number) {
    const u = this.uniforms.get('uStrength');
    if (u) u.value = v;
  }
}

export class GrainEffect extends Effect {
  constructor(amount: number) {
    super('GrainEffect', grainFrag, { uniforms: new Map([['uAmount', new Uniform(amount)]]) });
  }

  set amount(v: number) {
    const u = this.uniforms.get('uAmount');
    if (u) u.value = v;
  }
}
