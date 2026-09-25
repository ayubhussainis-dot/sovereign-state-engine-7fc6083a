/**
 * SOALL Pipeline — Optimized Micro Trade Architecture
 * --------------------------------------------------------------------
 */
import { g1Synchrony } from "./gates/g1-synchrony";
import { g2Structure } from "./gates/g2-structure";
import { g3Confluence } from "./gates/g3-confluence";
import { g4Pattern } from "./gates/g4-pattern";
import { g5Examination } from "./gates/g5-examination";
import { g6Confidence } from "./gates/g6-confidence";
import { g7Risk } from "./gates/g7-risk";
import { g8Authority } from "./gates/g8-authority";

import type {
  Gate,
  GateId,
  GateInputs,
  GateOutcome,
  GateReport,
  RiskContext,
} from "./types";
import type { PPGSnapshot } from "@/ppg/types";
import type { TwinSnapshot } from "@/twin/types";

// =====================================================================
// TRADE SYSTEM TYPES
// =====================================================================
export type TradeState =
  | "FLAT"
  | "ARMED"
  | "TRAPPING"
  | "OPEN"
  | "MANAGING"
  | "CLOSING";

export type Side = "long" | "short";

export interface PositionContext {
  state: TradeState;
  side: Side | null;
  signalPrice: number;
  entryPrice: number;
  size: number;
  targetPrice: number;
  stopPrice: number;
  openedAt: number;
  fusionSnapshot: { verdict: string; agreement: number };
  ALI3N: string;
}

export interface TradeCycleRecord {
  id: string;
  side: Side;
  signalPrice: number;
  entryPrice: number;
  exitPrice: number;
  pnlBps: number;
  reason: string;
  openedAt: number;
  closedAt: number;
  ALI3N: string;
}

// =====================================================================
// AUTHORITATIVE NUMERIC CONTRACT
// =====================================================================
const ENTRY_BPS = 0.0001;
const TARGET_WIN_BPS = 0.0030;
const MAX_LOSS_BPS = -0.0030;
const LOCKOUT_DISPLACEMENT_BPS = 0.0025; // 25 BPS continuous move required after a loss

// =====================================================================
// STATEFUL LOCAL PROCESSING ENGINE
// =====================================================================
class EmbeddedTradeStateMachine {
  private context: PositionContext = {
    state: "FLAT",
    side: null,
    signalPrice: 0,
    entryPrice: 0,
    size: 0.001,
    targetPrice: 0,
    stopPrice: 0,
    openedAt: 0,
    fusionSnapshot: { verdict: "SILENT", agreement: 0 },
    ALI3N: "ACTIVE",
  };

  private ledger: TradeCycleRecord[] = [];
  private lastVerdictChange = 0;
  private readonly debounceWindowMs = 2000;

  // --- SYMBOL LOCKOUT TRACKING FOR LOSSES ---
  private symbolLockouts: Record<string, { exitPrice: number; side: Side }> = {};

  getState(): PositionContext {
    return { ...this.context };
  }

  getLedger(): readonly TradeCycleRecord[] {
    return this.ledger;
  }

  isSymbolLockedOut(symbol: string, currentPrice: number): boolean {
    const lockout = this.symbolLockouts[symbol];
    if (!lockout) return false;

    const multiplier = lockout.side === "long" ? 1 : -1;
    const displacementBps = ((currentPrice - lockout.exitPrice) / lockout.exitPrice) * multiplier;

    if (Math.abs((currentPrice - lockout.exitPrice) / lockout.exitPrice) >= LOCKOUT_DISPLACEMENT_BPS) {
      delete this.symbolLockouts[symbol]; // Clear lockout once 25 BPS continuous move is reached
      return false;
    }

    return true;
  }

  private registerLossLockout(symbol: string, exitPrice: number, side: Side) {
    this.symbolLockouts[symbol] = { exitPrice, side };
  }

  private getDirectionMultiplier(side: Side): number {
    return side === "long" ? 1 : -1;
  }

