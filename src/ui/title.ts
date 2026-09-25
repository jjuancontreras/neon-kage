import { animate, scrambleText, stagger } from 'animejs';
import { on } from '../core/bus';

/** Glitch-scramble title reveal, plus staggered panel reveals on chapter entry. */
export function initTitle(reduced: boolean): void {
  const title = document.querySelector<HTMLElement>('[data-scramble]');
  if (title) {
    if (reduced) {
      animate(title, { opacity: [0, 1], duration: 900, ease: 'outQuad' });
    } else {
      title.classList.add('is-glitching');
      animate(title, {
        innerHTML: scrambleText({ chars: 'ｱｶｻﾀﾅﾊﾏﾔﾗﾜ01<>/#%', cursor: '▌', settleDuration: 420, perturbation: 0.4, delay: 350 }),
        onComplete: () => title.classList.remove('is-glitching'),
      });
      animate('.title-jp', { opacity: [0, 1], letterSpacing: ['1.4em', '0.6em'], duration: 1600, delay: 900, ease: 'outExpo' });
    }
  }

  on('chapter', ({ index, previous }) => {
    if (previous === -1 && index === 0) return;
    const items = document.querySelectorAll<HTMLElement>(`.chapter[data-chapter="${index}"] .panel > *`);
    if (reduced) {
      animate(items, { opacity: [0, 1], duration: 500, ease: 'outQuad' });
    } else {
      animate(items, { opacity: [0, 1], y: [28, 0], duration: 900, delay: stagger(80), ease: 'outExpo' });
    }
  });
}
