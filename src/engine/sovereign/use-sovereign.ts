import { useSyncExternalStore } from "react";
import { getSovereignStore, type SovereignSnapshot } from "./store";

export function useSovereign(): SovereignSnapshot {
  const store = getSovereignStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
}
