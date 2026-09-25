import {
  BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode,
} from 'postprocessing';
import { HalfFloatType, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { on } from '../core/bus';
import { smooth } from '../core/chapters';
import type { QualitySettings } from '../core/quality';
import { CrtEffect, GrainEffect, SignalEffect } from './effects';

const MOSH_CENTER = 0.4;
const MOSH_WIDTH = 0.03;

/**
 * Two merged full-screen passes after the scene render:
 *   1. Bloom (mipmap blur)
 *   2. Signal (CA / glitch / datamosh) → tone mapping → CRT → grain
 */
export class FxPipeline {
  readonly composer: EffectComposer;
  private readonly bloom: BloomEffect;
  private readonly signal = new SignalEffect();
  private readonly crt = new CrtEffect(0.55);
  private readonly grain = new GrainEffect(0.05);
  private glitch = 0;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, q: QualitySettings, private readonly reduced: boolean) {
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: q.tier === 'high' ? 4 : 0 });
    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.32,
      luminanceSmoothing: 0.28,
      intensity: 1.15,
      radius: 0.72,
      levels: q.bloomLevels,
    });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new EffectPass(camera, this.bloom));
    this.composer.addPass(new EffectPass(camera, this.signal, tone, this.crt, this.grain));
    this.applyQuality(q);
    on('glitch', ({ strength }) => {
      if (!this.reduced) this.glitch = Math.max(this.glitch, strength);
    });
  }

  applyQuality(q: QualitySettings): void {
    this.grain.amount = q.grain ? 0.05 : 0.025;
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  /** `speed` is camera speed in world units/second. */
  update(u: number, dt: number, speed: number): void {
    this.glitch = Math.max(0, this.glitch - dt * 2.4);
    const inTunnel = smooth(0.4, 0.46, u) * (1 - smooth(0.58, 0.64, u));
    const mosh = this.reduced ? 0 : Math.max(0, 1 - Math.abs(u - MOSH_CENTER) / MOSH_WIDTH);
    const ca = 0.0012 + inTunnel * (0.004 + Math.min(0.01, speed * 0.00025));
    this.signal.set('uGlitch', this.glitch);
    this.signal.set('uMosh', mosh * mosh);
    this.signal.set('uAberration', this.reduced ? 0.0012 : ca);
    this.bloom.intensity = 1.05 + smooth(0.6, 0.7, u) * 0.35 - smooth(0.85, 1, u) * 0.3;
    this.crt.strength = 0.55 * (1 - smooth(0.9, 1, u) * 0.6);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }
}
