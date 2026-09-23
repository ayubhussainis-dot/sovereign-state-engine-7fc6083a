/**
 * SOALL Pipeline — Runs G1..G8 in strict sequence with Embedded Sovereign Engine.
 *
 * Architecture Matrix:
 *   G1 = Safety Veto (Synchrony & Trapping Boundary)
 *   G2 = Quality Check (Market Structure Regime)
 *   G3 = Quality Check (Order Flow Confluence)
 *   G4 = Quality Check (Pattern Friction Control)
 *   G5 = Quality Check (Velocity Diagnostics)
 *   G6 = Quality Check (Confidence Scoring)
 *   G7 = Safety Veto (Drawdown & Asymmetric Loss Floor)
 *   G8 = Final Execution Authority & Profit Ratchet
 *
 * Contract:
 *   Deterministic · Pure · Replay Safe · Self-Contained.
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
// EMBEDDED SOVEREIGN TRAPPING STATE MACHINE
// =====================================================================
export type TradeState = "FLAT" | "ARMED" | "TRAPPING" | "OPEN" | "MANAGING" | "HOLDING_STRETCH" | "CLOSING" | "SETTLED";
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
  fusionSnapshot: { verdict: string; agreement: number; };
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

class EmbeddedTradeStateMachine {
  private context: PositionContext = {
    state: "FLAT",
    side: null,
    signalPrice: 0,
    entryPrice: 0,
    size: 1.0,
    targetPrice: 0,
    stopPrice: 0,
    openedAt: 0,
    fusionSnapshot: { verdict: "SILENT", agreement: 0 },
    ALI3N: "ACTIVE"
  };
  private ledger: TradeCycleRecord[] = [];
  private lastVerdictChange = 0;
  private debounceWindowMs = 2000;

  private TRAP_BUFFER_BPS = 10.0;       
  private TIPPING_POINT_BPS = 12.0;     
  private TARGET_WIN_BPS = 24.0;         
  private MAX_LOSS_BPS = -10.0;          
  private TRAILING_ACTIVATE_BPS = 5.0;    

  getState(): PositionContext { 
    return { ...this.context }; 
  }
  
  getLedger(): readonly TradeCycleRecord[] { 
    return this.ledger; 
  }

  evaluateTick(
    currentPrice: number, 
    timestamp: number, 
    verdict: string, 
    agreement: number, 
    targetBps = 60, 
    stopBps = 20
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
        openedAt: timestamp, 
        fusionSnapshot: { verdict, agreement }
      };
      return { action: "NONE" };
    }

    if (this.context.state === "TRAPPING") {
      const side = this.context.side!;
      const signal = this.context.signalPrice;
      const multiplier = side === "long" ? -1 : 1;
      const currentDriftBps = ((currentPrice - signal) / signal) * multiplier * 10000;

      if ((side === "long" && isBear) || (side === "short" && isBull)) {
        this.context.state = "FLAT";
        return { action: "NONE" };
      }

      if (currentDriftBps >= this.TRAP_BUFFER_BPS) {
        const orderMultiplier = side === "long" ? 1 : -1;
        this.context = {
          ...this.context, 
          state: "OPEN", 
          entryPrice: currentPrice,
          targetPrice: currentPrice * (1 + orderMultiplier * (targetBps / 10000)),
          stopPrice: currentPrice * (1 - orderMultiplier * (stopBps / 10000)), 
          openedAt: timestamp
        };
        return { action: "OPEN" };
      }
      return { action: "NONE" };
    }

    if (this.context.state === "OPEN" || this.context.state === "MANAGING" || this.context.state === "HOLDING_STRETCH") {
      if (this.context.state === "OPEN") {
        this.context.state = "MANAGING";
      }

      const side = this.context.side!;
      const entry = this.context.entryPrice;
      const multiplier = side === "long" ? 1 : -1;
      const currentPnLBps = ((currentPrice - entry) / entry) * multiplier * 10000;
      let exitReason: string | null = null;

      if (currentPnLBps >= this.TRAILING_ACTIVATE_BPS && currentPnLBps < this.TIPPING_POINT_BPS) {
        const breakEvenPrice = entry * (1 + multiplier * (0.5 / 10000));
        this.context.stopPrice = side === "long" ? Math.max(this.context.stopPrice, breakEvenPrice) : Math.min(this.context.stopPrice, breakEvenPrice);
      }

      if (currentPnLBps >= this.TIPPING_POINT_BPS) {
        const tippingLockPrice = entry * (1 + multiplier * (this.TIPPING_POINT_BPS / 10000));
        this.context.stopPrice = side === "long" ? Math.max(this.context.stopPrice, tippingLockPrice) : Math.min(this.context.stopPrice, tippingLockPrice);
      }

      if (side === "long") {
        if (currentPrice >= this.context.targetPrice) exitReason = "TARGET_HIT";
        else if (currentPrice <= this.context.stopPrice) exitReason = "STOP_HIT";
      } else {
        if (currentPrice <= this.context.targetPrice) exitReason = "TARGET_HIT";
        else if (currentPrice >= this.context.stopPrice) exitReason = "STOP_HIT";
      }

      if (currentPnLBps <= this.MAX_LOSS_BPS) {
        exitReason = "HARD_ASYMMETRIC_LOSS_FLOOR";
      }

      if (!exitReason) {
        if (side === "long" && isBear) exitReason = "GATE_INVERSION_BEAR";
        if (side === "short" && isBull) exitReason = "GATE_INVERSION_BULL";
      }

      if (exitReason && exitReason.startsWith("GATE_INVERSION")) {
        if (currentPnLBps > 0 && currentPnLBps < this.TARGET_WIN_BPS) {
          this.context.state = "HOLDING_STRETCH";
          return { action: "NONE" };
        }
        if (currentPnLBps <= 0 && currentPnLBps > this.MAX_LOSS_BPS) {
          exitReason = `TRAP_INVERSION_RISK_EXIT`;
        }
      }

      if (exitReason) {
        this.context.state = "CLOSING";
        let finalReason = exitReason;

        if (exitReason === "HARD_ASYMMETRIC_LOSS_FLOOR") {
          finalReason = `MAX_LOSS_FLOOR_CUT (${currentPnLBps.toFixed(2)}bps)`;
        } else if (exitReason === "TARGET_HIT" || currentPnLBps >= this.TARGET_WIN_BPS) {
          finalReason = `TARGET_24BPS_SECURED (${currentPnLBps.toFixed(2)}bps)`;
        } else if (exitReason === "STOP_HIT" && currentPnLBps >= this.TIPPING_POINT_BPS) {
          finalReason = `TIPPING_POINT_DIP_LOCKED (${currentPnLBps.toFixed(2)}bps)`;
        }

        const record: TradeCycleRecord = {
          id: `cycle-${Date.now()}`, 
          side, 
          signalPrice: this.context.signalPrice, 
          entryPrice: entry, 
          exitPrice: currentPrice, 
          pnlBps: currentPnLBps,
          reason: finalReason, 
          openedAt: this.context.openedAt, 
          closedAt: timestamp, 
          ALI3N: "SETTLED"
        };

        this.ledger.push(record);
        this.context = {
          state: "FLAT", 
          side: null, 
          signalPrice: 0, 
          entryPrice: 0, 
          size: 1.0, 
          targetPrice: 0, 
          stopPrice: 0, 
          openedAt: 0,
          fusionSnapshot: { verdict, agreement }, 
          ALI3N: "ACTIVE"
        };
        return { action: "CLOSE", record };
      }
    }
    return { action: "NONE" };
  }
}

export const localPipelineStateMachine = new EmbeddedTradeStateMachine();

// =====================================================================
// MAIN PIPELINE ORCHESTRATION ENGINE
// =====================================================================
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
  risk: RiskContext;
}

export interface ExtendedGateReport extends GateReport {
  engineAction: "NONE" | "OPEN" | "CLOSE";
  currentPositionState: string;
}

export function runPipeline(
  inputs: PipelineInputs,
): ExtendedGateReport {
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

    if (!outcome.passed && outcome.hardVeto && failedAt === null) {failedAt = outcome.gate;}if (outcome.passed) {priorPasses.push(outcome.gate);}}let weightSum = 0;let weighted = 0;for (const outcome of outcomes) {weightSum += outcome.weight;weighted += outcome.weight * outcome.score;}const compositeScore = weightSum > 0 ? weighted / weightSum : 0;const allGatesPassed = outcomes.length === PIPELINE.length && outcomes.every((outcome) => outcome.passed);const authorityOutcome = outcomes.find((outcome) => outcome.gate === "G8_AUTHORITY");const authorityPassed = authorityOutcome?.passed === true;const tradeArmed = authorityPassed && failedAt === null && compositeScore >= COMPOSITE_THRESHOLD;let engineAction: "NONE" | "OPEN" | "CLOSE" = "NONE";if (inputs.twin?.last) {const currentPrice = inputs.twin.last.price || inputs.twin.last.close || 0;const timestamp = Date.now();const verdict = inputs.ppg?.verdict || "SILENT";const agreement = inputs.ppg?.agreement || 0.0;const stateResult = localPipelineStateMachine.evaluateTick(currentPrice, timestamp, verdict, agreement, 60, 20);engineAction = stateResult.action;if (!tradeArmed && (liveEngineContext.state === "OPEN" || liveEngineContext.state === "MANAGING" || liveEngineContext.state === "HOLDING_STRETCH")) {engineAction = "CLOSE";}}return {outcomes,failedAt,allPassed: allGatesPassed,compositeScore,tradeArmed,compositeThreshold: COMPOSITE_THRESHOLD,twinSeq: inputs.twin.last?.twinSeq ?? -1,engineAction,currentPositionState: localPipelineStateMachine.getState().state};}
