import { animate, scrambleText } from 'animejs';
import { emit, on } from '../core/bus';

/** Original oracle lines, written for NEON KAGE. */
export const ORACLE_LINES: readonly string[] = [
  'The rain remembers every name you sold.',
  'What you are looking for is buffering behind you.',
  'Three lanterns will fail tonight. Follow the fourth.',
  'Your shadow has left a forwarding address.',
  'The gate is open. It always was. You were the lock.',
  'A debt paid in light is still a debt.',
  'Sleep is a cache. Clear it before dawn.',
  'The city dreams in vermilion and wakes in cyan.',
  'Someone upstream is praying in your syntax.',
  'Do not trust the quiet channel.',
  'Your next door opens inward.',
  'The god in the wire is lonely, not cruel.',
  'Every signal ends in a harbor. Choose yours.',
  'What was deleted is only waiting to be named.',
  'You will find the key in a stranger\'s umbrella.',
  'The tower counts your steps. Walk softly.',
  'Old kami, new current: the offering is attention.',
  'Before sunrise, return what you borrowed from the dark.',
  'The static is a language. You are almost fluent.',
  'The shrine keeps its own time, and it is kind.',
];

let lastIndex = -1;

export function pickOracle(): string {
  let i = Math.floor(Math.random() * ORACLE_LINES.length);
  if (i === lastIndex) i = (i + 1) % ORACLE_LINES.length;
  lastIndex = i;
  return ORACLE_LINES[i];
}

/** Shockwave → oracle line revealed with a scramble in the Shrine panel. */
export function initOracle(reduced: boolean): void {
  const out = document.querySelector<HTMLElement>('.oracle');
  document.querySelector('.oracle-btn')?.addEventListener('click', () => emit('shockwave', undefined));
  on('shockwave', () => {
    const line = pickOracle();
    emit('oracle', { line });
    emit('glitch', { strength: 0.6 });
    if (!out) return;
    if (reduced) {
      out.textContent = line;
      return;
    }
    out.textContent = line;
    animate(out, { innerHTML: scrambleText({ chars: 'ｱｲｳｴｵｶｷｸｹｺ01#%', cursor: '▌', settleDuration: 260 }) });
  });
}