  private calculateFavorableMovement(currentPrice: number, signalPrice: number, side: Side): number {
    if (!signalPrice || !Number.isFinite(signalPrice)) return 0;
    const multiplier = this.getDirectionMultiplier(side);
    return ((currentPrice - signalPrice) / signalPrice) * multiplier;
  }

  private calculatePnLBps(currentPrice: number, entryPrice: number, side: Side): number {
    if (!entryPrice || !Number.isFinite(entryPrice)) return 0;
    const multiplier = this.getDirectionMultiplier(side);
    return ((currentPrice - entryPrice) / entryPrice) * multiplier;
  }

  private calculateTargetPrice(entryPrice: number, side: Side): number {
    const multiplier = this.getDirectionMultiplier(side);
    return entryPrice * (1 + multiplier * TARGET_WIN_BPS);
  }

  private calculateStopPrice(entryPrice: number, side: Side): number {
    const multiplier = this.getDirectionMultiplier(side);
    return entryPrice * (1 + multiplier * MAX_LOSS_BPS);
  }

  private resetToFlat(verdict: string, agreement: number): void {
    this.context = {
      state: "FLAT",
      side: null,
      signalPrice: 0,
      entryPrice: 0,
      size: 0.001,
      targetPrice: 0,
      stopPrice: 0,
      openedAt: 0,
      fusionSnapshot: { verdict, agreement },
      ALI3N: "ACTIVE",
    };
  }

  private settlePosition(
    currentPrice: number,
    timestamp: number,
    verdict: string,
    agreement: number,
    reason: string,
    symbol: string = "BTCUSDT",
  ): { action: "CLOSE"; record: TradeCycleRecord } {
    const side = this.context.side!;
    const entry = this.context.entryPrice;
    const pnl = this.calculatePnLBps(currentPrice, entry, side);

    this.context.state = "CLOSING";

    const record: TradeCycleRecord = {
      id: `cycle-${Date.now()}`,
      side,
      signalPrice: this.context.signalPrice,
      entryPrice: entry,
      exitPrice: currentPrice,
      pnlBps: pnl,
      reason,
      openedAt: this.context.openedAt,
      closedAt: timestamp,
      ALI3N: "SETTLED",
    };

    this.ledger.push(record);

    // If position ended in loss, lock out symbol until 25 BPS continuous move
    if (pnl < 0) {
      this.registerLossLockout(symbol, currentPrice, side);
    }

    this.resetToFlat(verdict, agreement);

    return { action: "CLOSE", record };
  }

  evaluateTick(
    currentPrice: number,
    timestamp: number,
    verdict: string,
    agreement: number,
    authorityExitReason?: string | null,
    symbol: string = "BTCUSDT",
  ): { action: "NONE" | "OPEN" | "CLOSE"; record?: TradeCycleRecord } {
    const isBull = verdict === "LOCKED-BULL";
    const isBear = verdict === "LOCKED-BEAR";

    if (timestamp - this.lastVerdictChange > this.debounceWindowMs) {
      if (this.context.state === "FLAT" && (isBull || isBear) && agreement > 0.75) {
        this.context.state = "ARMED";
        this.lastVerdictChange = timestamp;
      }
    }

    if (this.context.state === "ARMED") {
      const side: Side = isBull ? "long" : "short";
      this.context = {
        ...this.context,
        state: "TRAPPING",
        side,
        signalPrice: currentPrice,
        entryPrice: 0,
        targetPrice: 0,
        stopPrice: 0,
        openedAt: timestamp,
        fusionSnapshot: { verdict, agreement },
      };
      return { action: "NONE" };
    }

    if (this.context.state === "TRAPPING") {
      const side = this.context.side!;
      const signal = this.context.signalPrice;

      if (!signal || !Number.isFinite(signal)) return { action: "NONE" };

      if ((side === "long" && isBear) || (side === "short" && isBull)) {
        this.resetToFlat(verdict, agreement);
        return { action: "NONE" };
      }

      const favorableMovement = this.calculateFavorableMovement(currentPrice, signal, side);

      if (favorableMovement >= ENTRY_BPS) {
        const entryPrice = currentPrice;
        this.context = {
          ...this.context,
          state: "OPEN",
          entryPrice,
          targetPrice: this.calculateTargetPrice(entryPrice, side),
          stopPrice: this.calculateStopPrice(entryPrice, side),
          openedAt: timestamp,
        };
        return { action: "OPEN" };
      }
      return { action: "NONE" };
    }

    if (this.context.state === "OPEN" || this.context.state === "MANAGING") {
      if (this.context.state === "OPEN") this.context.state = "MANAGING";

      const side = this.context.side!;
      const entry = this.context.entryPrice;
      const currentPnLBps = this.calculatePnLBps(currentPrice, entry, side);

      if (authorityExitReason) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `G8_AUTHORITY_EXIT · ${authorityExitReason}`,
          symbol,
        );
      }

