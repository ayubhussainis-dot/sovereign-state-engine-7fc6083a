import type {
  OHLCBar,
  SessionAnalysis,
  SessionId,
  SessionOptions,
  SessionRange,
  SessionWindow,
} from "./types";

/**
 * Canonical UTC session windows. Killzones follow ICT conventions.
 */
export const SESSION_WINDOWS: readonly SessionWindow[] = [
  { id: "asia", label: "Asia", startHour: 0, endHour: 8 },
  { id: "london", label: "London", startHour: 7, endHour: 16 },
  { id: "new-york-am", label: "New York AM", startHour: 13, endHour: 17 },
  { id: "new-york-pm", label: "New York PM", startHour: 17, endHour: 21 },
  { id: "asia-killzone", label: "Asia Killzone", startHour: 0, endHour: 4, killzone: true },
  { id: "london-killzone", label: "London Killzone", startHour: 7, endHour: 10, killzone: true },
  { id: "new-york-killzone", label: "New York Killzone", startHour: 12, endHour: 15, killzone: true },
  { id: "london-close", label: "London Close", startHour: 15, endHour: 16, killzone: true },
];

const WINDOW_MAP = new Map<SessionId, SessionWindow>(
  SESSION_WINDOWS.map((w) => [w.id, w]),
);

/**
 * Partition bars into session ranges. Bars are grouped by UTC day + session.
 */
export function analyzeSessions(
  bars: readonly OHLCBar[],
  options: SessionOptions = {},
): SessionAnalysis {
  const allowed = new Set<SessionId>(
    options.sessions ?? SESSION_WINDOWS.map((w) => w.id),
  );

  const buckets = new Map<string, SessionRange>();
  for (const bar of bars) {
    const date = new Date(bar.time);
    const hour = date.getUTCHours();
    const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    for (const win of SESSION_WINDOWS) {
      if (!allowed.has(win.id)) continue;
      if (!inWindow(hour, win)) continue;
      const key = `${dayKey}:${win.id}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.high = Math.max(existing.high, bar.high);
        existing.low = Math.min(existing.low, bar.low);
        existing.close = bar.close;
        existing.end = bar.time;
        existing.bars += 1;
      } else {
        buckets.set(key, {
          id: win.id,
          label: win.label,
          start: bar.time,
          end: bar.time,
          high: bar.high,
          low: bar.low,
          open: bar.open,
          close: bar.close,
          bars: 1,
        });
      }
    }
  }

  const ranges = [...buckets.values()].sort((a, b) => a.start - b.start);
  const at = options.at ?? bars[bars.length - 1]?.time;
  const activeAt = at
    ? SESSION_WINDOWS.filter((w) => allowed.has(w.id) && inWindow(new Date(at).getUTCHours(), w)).map(
        (w) => w.id,
      )
    : undefined;

  return { ranges, activeAt };
}

export function sessionWindow(id: SessionId): SessionWindow | undefined {
  return WINDOW_MAP.get(id);
}

function inWindow(hour: number, win: SessionWindow): boolean {
  if (win.endHour > win.startHour) {
    return hour >= win.startHour && hour < win.endHour;
  }
  return hour >= win.startHour || hour < win.endHour;
}
