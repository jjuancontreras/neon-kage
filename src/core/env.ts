/** Environment queries evaluated once at boot. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hasFinePointer = (): boolean => window.matchMedia('(pointer: fine)').matches;

export const isDebug = (): boolean => new URLSearchParams(location.search).has('debug');
