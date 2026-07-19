import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RihalDashboard } from "@/components/RihalDashboard";
import {
  SDTStateEngine,
  type SDTState,
  type TelemetryData,
} from "@/lib/SDTStateEngine";

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
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    currentPrice: 100,
    currentOfi: 0,
    liquidityDepth: 5000,
    volatility: 0.02,
  });
  const [zScore, setZScore] = useState(0);
  const [sMultiplier, setSMultiplier] = useState(0);
  const engineRef = useRef<SDTStateEngine | null>(null);

  useEffect(() => {
    const engine = new SDTStateEngine(
      {
        equityHighWaterMark: 100000,
        currentEquity: 99500,
        baseLeverage: 2,
        zScoreThreshold: 2.5,
      },
      (_old, next) => setState(next),
    );
    engineRef.current = engine;

    let price = 100;
    const id = window.setInterval(() => {
      const shock = Math.random() < 0.02 ? (Math.random() - 0.5) * 4 : 0;
      price = price + (Math.random() - 0.5) * 0.2 + shock;
      const t: TelemetryData = {
        currentPrice: price,
        currentOfi: (Math.random() - 0.5) * 2000,
        liquidityDepth: 4000 + Math.random() * 3000,
        volatility: 0.01 + Math.random() * 0.05,
      };
      engine.step(t);
      setTelemetry(t);
      setZScore(engine.getLastZScore());
      setSMultiplier(engine.getLastMultiplier());
    }, 50);

    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <RihalDashboard
        currentState={state}
        telemetry={telemetry}
        zScore={zScore}
        sMultiplier={sMultiplier}
      />
    </main>
  );
}
