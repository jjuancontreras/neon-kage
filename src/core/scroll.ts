import Lenis from 'lenis';
import { CHAPTERS } from './chapters';

/**
 * Maps native document scroll onto path progress `u` (0..1). Each chapter's
 * <section> owns an equal 1/5 of `u`, whatever its pixel height, so the DOM
 * text layer and the camera path always agree on which chapter is active.
 */
export class ScrollDriver {
  private readonly lenis: Lenis | null;
  private bounds: number[] = [];

  constructor(private readonly sections: readonly HTMLElement[], reduced: boolean) {
    this.lenis = reduced ? null : new Lenis({ autoRaf: false, lerp: 0.085, smoothWheel: true });
    this.measure();
    window.addEventListener('resize', () => this.measure());
  }

  measure(): void {
    const tops = this.sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.bounds = [...tops.map((t) => Math.min(t, max)), max];
    this.bounds[0] = 0;
  }

  get u(): number {
    return this.uFromY(window.scrollY);
  }

  uFromY(y: number): number {
    const b = this.bounds;
    const n = CHAPTERS.length;
    if (y <= 0) return 0;
    if (y >= b[n]) return 1;
    for (let i = 0; i < n; i++) {
      if (y < b[i + 1]) {
        const span = Math.max(1, b[i + 1] - b[i]);
        return (i + (y - b[i]) / span) / n;
      }
    }
    return 1;
  }

  yFromU(u: number): number {
    const n = CHAPTERS.length;
    const clamped = Math.min(1, Math.max(0, u));
    const i = Math.min(n - 1, Math.floor(clamped * n));
    const t = clamped * n - i;
    return this.bounds[i] + (this.bounds[i + 1] - this.bounds[i]) * t;
  }

  scrollToU(u: number, immediate = false): void {
    const y = this.yFromU(u);
    if (this.lenis) {
      this.lenis.scrollTo(y, { immediate, duration: 1.6 });
    } else {
      window.scrollTo({ top: y, behavior: 'instant' });
    }
  }

  raf(timeMs: number): void {
    this.lenis?.raf(timeMs);
  }
}
