import { useEffect, useState } from "react";
import { allEngines } from "@/twin/markets";
import type { MarketSnapshot } from "@/twin/market-engine";

/**
 * Runs every supported market's independent engine and polls their
 * snapshots at a fixed UI cadence (engines tick at feed rate; the UI
 * samples them so rendering stays at 60 FPS regardless of tick volume).
 */
export function useMarkets(active: boolean, intervalMs = 250): MarketSnapshot[] {
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>(() =>
    allEngines().map((e) => e.snapshot()),
  );

  useEffect(() => {
    const engines = allEngines();
    if (!active) {
      for (const e of engines) {
        e.stop();
        e.reset();
      }
      setSnapshots(engines.map((e) => e.snapshot()));
      return;
    }
    for (const e of engines) e.start();
    const id = window.setInterval(() => {
      setSnapshots(engines.map((e) => e.snapshot()));
    }, intervalMs);
    return () => {
      window.clearInterval(id);
      for (const e of engines) e.stop();
    };
  }, [active, intervalMs]);

  return snapshots;
}
