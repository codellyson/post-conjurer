import { Btn } from "@/components/ui";

export function Unreachable({
  detail,
  retrying,
  onRetry,
}: {
  detail: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <main
      className="flex h-screen flex-col items-center justify-center"
      style={{ background: "var(--paper)", color: "var(--ink)", padding: 64 }}
    >
      <div className="flex flex-col items-start" style={{ maxWidth: 520, gap: 16 }}>
        <div className="serif" style={{ fontSize: 32, letterSpacing: "-.01em" }}>
          Can't reach your library
        </div>
        <div style={{ fontSize: 15, color: "var(--ink-5)", lineHeight: 1.6 }}>
          Your posts, ideas and sources are all still on this machine — the app just can't talk
          to the local service that reads them. Nothing has been lost.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--ink-6)",
            background: "var(--field)",
            border: "1px solid var(--field-border)",
            borderRadius: 5,
            padding: "10px 12px",
            width: "100%",
          }}
        >
          pnpm dev:api
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <Btn variant="primary" disabled={retrying} onClick={onRetry}>
            {retrying ? "Trying…" : "Try again"}
          </Btn>
          {detail ? (
            <span style={{ fontSize: 13, color: "var(--ink-6)" }}>{detail}</span>
          ) : null}
        </div>
      </div>
    </main>
  );
}
