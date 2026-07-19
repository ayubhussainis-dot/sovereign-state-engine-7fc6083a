import { BaseEngine } from "../base-engine";
import { analyzeSessions, SESSION_WINDOWS, sessionWindow } from "../session/analyzer";
import type {
  OHLCBar,
  SessionAnalysis,
  SessionId,
  SessionOptions,
  SessionWindow,
} from "../session/types";

/**
 * Session Engine — partitions bars into Asia / London / New York and the
 * associated killzones. Stateless per call.
 */
export class SessionEngine extends BaseEngine {
  constructor() {
    super("session");
  }

  analyze(bars: readonly OHLCBar[], options: SessionOptions = {}): SessionAnalysis {
    return analyzeSessions(bars, options);
  }

  windows(): readonly SessionWindow[] {
    return SESSION_WINDOWS;
  }

  window(id: SessionId): SessionWindow | undefined {
    return sessionWindow(id);
  }

  protected async onHealthCheck() {
    return { windows: SESSION_WINDOWS.length };
  }
}
