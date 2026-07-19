import type { EngineBus, EngineEvent, EngineEventType } from "./types";

/**
 * In-process pub/sub bus. Deliberately synchronous and dependency-free —
 * engines only need a way to fan-out structured events to other engines.
 */
export function createEngineBus(): EngineBus {
  const handlers = new Map<EngineEventType, Set<(event: EngineEvent) => void>>();

  return {
    emit(event) {
      const set = handlers.get(event.type);
      if (!set) return;
      for (const handler of set) {
        try {
          handler(event);
        } catch {
          // handler faults must never break the emitter
        }
      }
    },
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      const wrapped = handler as (event: EngineEvent) => void;
      set.add(wrapped);
      return () => {
        set?.delete(wrapped);
      };
    },
  };
}
