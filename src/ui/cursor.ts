const MAGNET_RADIUS = 48;
const PULL = 0.22;

/** Reticle cursor with magnetic snapping to [data-magnetic] elements. Fine pointers only. */
export function initCursor(reduced: boolean): void {
  if (!matchMedia('(pointer: fine)').matches) return;
  const reticle = document.getElementById('reticle');
  if (!reticle) return;
  document.documentElement.classList.add('has-reticle');

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const target = { x: pos.x, y: pos.y, w: 28, h: 28 };
  let magnet: HTMLElement | null = null;

  const release = () => {
    if (magnet) magnet.style.transform = '';
    magnet = null;
    reticle.classList.remove('is-magnet');
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    let hit: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (Math.hypot(dx, dy) < MAGNET_RADIUS) {
        hit = el;
        rect = r;
        break;
      }
    }
    if (hit !== magnet) release();
    if (hit && rect) {
      magnet = hit;
      reticle.classList.add('is-magnet');
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (!reduced) hit.style.transform = `translate(${(e.clientX - cx) * PULL}px, ${(e.clientY - cy) * PULL}px)`;
      Object.assign(target, { x: cx, y: cy, w: rect.width + 14, h: rect.height + 10 });
    } else {
      Object.assign(target, { x: e.clientX, y: e.clientY, w: 28, h: 28 });
    }
  });
  document.addEventListener('pointerleave', release);

  const k = reduced ? 1 : 0.25;
  const tick = () => {
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    reticle.style.width = `${target.w}px`;
    reticle.style.height = `${target.h}px`;
    reticle.style.transform = `translate(${pos.x - target.w / 2}px, ${pos.y - target.h / 2}px)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
