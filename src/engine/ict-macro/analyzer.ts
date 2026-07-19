import type {
  ICTMacroAnalysis,
  ICTMacroId,
  ICTMacroOptions,
  ICTMacroSnapshot,
  ICTMacroWindow,
  OHLCBar,
} from "./types";

/**
 * Canonical ICT macro windows in UTC minutes. Times reflect the
 * commonly published ICT macro schedule normalized to UTC.
 */
export const ICT_MACROS: readonly ICTMacroWindow[] = [
  { id: "london-open", label: "London Open Macro", startMinute: 7 * 60 + 33, endMinute: 8 * 60, purpose: "Silver bullet liquidity" },
  { id: "london-lunch", label: "London Lunch Macro", startMinute: 11 * 60, endMinute: 11 * 60 + 30, purpose: "Rebalance" },
  { id: "am-macro-1", label: "NY AM Macro 1", startMinute: 13 * 60 + 50, endMinute: 14 * 60 + 10, purpose: "Manipulation" },
  { id: "am-macro-2", label: "NY AM Macro 2", startMinute: 14 * 60 + 50, endMinute: 15 * 60 + 10, purpose: "Distribution" },
  { id: "nyse-open", label: "NYSE Open Macro", startMinute: 14 * 60 + 30, endMinute: 15 * 60, purpose: "Opening drive" },
  { id: "lunch-macro", label: "NY Lunch Macro", startMinute: 15 * 60 + 50, endMinute: 16 * 60 + 10, purpose: "Consolidation" },
  { id: "pm-macro-1", label: "NY PM Macro 1", startMinute: 17 * 60 + 10, endMinute: 17 * 60 + 40, purpose: "Reversal window" },
  { id: "pm-macro-2", label: "NY PM Macro 2", startMinute: 18 * 60 + 15, endMinute: 18 * 60 + 45, purpose: "Continuation" },
  { id: "final-hour", label: "Final Hour Macro", startMinute: 19 * 60 + 15, endMinute: 20 * 60, purpose: "Close positioning" },
];

const MACRO_MAP = new Map<ICTMacroId, ICTMacroWindow>(
  ICT_MACROS.map((m) => [m.id, m]),
);

export function analyzeICTMacros(
  bars: readonly OHLCBar[],
  options: ICTMacroOptions = {},
): ICTMacroAnalysis {
  const allowed = new Set<ICTMacroId>(
    options.macros ?? ICT_MACROS.map((m) => m.id),
  );

  const buckets = new Map<string, ICTMacroSnapshot>();
  for (const bar of bars) {
    const d = new Date(bar.time);
    const minute = d.getUTCHours() * 60 + d.getUTCMinutes();
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    for (const m of ICT_MACROS) {
      if (!allowed.has(m.id)) continue;
      if (minute < m.startMinute || minute >= m.endMinute) continue;
      const key = `${dayKey}:${m.id}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.high = Math.max(cur.high, bar.high);
        cur.low = Math.min(cur.low, bar.low);
        cur.close = bar.close;
        cur.end = bar.time;
        cur.bars += 1;
      } else {
        buckets.set(key, {
          id: m.id,
          label: m.label,
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

  const snapshots = [...buckets.values()].sort((a, b) => a.start - b.start);
  const at = options.at ?? bars[bars.length - 1]?.time;
  const activeAt = at
    ? ICT_MACROS.filter((m) => {
        if (!allowed.has(m.id)) return false;
        const d = new Date(at);
        const min = d.getUTCHours() * 60 + d.getUTCMinutes();
        return min >= m.startMinute && min < m.endMinute;
      }).map((m) => m.id)
    : undefined;

  return { snapshots, activeAt };
}

export function ictMacro(id: ICTMacroId): ICTMacroWindow | undefined {
  return MACRO_MAP.get(id);
}
