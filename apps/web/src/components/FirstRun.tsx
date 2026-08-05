import { useState } from "react";
import { FolderBrowser } from "@/components/FolderBrowser";
import { Btn } from "@/components/ui";

const PROMISES = [
  {
    n: 1,
    title: "Point it at your code",
    body: "It reads your commit history and pulls out runs of related work. Nothing leaves this machine.",
  },
  {
    n: 2,
    title: "Show it writing you like",
    body: "Paste a post that got real attention. It keeps the shape and never the words.",
  },
  {
    n: 3,
    title: "You get posts, not prompts",
    body: "Each one traces back to something you actually did. Three versions at a time.",
  },
];

export function FirstRun({
  setRoot,
  onScan,
  scanning,
  error,
}: {
  setRoot: (v: string) => void;
  // Takes the path explicitly: the chosen folder has to reach the scan in the
  // same tick, and `root` state won't have updated yet.
  onScan: (path?: string) => void;
  scanning: boolean;
  error: string;
}) {
  const [browsing, setBrowsing] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center" style={{ height: 60, padding: "0 28px", gap: 10 }}>
        <span
          style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--c-accent)" }}
        />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
          Post Conjurer
        </span>
      </div>

      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ padding: "0 80px 80px" }}
      >
        <div
          className="flex flex-col items-center"
          style={{ maxWidth: 760, width: "100%", gap: 44 }}
        >
          <div className="flex flex-col text-center" style={{ gap: 6 }}>
            <div
              className="serif"
              style={{ fontSize: 46, lineHeight: 1.14, letterSpacing: "-.015em" }}
            >
              You shipped a lot this month.
            </div>
            <div
              className="serif"
              style={{
                fontSize: 46,
                lineHeight: 1.14,
                letterSpacing: "-.015em",
                color: "var(--ink-7)",
              }}
            >
              Let's find something to say about it.
            </div>
          </div>

          <div
            className="grid w-full"
            style={{ gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--line)" }}
          >
            {PROMISES.map((p, i) => (
              <div
                key={p.n}
                className="flex flex-col"
                style={{
                  gap: 9,
                  padding: i === 0 ? "26px 30px 26px 0" : i === 2 ? "26px 0 26px 30px" : "26px 30px",
                  borderLeft: i === 0 ? undefined : "1px solid var(--line)",
                  opacity: i === 0 ? 1 : 0.5,
                }}
              >
                <div className="flex items-center" style={{ gap: 9 }}>
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 600,
                      background: i === 0 ? "var(--c-accent)" : "transparent",
                      color: i === 0 ? "#fff" : "var(--ink-4)",
                      border: i === 0 ? undefined : "1px solid var(--field-border-strong)",
                    }}
                  >
                    {p.n}
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.title}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-4)" }}>
                  {p.body}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center" style={{ gap: 14, width: "100%" }}>
            <Btn
              variant="primary"
              large
              disabled={scanning}
              onClick={() => setBrowsing(true)}
            >
              {scanning ? "Reading your history…" : "Choose my projects folder"}
            </Btn>
            <div style={{ fontSize: 13, color: "var(--ink-6)" }}>
              Usually ~/code or ~/Developer · takes about 20 seconds
            </div>
            {error ? (
              <div style={{ fontSize: 13, color: "rgb(var(--danger))" }}>{error}</div>
            ) : null}
          </div>

          <FolderBrowser
            open={browsing}
            onClose={() => setBrowsing(false)}
            onChoose={(path) => {
              setRoot(path);
              setBrowsing(false);
              onScan(path);
            }}
          />
        </div>
      </div>
    </div>
  );
}
