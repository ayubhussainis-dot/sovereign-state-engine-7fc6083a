import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";

interface RihalDashboardProps {
  currentState: SDTState;
  telemetry: TelemetryData;
  zScore: number;
  sMultiplier: number;
}

export const RihalDashboard: React.FC<RihalDashboardProps> = ({
  currentState,
  telemetry,
  zScore,
  sMultiplier,
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
            SOVEREIGN DETERMINISTIC TERMINAL
          </h1>
          <p className="text-xs text-zinc-500">PRECISION RECALIBRATION PROTOCOL GAUGE</p>
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
              {telemetry.currentOfi.toFixed(0)}
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
              {(telemetry.liquidityDepth / (telemetry.volatility || 1)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">COMPRESSION STRUTS (DEPTH)</span>
          <span className="text-sm font-bold text-zinc-200">
            {telemetry.liquidityDepth.toLocaleString()}
          </span>
        </div>
        <div className="bg-zinc-900/40 p-3 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 block">TENSION CABLES (VOLATILITY)</span>
          <span className="text-sm font-bold text-zinc-200">
            {telemetry.volatility.toFixed(4)}
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
            {sMultiplier.toFixed(2)}x
          </span>
        </div>
      </div>

      <footer className="mt-6 pt-4 border-t border-zinc-900 text-[10px] text-zinc-600 text-center tracking-widest">
        DESIGN PRINCIPAL — AYUB ABDUL HUSSAIN
      </footer>
    </div>
  );
};