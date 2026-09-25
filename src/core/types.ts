import type { Object3D, PerspectiveCamera, Vector2 } from 'three';
import type { QualitySettings } from './quality';

/** Everything a scene needs each frame. */
export interface FrameContext {
  readonly time: number;
  readonly dt: number;
  /** Path progress 0..1 (after camera smoothing). */
  readonly u: number;
  readonly chapter: number;
  readonly camera: PerspectiveCamera;
  /** Pointer in normalized device coords; null when no pointer is present. */
  readonly pointer: Vector2 | null;
  /** 1 normally, reduced (e.g. 0.25) under prefers-reduced-motion. */
  readonly motion: number;
  readonly reduced: boolean;
}

export interface SceneModule {
  readonly group: Object3D;
  update(ctx: FrameContext): void;
  setQuality?(q: QualitySettings): void;
}
