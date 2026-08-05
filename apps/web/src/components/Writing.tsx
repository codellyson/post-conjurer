import { useEffect, useState } from "react";
import type { Arc } from "@/lib/conjurer";

const EXPECTED_MS = 60_000;

// The wait happens in the shape of the finished thing, so it reads as
// composition rather than a hang.
const GROUPS = [
  { label: "One", widths: ["96%", "88%", "62%"], opacity: 1, live: true },
  { label: "Two", widths: ["92%", "74%"], opacity: 0.55, live: false },
  { label: "Three", widths: ["84%", "55%"], opacity: 0.35, live: false },
];

export function Writing({
  idea,
  styleName,
  ideasLeft,
  onStop,
}: {
  idea: Arc;
  styleName: string;
  ideasLeft: number;
  onStop: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(t);
  }, []);

  // Creeps toward 95% and waits there: claiming 100% before the text arrives
  // is the one thing that would make this read as a hang.
  const pct = Math.min(95, (elapsed / EXPECTED_MS) * 100);
  const left = Math.max(5, Math.round((EXPECTED_MS - elapsed) / 1000));

  return (
    <div className="flex flex-1 flex-col items-center" style={{ padding: "70px 0 0" }}>
      <div className="flex flex-col" style={{ width: 700, gap: 40 }}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <div className="kicker">Writing about</div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1.4, color: "var(--ink-2)" }}>
            {idea.angle ?? idea.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-6)" }}>
            in the shape of{" "}
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{styleName}</span> · three
            versions · about a minute
          </div>
        </div>

        <div className="hair" />

        <div className="flex flex-col" style={{ gap: 30 }}>
          {GROUPS.map((g) => (
            <div key={g.label} className="flex" style={{ gap: 22, opacity: g.opacity }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: g.live ? "var(--c-accent)" : "var(--ink-6)",
                  paddingTop: 4,
                  width: 58,
                }}
              >
                {g.label}
              </div>
              <div className="flex flex-1 flex-col" style={{ gap: 11 }}>
                {g.widths.map((w, i) => (
                  <div
                    key={w + String(i)}
                    style={{
                      height: 13,
                      borderRadius: 3,
                      width: w,
                      background: g.live ? "var(--skeleton)" : "var(--skeleton-quiet)",
                      animation: g.live
                        ? `shimmer 1.8s ease-in-out ${i * 0.2}s infinite`
                        : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center" style={{ gap: 14, paddingTop: 6 }}>
          <div
            style={{
              flex: 1,
              height: 3,
              background: "var(--rail-active)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--c-accent)",
                transition: "width 500ms linear",
              }}
            />
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-5)" }}>about {left} seconds left</div>
          <button
            type="button"
            onClick={onStop}
            style={{ fontSize: 13, color: "var(--ink-6)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-6)")}
          >
            Stop
          </button>
        </div>

        <div style={{ fontSize: 13.5, color: "var(--ink-6)", lineHeight: 1.6 }}>
          You can leave this page — it keeps writing.
          {ideasLeft > 0
            ? ` There are ${ideasLeft} more ideas waiting whenever you want them.`
            : ""}
        </div>
      </div>
    </div>
  );
}
