import { animate, createDrawable, stagger } from 'animejs';
import { on } from '../core/bus';
import { CHAPTERS } from '../core/chapters';

export interface HudSource {
  /** Path progress 0..1 */
  u(): number;
  position(): { x: number; y: number; z: number } | null;
  speed(): number;
  fps(): number | null;
  tier(): string | null;
}

const UPDATE_MS = 80;
const pad = (n: number, w: number) => String(Math.round(n)).padStart(w, '0');

/** Corner brackets, live readouts and anime.js-drawn SVG lines. */
export function initHud(source: HudSource, reduced: boolean, debug: boolean): void {
  const el = (k: string) => document.querySelector<HTMLElement>(`[data-hud="${k}"]`);
  const fields = { code: el('code'), pct: el('pct'), clock: el('clock'), lat: el('lat'), lon: el('lon'), alt: el('alt'), vel: el('vel'), fps: el('fps') };
  const topLines = createDrawable('.hud-line--top');
  const [progress] = createDrawable('.hud-line--progress');

  if (reduced) {
    topLines.forEach((l) => l.setAttribute('draw', '0 1'));
  } else {
    animate(topLines, { draw: ['0 0', '0 1'], duration: 1600, delay: stagger(120, { start: 500 }), ease: 'inOutQuart' });
    animate('.hud-corner', { opacity: [0, 0.8], scale: [1.4, 1], duration: 700, delay: stagger(90, { start: 200 }), ease: 'outExpo' });
  }

  on('chapter', ({ index }) => {
    if (fields.code) fields.code.textContent = CHAPTERS[index].code;
    if (!reduced && index >= 0) {
      animate(topLines, { draw: ['0.5 0.5', '0 1'], duration: 900, ease: 'outExpo' });
    }
  });

  let last = 0;
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    if (now - last < UPDATE_MS) return;
    last = now;
    const u = source.u();
    progress?.setAttribute('draw', `0 ${Math.max(0.001, u).toFixed(4)}`);
    if (fields.pct) fields.pct.textContent = (u * 100).toFixed(1).padStart(5, '0');
    const d = new Date();
    if (fields.clock) fields.clock.textContent = `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
    const p = source.position() ?? { x: 0, y: 240 * (1 - u), z: -500 * u };
    if (fields.lat) fields.lat.textContent = (35.6581 - p.z * 0.00002).toFixed(5);
    if (fields.lon) fields.lon.textContent = (139.7017 + p.x * 0.00002).toFixed(5);
    if (fields.alt) fields.alt.textContent = pad(Math.max(0, p.y * 3.2), 4);
    if (fields.vel) fields.vel.textContent = pad(Math.min(999, source.speed() * 3.6), 3);
    if (debug && fields.fps) fields.fps.textContent = `FPS ${source.fps()?.toFixed(0) ?? '--'} · ${source.tier() ?? 'css'}`;
  };
  requestAnimationFrame(tick);
}
