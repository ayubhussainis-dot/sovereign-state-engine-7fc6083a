import type { EngineId, EngineLogger } from "./types";

/**
 * Namespaced logger. Kept tiny — engines should not depend on a logging
 * framework at this stage.
 */
export function createEngineLogger(id: EngineId): EngineLogger {
  const prefix = `[hetis:${id}]`;
  return {
    debug: (msg, meta) => console.debug(prefix, msg, meta ?? ""),
    info: (msg, meta) => console.info(prefix, msg, meta ?? ""),
    warn: (msg, meta) => console.warn(prefix, msg, meta ?? ""),
    error: (msg, meta) => console.error(prefix, msg, meta ?? ""),
  };
}
