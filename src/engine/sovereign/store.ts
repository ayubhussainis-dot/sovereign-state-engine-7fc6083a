/**
 * SovereignStore — singleton snapshot store bound to React via
 * `useSyncExternalStore`. No auto-start, no external feed, no writes
 * outside of `.tick()` / `.transition()`. HETIS-safe: it does not touch
 * the existing engine kernel or the HETIS bus.
 */

import {
  GENOME_EDGES,
  isLegalTransition,
  type Phase,
} from "./genome";
import { evaluateG2, type G2Reading } from "./g2-checkpoint";
import { evaluateAuthority, type AuthorityReading } from "./risk-authority";
import {
  createRolling,
  evaluateConvergence,
  type ConvergenceReading,
  type RollingSample,
} from "./convergence";
import { circadianRegime, waveMultiplier } from "./circadian";
import { createEventLedger, type EventLedger, type LedgerEvent } from "./event-ledger";

export interface SovereignSnapshot {
  phase: Phase;
  tick: number;
  wave: number;
  regime: ReturnType<typeof circadianRegime>;
  g2: G2Reading;
  authority: AuthorityReading;
  convergence: ConvergenceReading;
  drawdownFraction: number;
  consecutiveLosses: number;
  events: LedgerEvent[];
}

export interface TickInput {
  price: number;
  volume: number;
  interTradeMs: number;
  volatility: number;
  drawdownFraction?: number;
  consecutiveLosses?: number;
}

export interface SovereignStore {
  getSnapshot(): SovereignSnapshot;
  subscribe(listener: () => void): () => void;
  tick(input: TickInput): SovereignSnapshot;
  transition(to: Phase, reason?: string): boolean;
  ledger: EventLedger;
  reset(): void;
}

const EMPTY_CONVERGENCE: ConvergenceReading = {
  priceZ: 0,
  volumeZ: 0,
  timeZ: 0,
  volatilityZ: 0,
  convergent: false,
  strength: 0,
};

interface InternalState {
  phase: Phase;
  tick: number;
  wave: number;
  regime: ReturnType<typeof circadianRegime>;
  g2: G2Reading;
  authority: AuthorityReading;
  convergence: ConvergenceReading;
  drawdownFraction: number;
  consecutiveLosses: number;
}

function initialState(): InternalState {
  return {
    phase: "G0_HOMEOSTASIS",
    tick: 0,
    wave: waveMultiplier(0),
    regime: circadianRegime(waveMultiplier(0)),
    g2: evaluateG2(0),
    authority: evaluateAuthority({ drawdownFraction: 0, consecutiveLosses: 0 }),
    convergence: EMPTY_CONVERGENCE,
    drawdownFraction: 0,
    consecutiveLosses: 0,
  };
}

export function createSovereignStore(): SovereignStore {
  let state = initialState();
  const listeners = new Set<() => void>();
  const ledger = createEventLedger(400);

  const price: RollingSample = createRolling(30);
  const volume: RollingSample = createRolling(30);
  const inter: RollingSample = createRolling(30);
  const vol: RollingSample = createRolling(30);

  let snapshot: SovereignSnapshot = { ...state, events: ledger.tail(50) };
  ledger.onAppend(() => {
    snapshot = { ...state, events: ledger.tail(50) };
    for (const l of listeners) l();
  });

  const emit = () => {
    snapshot = { ...state, events: ledger.tail(50) };
    for (const l of listeners) l();
  };

  function transition(to: Phase, reason?: string): boolean {
    if (!isLegalTransition(state.phase, to)) {
      ledger.append({
        type: "PHASE_REJECTED",
        phase: state.phase,
        payload: { attempted: to, allowed: GENOME_EDGES[state.phase], reason },
      });
      return false;
    }
    if (to !== state.phase) {
      state = { ...state, phase: to };
      ledger.append({ type: "PHASE_ENTERED", phase: to, payload: { reason } });
    }
    emit();
    return true;
  }

  function tick(input: TickInput): SovereignSnapshot {
    const nextTick = state.tick + 1;
    price.push(input.price);
    volume.push(input.volume);
    inter.push(input.interTradeMs);
    vol.push(input.volatility);

    const convergence = evaluateConvergence({
      priceZ: price.z(input.price),
      volumeZ: volume.z(input.volume),
      timeZ: inter.z(input.interTradeMs),
      volatilityZ: vol.z(input.volatility),
    });

    const dd = input.drawdownFraction ?? state.drawdownFraction;
    const losses = input.consecutiveLosses ?? state.consecutiveLosses;
    const g2 = evaluateG2(dd);
    const authority = evaluateAuthority({
      drawdownFraction: dd,
      consecutiveLosses: losses,
    });
    const wave = waveMultiplier(nextTick);
    const regime = circadianRegime(wave);

    state = {
      ...state,
      tick: nextTick,
      wave,
      regime,
      g2,
      authority,
      convergence,
      drawdownFraction: dd,
      consecutiveLosses: losses,
    };

    if (convergence.convergent) {
      ledger.append({
        type: "CONVERGENCE_7777",
        phase: state.phase,
        payload: { strength: convergence.strength },
      });
      if (isLegalTransition(state.phase, "SYSTEM_INTERRUPT")) {
        transition("SYSTEM_INTERRUPT", "7777 convergence");
      }
    }

    if (authority.state === "HALTED" && state.phase !== "G0_HOMEOSTASIS") {
      // Force parking in G0 requires legal edges; step through if possible.
      const legal = GENOME_EDGES[state.phase] ?? [];
      if (legal.includes("G0_HOMEOSTASIS")) {
        transition("G0_HOMEOSTASIS", "authority HALTED");
      }
    }

    if (nextTick % 10 === 0) {
      ledger.append({
        type: "CIRCADIAN_TICK",
        phase: state.phase,
        payload: { wave, regime },
      });
    }

    emit();
    return snapshot;
  }

  function reset() {
    state = initialState();
    ledger.clear();
    emit();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tick,
    transition,
    ledger,
    reset,
  };
}

const globalKey = "__hetisSovereignStore" as const;
type Globalish = typeof globalThis & { [globalKey]?: SovereignStore };

export function getSovereignStore(): SovereignStore {
  const g = globalThis as Globalish;
  if (!g[globalKey]) g[globalKey] = createSovereignStore();
  return g[globalKey]!;
}
