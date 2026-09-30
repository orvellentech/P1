/** Typed event bus for one-shot cross-section cues (not for per-frame data). */

export interface ExperienceEvents {
  /** The camera starts moving through the doorway. */
  "door:dolly": { duration: number };
  /** Finger meets palm. Origin in viewport px. */
  "snap:impact": { x: number; y: number };
  "snap:reverse": undefined;
}

type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof ExperienceEvents, Set<Handler<never>>>();

export function on<K extends keyof ExperienceEvents>(event: K, handler: Handler<ExperienceEvents[K]>) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler as Handler<never>);
  return () => {
    handlers.get(event)?.delete(handler as Handler<never>);
  };
}

export function emit<K extends keyof ExperienceEvents>(event: K, ...[payload]: ExperienceEvents[K] extends undefined ? [] : [ExperienceEvents[K]]) {
  handlers.get(event)?.forEach((h) => (h as Handler<ExperienceEvents[K]>)(payload as ExperienceEvents[K]));
}
