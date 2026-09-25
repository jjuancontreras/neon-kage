import { CatmullRomCurve3, Vector3 } from 'three';
import { CHAPTERS } from './chapters';

/**
 * One continuous flight through the whole city. Each key is
 * [u, position, look-at]. Curves are sampled by control-point index so the
 * `u` of every key is honored exactly (not arc-length).
 */
type Key = readonly [number, readonly [number, number, number], readonly [number, number, number]];

const KEYS: readonly Key[] = [
  // 01 ARRIVAL: descend through clouds onto the rooftop torii
  [0.0, [0, 235, 70], [0, 60, -60]],
  [0.05, [0, 150, 48], [0, 64, -40]],
  [0.1, [0, 67.5, 16], [0, 66, -20]],
  [0.16, [4, 65, -12], [0, 62, -52]],
  // 02 MARKET: over the edge, down into the alley
  [0.21, [0, 54, -52], [0, 16, -100]],
  [0.25, [0, 14, -84], [0, 6, -130]],
  [0.3, [0, 3.4, -112], [0, 5.5, -160]],
  [0.36, [0, 3.6, -158], [0, 4, -214]],
  // 03 DATASTREAM: into the tunnel
  [0.42, [0, 4, -208], [0, 4, -262]],
  [0.5, [0, 4, -292], [0, 4, -352]],
  [0.58, [0, 5, -388], [0, 9, -480]],
  // 04 SHRINE CORE: orbit the floating shrine
  [0.64, [18, 9, -442], [0, 10, -480]],
  [0.7, [29, 13, -494], [2.5, 11, -474]],
  [0.76, [4, 17, -516], [0, 10, -480]],
  [0.8, [-26, 17, -484], [0, 12, -482]],
  // 05 ASCENT: rise above the skyline into the sunrise
  [0.86, [-9, 62, -452], [0, 70, -760]],
  [0.9, [0, 140, -424], [0, 128, -1100]],
  [1.0, [0, 245, -400], [0, 232, -1300]],
];

const toV = (a: readonly [number, number, number]) => new Vector3(a[0], a[1], a[2]);
const posCurve = new CatmullRomCurve3(KEYS.map((k) => toV(k[1])), false, 'centripetal');
const lookCurve = new CatmullRomCurve3(KEYS.map((k) => toV(k[2])), false, 'centripetal');

function curveT(u: number): number {
  const last = KEYS.length - 1;
  if (u <= KEYS[0][0]) return 0;
  if (u >= KEYS[last][0]) return 1;
  for (let i = 0; i < last; i++) {
    const a = KEYS[i][0];
    const b = KEYS[i + 1][0];
    if (u <= b) return (i + (u - a) / (b - a)) / last;
  }
  return 1;
}

export interface Pose {
  readonly position: Vector3;
  readonly target: Vector3;
}

/** Writes the pose for `u` into `out` (allocation-free for the render loop). */
export function poseAt(u: number, out: Pose): Pose {
  const t = curveT(u);
  posCurve.getPoint(t, out.position);
  lookCurve.getPoint(t, out.target);
  return out;
}

/** Still pose used by reduced motion: the chapter's framed hero shot. */
export function heroPose(chapter: number, out: Pose): Pose {
  return poseAt((chapter + 0.5) / CHAPTERS.length, out);
}

export const createPose = (): Pose => ({ position: new Vector3(), target: new Vector3() });
