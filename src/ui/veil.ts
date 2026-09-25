const FADE_IN_MS = 280;

/**
 * Reduced-motion chapter change: fade to ink, swap the view, fade back.
 * Overlapping requests collapse into the latest swap.
 */
export function createCrossfade(veil: HTMLElement): (swap: () => void) => void {
  let pending: (() => void) | null = null;
  let busy = false;
  const run = () => {
    busy = true;
    veil.style.opacity = '1';
    window.setTimeout(() => {
      const fn = pending;
      pending = null;
      fn?.();
      veil.style.opacity = '0';
      busy = false;
      if (pending) run();
    }, FADE_IN_MS);
  };
  return (swap) => {
    pending = swap;
    if (!busy) run();
  };
}
