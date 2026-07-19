import { useEffect, useState } from "react";

export type Clocks = {
  local: Date;
  ny: Date;
  session: "PRE" | "OPEN" | "AFTER" | "CLOSED";
  countdownMs: number; // ms until next session boundary (open if PRE/AFTER/CLOSED, close if OPEN)
  countdownLabel: string; // "OPENS IN" | "CLOSES IN"
};

// U.S. equities regular session: 09:30 – 16:00 ET, Mon–Fri.
// Uses the browser's Intl to derive New York wall-clock parts, so it stays
// accurate through DST without hardcoding an offset.
function nyParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    weekday: parts.weekday as string,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function computeSession(now: Date): { session: Clocks["session"]; countdownMs: number; countdownLabel: string } {
  const p = nyParts(now);
  const isWeekend = p.weekday === "Sat" || p.weekday === "Sun";
  const minutesNow = p.hour * 60 + p.minute;
  const OPEN = 9 * 60 + 30;
  const CLOSE = 16 * 60;

  const msToNyMinute = (targetMin: number) => {
    // seconds/ms into current NY minute
    const intoMinuteMs = p.second * 1000 + (now.getTime() % 1000);
    const deltaMin = targetMin - minutesNow;
    return deltaMin * 60_000 - intoMinuteMs;
  };

  if (isWeekend) {
    // countdown to Monday 09:30 ET — approximate via day-of-week math
    const daysToMonday = p.weekday === "Sat" ? 2 : 1;
    const ms = daysToMonday * 24 * 60 * 60_000 + msToNyMinute(OPEN);
    return { session: "CLOSED", countdownMs: ms, countdownLabel: "OPENS IN" };
  }
  if (minutesNow < OPEN) {
    return { session: "PRE", countdownMs: msToNyMinute(OPEN), countdownLabel: "OPENS IN" };
  }
  if (minutesNow < CLOSE) {
    return { session: "OPEN", countdownMs: msToNyMinute(CLOSE), countdownLabel: "CLOSES IN" };
  }
  // after hours today — next open tomorrow (or Monday if Friday)
  const daysAhead = p.weekday === "Fri" ? 3 : 1;
  const ms = daysAhead * 24 * 60 * 60_000 + msToNyMinute(OPEN);
  return { session: "AFTER", countdownMs: ms, countdownLabel: "OPENS IN" };
}

export function useClocks(): Clocks | null {
  const [clocks, setClocks] = useState<Clocks | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = new Date();
      const nyFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const parts = Object.fromEntries(nyFmt.formatToParts(now).map((p) => [p.type, p.value]));
      const ny = new Date(now);
      ny.setHours(Number(parts.hour === "24" ? 0 : parts.hour));
      ny.setMinutes(Number(parts.minute));
      ny.setSeconds(Number(parts.second));
      ny.setMilliseconds(now.getMilliseconds());
      const s = computeSession(now);
      setClocks({ local: now, ny, ...s });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return clocks;
}

export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatMs3(d: Date) {
  return String(d.getMilliseconds()).padStart(3, "0");
}
