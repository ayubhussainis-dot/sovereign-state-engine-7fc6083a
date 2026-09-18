import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";

// Define the shape of the incoming live position data
export interface ActivePositionMetrics {
  hasPosition: boolean;
  positionAmt: number;
  entryPrice: number;
  unRealizedProfit: number;
  leverage: number;
  // Added performance tracking metrics for wins, losses, and win rate
  wins?: number;
  losses?: number;
  winRate?: number;
  peakProfit?: number; // Added to support the 50% trailing profit lock tracking
}

interface RihalDashboardProps {
  currentState: SDTState;
  telemetry: TelemetryData & { edartradeSignal?: string | null };
  zScore: number;
  sMultiplier: number;
  // New prop to receive the live broker telemetry
  positionMetrics?: ActivePositionMetrics | null; 
}

export const RihalDashboard: React.FC<RihalDashboardProps> = ({
  currentState,
  telemetry,
  zScore,
  sMultiplier,
  positionMetrics,
}) => {
  const isArrested = currentState === "P53_ARREST";

  return (
    <div
      className={`w-full max-w-4xl mx-auto p-6 bg-black border ${
        isArrested ? "border-red-900" : "border-zinc-800"
      } text-white rounded-none font-mono`}
    >
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl tracking-widest font-bold text-zinc-100">
            J.O.ALL — JACK OF ALL
          </h1>
          <p className="text-xs text-zinc-500">
            MARKET DIGITAL TWIN · PPG · SOALL 8-GATE GOVERNANCE
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-500 block">SYSTEM STATUS STATE</span>
          <span
            className={`text-sm font-bold tracking-wider ${
              isArrested ? "text-red-500 animate-pulse" : "text-emerald-400"
            }`}
          >
            {currentState}
          </span>
        </div>
      </div>

      {/* EDARTRADE Engine Signal Banner */}
      <div className="mb-6 bg-zinc-950 border border-zinc-800 p-3 flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          EDARTRADE MOMENTUM PULSE:
        </span>
        <span className="text-emerald-300 font-mono tracking-wide">
          {telemetry.edartradeSignal || "MONITORING TICK ACCELERATION (PCM '1')..."}
        </span>
      </div>

      <div className="relative h-96 bg-zinc-950/40 border border-zinc-900 flex items-center justify-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <line
            x1="10%"
            y1="10%"
            x2="50%"
            y2="50%"
            stroke={
              currentState !== "G0_HOMEOSTASIS" && !isArrested ? "#34d399" : "#27272a"
            }
            strokeWidth="2"
            strokeDasharray={currentState === "G1_ACCUMULATION" ? "5,5" : "none"}
          />
          <line
            x1="10%"
            y1="90%"
            x2="50%"
            y2="50%"
            stroke={
              currentState !== "G0_HOMEOSTASIS" && !isArrested ? "#34d399" : "#27272a"
            }
            strokeWidth="2"
          />
          <line
            x1="50%"
            y1="50%"
            x2="90%"
            y2="10%"
            stroke={currentState === "M_MITOSIS" ? "#60a5fa" : "#27272a"}
            strokeWidth="2"
            className={currentState === "M_MITOSIS" ? "animate-pulse" : ""}
          />
          <line
            x1="50%"
            y1="50%"
            x2="90%"
            y2="90%"
            stroke={currentState === "M_MITOSIS" ? "#60a5fa" : "#27272a"}
            strokeWidth="2"
          />
          <circle
            cx="50%"
            cy="50%"
            r="8"
            fill={
              isArrested
                ? "#ef4444"
                : currentState === "S_SYNTHESIS"
                  ? "#fbbf24"
                  : "#09090b"
            }
            stroke={isArrested ? "#ef4444" : "#52525b"}
            strokeWidth="2"
          />
        </svg>

        <div className="absolute left-6 top-6 w-48 bg-zinc-900/80 p-3 border border-zinc-800 text-xs space-y-2">
          <div className="text-zinc-400 font-bold border-b border-zinc-800 pb-1">
            ACCUMULATION MATRIX [G0→S]
          </div>
          <div>
            Rolling Z-Score:{" "}
            <span className="font-bold text-zinc-200">{zScore.toFixed(2)}</span>
          </div>
          <div>
            OFI Velocity:{" "}
            <span className="font-bold text-zinc-200">
              {(telemetry.currentOfi ?? 0).toFixed(0)}
            </span>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-5 text-center text-[10px] tracking-widest text-zinc-500">
          GEOMETRIC ZERO HUB [A = 0]
        </div>

        <div className="absolute right-6 top-6 w-48 bg-zinc-900/80 p-3 border border-zinc-800 text-xs space-y-2">
          <div className="text-zinc-400 font-bold border-b border-zinc-800 pb-1">
            MITOSIS PAYLOAD [M]
          </div>
          <div>
            S-Multiplier:{" "}
            <span className="font-bold text-amber-400">{sMultiplier.toFixed(4)}</span>
          </div>
          <div>
            Tensegrity Struts:{" "}
            <span className="font-bold text-zinc-200">
              {((telemetry.liquidityDepth ?? 0) / ((telemetry.volatility ?? 0) || 1)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">COMPRESSION STRUTS (DEPTH)</span>
          <span className="text-sm font-bold text-zinc-200">
            {(telemetry.liquidityDepth ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">TENSION CABLES (VOLATILITY)</span>
          <span className="text-sm font-bold text-cyan-400">
            {(telemetry.volatility ?? 0.0200).toFixed(4)}
          </span>
        </div>
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">
            SIGNAL Z-SCORE RECALIBRATION
          </span>
          <span
            className={`text-sm font-bold ${
              Math.abs(zScore) > 2.5 ? "text-amber-400" : "text-zinc-400"
            }`}
          >
            {zScore.toFixed(4)}
          </span>
        </div>
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">
            ACTIVE STRUCTURAL SYSTEM WEIGHT
          </span>
          <span className="text-sm font-bold text-amber-400">
            {positionMetrics?.hasPosition 
                ? `${(Math.abs(positionMetrics.positionAmt) * positionMetrics.leverage).toFixed(2)}x` 
                : "0.00x"}
          </span>
        </div>
      </div>

      {/* --- ACTIVE PAYLOAD & PNL TRACKER --- */}
      <div className="mt-6 border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-emerald-500 font-mono text-[10px] mb-3 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            STRUCTURAL PAYLOAD TELEMETRY & WIN/LOSS TRACKER
        </div>
        
        {positionMetrics?.hasPosition ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                <div className="border-l border-zinc-800 pl-2">
                    <span className="text-zinc-500 block mb-1">DIRECTION</span> 
                    <span className={positionMetrics.positionAmt > 0 ? "text-emerald-500" : "text-red-500"}>
                        {positionMetrics.positionAmt > 0 ? "LONG [▲]" : "SHORT [▼]"}
                    </span>
                </div>
                <div className="border-l border-zinc-800 pl-2">
                    <span className="text-zinc-500 block mb-1">PAYLOAD MASS</span> 
                    <span className="text-white">{Math.abs(positionMetrics.positionAmt)} BTC</span>
                </div>
                <div className="border-l border-zinc-800 pl-2">
                    <span className="text-zinc-500 block mb-1">ENTRY ANCHOR</span> 
                    <span className="text-white">${positionMetrics.entryPrice.toFixed(2)}</span>
                </div>
                <div className="border-l border-zinc-800 pl-2">
                    <span className="text-zinc-500 block mb-1">DELTA [U.PNL]</span> 
                    <span className={positionMetrics.unRealizedProfit >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {positionMetrics.unRealizedProfit >= 0 ? "+" : ""}
                        {positionMetrics.unRealizedProfit.toFixed(4)} USDT
                    </span>
                </div>
            </div>
        ) : (
            <div className="text-zinc-600 font-mono text-xs">
                NO ACTIVE STRUCTURAL PAYLOAD ... AWAITING MOMENTUM PULSE
            </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-900 grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-zinc-900/60 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">WINS (LOCKED)</span>
                <span className="text-emerald-400 font-bold">{positionMetrics?.wins ?? 0} W</span>
            </div>
            <div className="bg-zinc-900/60 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">LOSSES (CAPPED)</span>
                <span className="text-red-400 font-bold">{positionMetrics?.losses ?? 0} L</span>
            </div>
            <div className="bg-zinc-900/60 p-2 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">WIN-RATE RATIO</span>
                <span className="text-amber-400 font-bold">
                    {positionMetrics?.winRate ? `${positionMetrics.winRate.toFixed(1)}%` : '0.0%'}
                </span>
            </div>
        </div>
      </div>

      {/* --- MOBILE DEBUGGER: RAW JSON DUMP --- */}
      <div className="mt-6 border border-zinc-800 bg-black p-4 overflow-hidden">
        <div className="text-amber-500 font-mono text-[10px] mb-3 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            LIVE PAYLOAD INSPECTOR (DEBUG)
        </div>
        <pre className="text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
          {JSON.stringify({ 
            zScore, 
            sMultiplier, 
            telemetry: {
              volatility: telemetry.volatility,
              liquidityDepth: telemetry.liquidityDepth,
              currentOfi: telemetry.currentOfi
            }
          }, null, 2)}
        </pre>
      </div>

      <footer className="mt-6 pt-4 border-t border-zinc-900 text-[10px] text-zinc-600 text-center tracking-widest">
        SYSTEMS ARCHITECT — AYUB ABDUL HUSSAIN · AYUBHUSSAINOID
      </footer>
    </div>
  );
};