      if (currentPnLBps >= TARGET_WIN_BPS) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `TARGET_30BPS_SECURED (${(currentPnLBps * 10000).toFixed(2)} bps)`,
          symbol,
        );
      }

      if (currentPnLBps <= MAX_LOSS_BPS) {
        return this.settlePosition(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          `MAX_LOSS_30BPS_REACHED (${(currentPnLBps * 10000).toFixed(2)} bps)`,
          symbol,
        );
      }

      if (side === "long") {
        if (currentPrice >= this.context.targetPrice) {
          return this.settlePosition(currentPrice, timestamp, verdict, agreement, `TARGET_30BPS_SECURED (${(currentPnLBps * 10000).toFixed(2)} bps)`, symbol);
        }
        if (currentPrice <= this.context.stopPrice) {
          return this.settlePosition(currentPrice, timestamp, verdict, agreement, `MAX_LOSS_30BPS_REACHED (${(currentPnLBps * 10000).toFixed(2)} bps)`, symbol);
        }
      }

      if (side === "short") {
        if (currentPrice <= this.context.targetPrice) {
          return this.settlePosition(currentPrice, timestamp, verdict, agreement, `TARGET_30BPS_SECURED (${(currentPnLBps * 10000).toFixed(2)} bps)`, symbol);
        }
        if (currentPrice >= this.context.stopPrice) {
          return this.settlePosition(currentPrice, timestamp, verdict, agreement, `MAX_LOSS_30BPS_REACHED (${(currentPnLBps * 10000).toFixed(2)} bps)`, symbol);
        }
      }
    }

    return { action: "NONE" };
  }
}

export const localPipelineStateMachine = new EmbeddedTradeStateMachine();

const PIPELINE: readonly Gate[] = [
  g1Synchrony,
  g2Structure,
  g3Confluence,
  g4Pattern,
  g5Examination,
  g6Confidence,
  g7Risk,
  g8Authority,
];

const COMPOSITE_THRESHOLD = 0.0;

export interface PipelineInputs {
  twin: TwinSnapshot;
  ppg: PPGSnapshot;
  risk: RiskContext & {
    positionState?: string;
    positionSide?: Side | null;
    entryPrice?: number;
    signalPrice?: number;
    currentPrice?: number;
  };
}

export interface ExtendedGateReport extends GateReport {
  engineAction: "NONE" | "OPEN" | "CLOSE";
  currentPositionState: string;
}

