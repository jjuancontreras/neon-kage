import {
  Color, FogExp2, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { FxPipeline } from '../fx/composer';
import { createAscent } from '../scenes/ascent';
import { createCity } from '../scenes/city';
import { createDatastream } from '../scenes/datastream';
import { createMarket } from '../scenes/market';
import { createRain } from '../scenes/rain';
import { createRooftop } from '../scenes/rooftop';
import { createShrine } from '../scenes/shrine';
import { createSky } from '../scenes/sky';
import { emit } from './bus';
import { createPose, heroPose, poseAt } from './cameraPath';
import { chapterAtU, heroU } from './chapters';
import { FpsGovernor, isTierForced, settingsFor, type QualitySettings, type Tier } from './quality';
import type { FrameContext, SceneModule } from './types';

/** Fog keyframes: [u, density, sRGB colour]. */
const FOG: ReadonlyArray<readonly [number, number, string]> = [
  [0.0, 0.0028, '#140a20'],
  [0.12, 0.0065, '#120a1e'],
  [0.24, 0.021, '#0d0717'],
  [0.38, 0.02, '#0b0616'],
  [0.46, 0.011, '#040309'],
  [0.62, 0.008, '#04030e'],
  [0.8, 0.006, '#0a0514'],
  [0.9, 0.0022, '#3a1236'],
  [1.0, 0.0017, '#4a1a44'],
];
const fogColors = FOG.map((f) => new Color(f[2]));

export interface EngineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly tier: Tier;
  readonly reduced: boolean;
  readonly getScrollU: () => number;
  /** Reduced motion: called on chapter change; must invoke `swap` while the view is hidden. */
  readonly crossfade: (swap: () => void) => void;
}

export class Engine {
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly fog = new FogExp2(0x000000, 0.003);
  private readonly fx: FxPipeline;
  private readonly modules: SceneModule[];
  private readonly governor: FpsGovernor;
  private quality: QualitySettings;
  private pointer: Vector2 | null = null;
  private readonly pose = createPose();
  private readonly target = createPose();
  private readonly lastPos = new Vector3();
  private u = 0;
  private chapter = -1;
  private shownChapter = 0;
  private time = 0;
  private lastMs = performance.now();
  private speedValue = 0;
  frames = 0;

  constructor(private readonly opts: EngineOptions) {
    this.quality = settingsFor(opts.tier);
    this.renderer = new WebGLRenderer({ canvas: opts.canvas, context: opts.gl, antialias: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000);
    this.scene.fog = this.fog;
    this.scene.add(new HemisphereLight(0x5a3a8a, 0x05040a, 1.2));

    this.modules = [
      createSky(),
      createCity(this.quality),
      createRooftop(this.quality.pixelRatio),
      createMarket(this.quality.pixelRatio),
      createDatastream(this.quality),
      createShrine(opts.canvas),
      createAscent(),
      createRain(this.quality),
    ];
    this.modules.forEach((m) => this.scene.add(m.group));
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __scene: Scene }).__scene = this.scene;
    }

    this.fx = new FxPipeline(this.renderer, this.scene, this.camera, this.quality, opts.reduced);
    this.governor = new FpsGovernor(this.quality.tier, matchMedia('(pointer: coarse)').matches ? 28 : 45, (t) => this.setTier(t), !isTierForced());

    this.u = opts.reduced ? heroU(0) : opts.getScrollU();
    this.snapPose();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointer = (this.pointer ?? new Vector2()).set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    document.addEventListener('pointerleave', () => (this.pointer = null));
  }

  get fps(): number {
    return this.governor.fps;
  }

  get tier(): Tier {
    return this.quality.tier;
  }

  get speed(): number {
    return this.speedValue;
  }

  get progress(): number {
    return this.u;
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Renders a set number of frames synchronously (used before the first paint). */
  warmup(): void {
    this.renderer.compile(this.scene, this.camera);
  }

  private setTier(tier: Tier): void {
    this.quality = settingsFor(tier);
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.modules.forEach((m) => m.setQuality?.(this.quality));
    this.fx.applyQuality(this.quality);
    this.resize();
    emit('quality', { tier });
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Wider lens on portrait screens so each chapter's subject stays framed.
    this.camera.fov = aspect < 0.8 ? 72 : aspect < 1.2 ? 62 : 55;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.fx.setSize(w, h);
  }

  private snapPose(): void {
    const p = this.opts.reduced ? heroPose(this.shownChapter, this.target) : poseAt(this.u, this.target);
    this.pose.position.copy(p.position);
    this.pose.target.copy(p.target);
    this.applyPose();
  }

  private applyPose(): void {
    this.camera.position.copy(this.pose.position);
    this.camera.lookAt(this.pose.target);
  }

  private updateChapter(scrollU: number): void {
    const next = chapterAtU(scrollU);
    if (next === this.chapter) return;
    const previous = this.chapter;
    this.chapter = next;
    if (previous === -1) return;
    if (this.opts.reduced) {
      this.opts.crossfade(() => {
        this.shownChapter = next;
        this.u = heroU(next);
        this.snapPose();
      });
    } else {
      emit('glitch', { strength: 0.9 });
    }
  }

  private updateFog(): void {
    const u = this.u;
    let i = 0;
    while (i < FOG.length - 2 && u > FOG[i + 1][0]) i++;
    const [a, da] = FOG[i];
    const [b, db] = FOG[i + 1];
    const t = Math.min(1, Math.max(0, (u - a) / (b - a)));
    this.fog.density = da + (db - da) * t;
    this.fog.color.copy(fogColors[i]).lerp(fogColors[i + 1], t);
  }

  private frame(): void {
    const now = performance.now();
    const dtMs = Math.min(100, now - this.lastMs);
    this.lastMs = now;
    const dt = dtMs / 1000;
    this.time += dt;
    this.governor.tick(dtMs);

    const scrollU = this.opts.getScrollU();
    this.updateChapter(scrollU);
    if (!this.opts.reduced) {
      this.u += (scrollU - this.u) * (1 - Math.exp(-dt * 5));
      poseAt(this.u, this.target);
      const k = 1 - Math.exp(-dt * 6);
      this.pose.position.lerp(this.target.position, k);
      this.pose.target.lerp(this.target.target, k);
      this.applyPose();
    }
    this.speedValue = this.camera.position.distanceTo(this.lastPos) / Math.max(dt, 1e-3);
    this.lastPos.copy(this.camera.position);
    this.updateFog();

    const ctx: FrameContext = {
      time: this.time,
      dt,
      u: this.u,
      chapter: this.opts.reduced ? this.shownChapter : chapterAtU(this.u),
      camera: this.camera,
      pointer: this.pointer,
      motion: this.opts.reduced ? 0.25 : 1,
      reduced: this.opts.reduced,
    };
    for (const m of this.modules) m.update(ctx);
    this.fx.update(this.u, dt, this.speedValue);
    this.fx.render(dt);
    this.frames++;
  }
}
