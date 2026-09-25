import { emit, on } from '../core/bus';
import { CHAPTERS, heroU } from '../core/chapters';
import type { ScrollDriver } from '../core/scroll';

/** Chapter rail + keyboard navigation (arrows and 1–5). */
export function initNav(scroll: ScrollDriver, getChapter: () => number): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.rail a[data-go]')];
  const go = (index: number) => {
    const i = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    scroll.scrollToU(heroU(i));
    if (i !== getChapter()) emit('glitch', { strength: 0.5 });
  };

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(Number(a.dataset.go));
    });
  });

  on('chapter', ({ index }) => {
    links.forEach((a, i) => (i === index ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
  });

  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (target?.closest('input, textarea, [contenteditable], .terminal')) return;
    const current = getChapter();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      go(current + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(current - 1);
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      go(Number(e.key) - 1);
    }
  });
}
