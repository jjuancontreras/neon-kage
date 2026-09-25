/** Tiny typed event bus shared by scenes, fx and UI. */
export interface BusEvents {
  chapter: { index: number; previous: number };
  glitch: { strength: number };
  shockwave: undefined;
  rain: { enabled: boolean };
  oracle: { line: string };
  quality: { tier: string };
}

type Handler<T> = (payload: T) => void;

const handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

export function on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
  const set = handlers.get(event) ?? new Set();
  set.add(fn as Handler<never>);
  handlers.set(event, set);
  return () => set.delete(fn as Handler<never>);
}

export function emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
  handlers.get(event)?.forEach((fn) => (fn as Handler<BusEvents[K]>)(payload));
}