export function runPipeline(inputs: PipelineInputs): ExtendedGateReport {
  const outcomes: GateOutcome[] = [];
  const priorPasses: GateId[] = [];
  let failedAt: GateId | null = null;
  const liveEngineContext = localPipelineStateMachine.getState();

  inputs.risk.positionState = liveEngineContext.state;
  inputs.risk.positionSide = liveEngineContext.side;
  inputs.risk.entryPrice = liveEngineContext.entryPrice;
  inputs.risk.signalPrice = liveEngineContext.signalPrice;
  inputs.risk.currentPrice = inputs.twin.last?.price || inputs.twin.last?.close || 0;

  for (const gate of PIPELINE) {
    const gateInputs: GateInputs = {
      twin: inputs.twin,
      ppg: inputs.ppg,
      risk: inputs.risk,
      priorPasses: priorPasses.slice(),
    };
    const outcome = gate(gateInputs);
    outcomes.push(outcome);
    if (!outcome.passed && outcome.hardVeto && failedAt === null) {
      failedAt = outcome.gate;
    }
    if (outcome.passed) {
      priorPasses.push(outcome.gate);
    }
  }

  let weightSum = 0;
  let weighted = 0;
  for (const outcome of outcomes) {
    weightSum += outcome.weight;
    weighted += outcome.weight * outcome.score;
  }

  const compositeScore = weightSum > 0 ? weighted / weightSum : 0;
  const allGatesPassed = outcomes.length === PIPELINE.length && outcomes.every((outcome) => outcome.passed);
  const authorityOutcome = outcomes.find((outcome) => outcome.gate === "G8_AUTHORITY");
  const authorityPassed = authorityOutcome?.passed === true;
  const tradeArmed = authorityPassed && failedAt === null && compositeScore >= COMPOSITE_THRESHOLD;
  const authorityEvidence = authorityOutcome?.evidence as { exitTriggered?: boolean; exitReason?: string } | undefined;
  const authorityExitTriggered = authorityEvidence?.exitTriggered === true;
  const authorityExitReason = authorityEvidence?.exitReason || "G8_EXIT";

  let engineAction: "NONE" | "OPEN" | "CLOSE" = "NONE";

  if (inputs.twin?.last) {
    const currentPrice = inputs.twin.last.price || inputs.twin.last.close || 0;
    const timestamp = Date.now();
    const agreement = inputs.ppg?.agreement || 0;
    let verdict = inputs.ppg?.verdict || "SILENT";
    const symbol = inputs.twin.symbol || "BTCUSDT";

    // --- 25 BPS LOSS LOCKOUT CHECK ---
    if (liveEngineContext.state === "FLAT" && localPipelineStateMachine.isSymbolLockedOut(symbol, currentPrice)) {
      verdict = "SILENT"; // Forces verdict silent to prevent immediate re-entry churn
    }

    // --- AGREEMENT SHIELD FILTER ---
    if (liveEngineContext.state === "FLAT" && agreement < 0.82) {
      verdict = "SILENT";
    }

    const positionWasLive = liveEngineContext.state === "OPEN" || liveEngineContext.state === "MANAGING";
    const strategicExit = positionWasLive && authorityExitTriggered ? authorityExitReason : null;

    const stateResult = localPipelineStateMachine.evaluateTick(
      currentPrice,
      timestamp,
      verdict,
      agreement,
      strategicExit,
      symbol,
    );
    engineAction = stateResult.action;

    if (engineAction === "NONE" && !tradeArmed && positionWasLive) {
      const currentState = localPipelineStateMachine.getState();
      if (currentState.state === "OPEN" || currentState.state === "MANAGING") {
        const forcedResult = localPipelineStateMachine.evaluateTick(
          currentPrice,
          timestamp,
          verdict,
          agreement,
          "HARD_GATE_VETO",
          symbol,
        );
        engineAction = forcedResult.action;
      }
    }
  }

  if (engineAction === "OPEN" || engineAction === "CLOSE") {
    const currentState = localPipelineStateMachine.getState();
    const orderSide = currentState.side === "long" ? "BUY" : "SELL";
    fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: engineAction,
        side: orderSide,
        quantity: currentState.size,
        symbol: inputs.twin.symbol || "BTCUSDT",
        price: inputs.risk.currentPrice,
      }),
    }).catch((err) => {
      console.error("Failed to dispatch execution signal to backend worker:", err);
    });
  }

  const finalEngineContext = localPipelineStateMachine.getState();
  return {
    outcomes,
    failedAt,
    allPassed: allGatesPassed,
    compositeScore,
    tradeArmed,
    compositeThreshold: COMPOSITE_THRESHOLD,
    twinSeq: inputs.twin.last?.twinSeq ?? -1,
    engineAction,
    currentPositionState: finalEngineContext.state,
  };
}
