import { useEffect, useState } from "react";

export default function EngineClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();

      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");

      setTime(`${h}:${m}:${s}.${ms}`);
    };

    update();

    const timer = setInterval(update, 10);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#00ffcc",
        letterSpacing: "2px",
        padding: "10px 0",
      }}
    >
      ENGINE CLOCK&nbsp;&nbsp;{time}
    </div>
  );
}
