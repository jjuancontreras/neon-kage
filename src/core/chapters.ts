/** Chapter metadata. Path progress `u` spans 0..1; each chapter owns 0.2 of it. */
export interface Chapter {
  readonly index: number;
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly jp: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { index: 0, id: 'arrival', code: '01-ARV', name: 'Arrival', jp: '到着' },
  { index: 1, id: 'market', code: '02-MKT', name: 'Market', jp: '夜市' },
  { index: 2, id: 'datastream', code: '03-DST', name: 'Datastream', jp: '電流' },
  { index: 3, id: 'shrine', code: '04-SHR', name: 'Shrine Core', jp: '神核' },
  { index: 4, id: 'ascent', code: '05-ASC', name: 'Ascent', jp: '上昇' },
];

export const CHAPTER_SPAN = 1 / CHAPTERS.length;

/** The framed "hero" moment of a chapter, in path progress. */
export const heroU = (index: number): number => (index + 0.5) * CHAPTER_SPAN;

export const chapterAtU = (u: number): number =>
  Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(u / CHAPTER_SPAN)));

/** Smooth 0→1 ramp between a and b. */
export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 1 inside [a,b], ramping over `fade` at both edges. */
export const window01 = (a: number, b: number, fade: number, x: number): number =>
  smooth(a - fade, a, x) * (1 - smooth(b, b + fade, x));
