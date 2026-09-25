import { emit } from './bus';
import { chapterAtU } from './chapters';
import type { ScrollDriver } from './scroll';

/**
 * Drives Lenis and emits chapter changes from raw scroll progress. Runs even
 * when WebGL is unavailable so the HUD, nav and text layer stay in sync.
 */
export function startDirector(scroll: ScrollDriver): { readonly chapter: number } {
  const state = { chapter: -1 };
  const tick = (time: number) => {
    scroll.raf(time);
    const next = chapterAtU(scroll.u);
    if (next !== state.chapter) {
      const previous = state.chapter;
      state.chapter = next;
      emit('chapter', { index: next, previous });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return state;
}
