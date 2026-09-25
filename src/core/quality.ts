/**
 * Adaptive quality: an initial tier from device heuristics, then a runtime
 * FPS governor that steps down when frames are consistently slow.
 */
export type Tier = 'high' | 'mid' | 'low';

export interface QualitySettings {
  readonly tier: Tier;
  readonly pixelRatio: number;
  readonly particles: number;
  readonly rainDrops: number;
  readonly towers: number;
  readonly grain: boolean;
  readonly bloomLevels: number;
}

const TIERS: readonly Tier[] = ['high', 'mid', 'low'];

export function settingsFor(tier: Tier): QualitySettings {
  const dpr = window.devicePixelRatio || 1;
  switch (tier) {
    case 'high':
      return { tier, pixelRatio: Math.min(dpr, 2), particles: 120_000, rainDrops: 14_000, towers: 2600, grain: true, bloomLevels: 8 };
    case 'mid':
      return { tier, pixelRatio: Math.min(dpr, 1.5), particles: 40_000, rainDrops: 8000, towers: 1700, grain: true, bloomLevels: 6 };
    default:
      return { tier, pixelRatio: 1, particles: 15_000, rainDrops: 3500, towers: 1000, grain: false, bloomLevels: 5 };
  }
}

function forcedTier(): Tier | null {
  const q = new URLSearchParams(location.search).get('quality');
  return q === 'high' || q === 'mid' || q === 'low' ? q : null;
}

export function detectTier(gl: WebGLRenderingContext | WebGL2RenderingContext): Tier {
  const forced = forcedTier();
  if (forced) return forced;

  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const isMobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;

  let renderer = '';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  const isSoftware = /swiftshader|llvmpipe|software/i.test(renderer);

  if (nav.connection?.saveData || isSoftware || memory <= 2) return 'low';
  if (isMobile) return cores >= 8 && memory >= 6 ? 'mid' : 'low';
  return cores >= 8 ? 'high' : 'mid';
}

export const isTierForced = (): boolean => forcedTier() !== null;

const SAMPLE_WINDOW_MS = 2000;
const WARMUP_MS = 3000;

/** Tracks frame times; calls `onDowngrade` when average FPS stays under target. */
export class FpsGovernor {
  private elapsed = 0;
  private frames = 0;
  private warmup = WARMUP_MS;
  private fpsValue = 60;

  constructor(
    private tier: Tier,
    private readonly minFps: number,
    private readonly onDowngrade: (tier: Tier) => void,
    private readonly enabled: boolean,
  ) {}

  get fps(): number {
    return this.fpsValue;
  }

  tick(dtMs: number): void {
    this.elapsed += dtMs;
    this.frames += 1;
    if (this.elapsed < SAMPLE_WINDOW_MS) return;
    this.fpsValue = (this.frames * 1000) / this.elapsed;
    this.elapsed = 0;
    this.frames = 0;
    if (this.warmup > 0) {
      this.warmup -= SAMPLE_WINDOW_MS;
      return;
    }
    if (!this.enabled || document.hidden || this.fpsValue >= this.minFps) return;
    const next = TIERS[TIERS.indexOf(this.tier) + 1];
    if (!next) return;
    this.tier = next;
    this.onDowngrade(next);
  }
}
