import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import type { SDTState, TelemetryData } from "@/lib/SDTStateEngine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sovereign Deterministic Terminal" },
      {
        name: "description",
        content:
          "SDT — deterministic G0→G1→S→M state engine with p53 checkpoint governance and Rihal interlocking telemetry.",
      },
      { name: "author", content: "Ayub Abdul Hussain" },
      { property: "og:title", content: "Sovereign Deterministic Terminal" },
      {
        property: "og:description",
        content:
          "Deterministic cell-cycle state engine with p53 checkpoint governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [state, setState] = useState<SDTState>("G0_HOMEOSTASIS");
  const [standby, setStandby] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    currentPrice: 100,
    currentOfi: 0,
    liquidityDepth: 5000,
    volatility: 0.02,
  });
  const [zScore, setZScore] = useState(0);
  const [sMultiplier, setSMultiplier] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/sdt.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.postMessage({
      type: "INIT",
      risk: {
        equityHighWaterMark: 100000,
        currentEquity: 100000,
        baseLeverage: 2,
        zScoreThreshold: 2.5,
      },
    });

    worker.addEventListener("message", (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === "TRANSITION") {
        setState(msg.to);
      } else if (msg.type === "STATE") {
        setState(msg.state);
        setTelemetry(msg.telemetry);
        setZScore(msg.zScore);
        setSMultiplier(msg.sMultiplier);
      }
    });

    let id = 0;
    if (!standby) {
      let price = 100;
      // 400 Hz AFC telemetry ingestion (2.5ms cadence)
      id = window.setInterval(() => {
        const shock = Math.random() < 0.02 ? (Math.random() - 0.5) * 4 : 0;
        price = price + (Math.random() - 0.5) * 0.2 + shock;
        const t: TelemetryData = {
          currentPrice: price,
          currentOfi: (Math.random() - 0.5) * 2000,
          liquidityDepth: 4000 + Math.random() * 3000,
          volatility: 0.01 + Math.random() * 0.05,
        };
        worker.postMessage({ type: "TELEMETRY", telemetry: t });
      }, 2.5);
    }

    return () => {
      if (id) window.clearInterval(id);
      worker.terminate();
    };
  }, [standby]);

  const isDev = import.meta.env.DEV;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
      <RihalDashboard
        currentState={state}
        telemetry={telemetry}
        zScore={zScore}
        sMultiplier={sMultiplier}
      />
      <div className="w-full max-w-4xl flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
        <button
          type="button"
          onClick={() => setStandby((s) => !s)}
          className={`px-3 py-2 border transition-colors ${
            standby
              ? "border-amber-900 text-amber-400 hover:bg-amber-950/40"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          }`}
        >
          {standby ? "ENGAGE SIMULATED FEED" : "RETURN TO STANDBY"}
        </button>
        {isDev && (
          <>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "SHOCK" })}
              className="px-3 py-2 border border-emerald-900 text-emerald-400 hover:bg-emerald-950/40 transition-colors"
            >
              INJECT SHOCK [Z &gt; 2.5]
            </button>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "DRAWDOWN" })}
              className="px-3 py-2 border border-red-900 text-red-400 hover:bg-red-950/40 transition-colors"
            >
              FORCE DRAWDOWN [p53 ARREST]
            </button>
            <button
              type="button"
              onClick={() => workerRef.current?.postMessage({ type: "RESET" })}
              className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors"
            >
              RESET → G0
            </button>
          </>
        )}
      </div>
      {standby && (
        <div className="font-mono text-[10px] tracking-widest text-amber-500/80">
          SYSTEM STANDBY — AWAITING SECURE DATA FEED
        </div>
      )}
    </main>
  );
}
