import { useState } from "react";
import { Area, Btn } from "@/components/ui";
import type { Pattern, PatternStructure } from "@/lib/conjurer";
import { useHarvestPattern } from "@/lib/queries";

const READOUT: { label: string; key: keyof PatternStructure }[] = [
  { label: "Opens with", key: "hook" },
  { label: "Shape", key: "shape" },
  { label: "Middle", key: "tension" },
  { label: "Ends on", key: "close" },
  { label: "Register", key: "voice" },
];

function Readout({ structure }: { structure: PatternStructure | null }) {
  return (
    <div
      className="flex flex-col"
      style={{
        borderLeft: "1px solid var(--line-soft)",
        background: "var(--field)",
        padding: "34px 44px",
        gap: 22,
        width: 400,
        flex: "0 0 400px",
        overflowY: "auto",
      }}
    >
      <div className="kicker">What it took</div>

      {structure ? (
        <>
          <div className="flex flex-col" style={{ gap: 18 }}>
            {READOUT.map((r) => (
              <div key={r.key} className="flex flex-col" style={{ gap: 4 }}>
                <div style={{ fontSize: 13, color: "var(--ink-6)" }}>{r.label}</div>
                <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.5 }}>
                  {String(structure[r.key])}
                </div>
              </div>
            ))}
          </div>
          <div className="hair" />
          <div className="flex flex-col" style={{ gap: 7 }}>
            <div style={{ fontSize: 13, color: "var(--ink-6)" }}>Call it</div>
            <div
              style={{
                fontSize: 15,
                color: "var(--ink)",
                borderBottom: "1px solid var(--field-border-strong)",
                paddingBottom: 7,
              }}
            >
              {structure.name}
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: "var(--ink-6)", lineHeight: 1.65 }}>
          When you save it, this is where the structure appears — how it opens, how long the
          paragraphs run, what the middle carries, how it ends. That structure is all that gets
          kept. The words never leave this panel.
        </div>
      )}
    </div>
  );
}

function StyleRow({ pattern, last }: { pattern: Pattern; last: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        padding: "20px 0",
        borderBottom: last ? undefined : "1px solid var(--line-softer)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline text-left"
        style={{ gap: 12 }}
      >
        <span className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
          {pattern.name}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-6)" }}>
          ~{pattern.structure.length_words} words
          {pattern.platform ? ` · ${pattern.platform}` : ""}
          {pattern.engagement ? ` · ${pattern.engagement}` : ""}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-6)" }}>
          {open ? "hide" : "what it took"}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col" style={{ gap: 14, paddingTop: 16, maxWidth: 620 }}>
          {READOUT.map((r) => (
            <div key={r.key} className="flex flex-col" style={{ gap: 3 }}>
              <div style={{ fontSize: 13, color: "var(--ink-6)" }}>{r.label}</div>
              <div style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.5 }}>
                {String(pattern.structure[r.key])}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StylesView({ patterns }: { patterns: Pattern[] }) {
  const harvest = useHarvestPattern();
  const [capturing, setCapturing] = useState(patterns.length === 0);
  const [text, setText] = useState("");
  const [structure, setStructure] = useState<PatternStructure | null>(null);
  const busy = harvest.isPending;
  const error = harvest.error ? String((harvest.error as Error).message) : "";

  function save() {
    harvest.mutate(text, {
      onSuccess: (r) => {
        setStructure(r.structure);
        setText("");
      },
    });
  }

  if (!capturing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex items-end justify-between"
          style={{ padding: "40px 64px 24px", borderBottom: "1px solid var(--line-soft)" }}
        >
          <div className="flex flex-col" style={{ gap: 7 }}>
            <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
              {patterns.length} style{patterns.length === 1 ? "" : "s"}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
              Shapes borrowed from posts that earned attention
            </div>
          </div>
          <Btn variant="primary" onClick={() => setCapturing(true)}>
            Add a style
          </Btn>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: "0 64px 40px" }}>
          {patterns.map((p, i) => (
            <StyleRow key={p.id} pattern={p} last={i === patterns.length - 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-end justify-between"
        style={{ padding: "26px 56px 22px", borderBottom: "1px solid var(--line-soft)" }}
      >
        <div className="flex flex-col" style={{ gap: 6 }}>
          <div className="serif" style={{ fontSize: 28 }}>
            Show it writing you like
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
            Yours or anyone's. It keeps the structure and never the words.
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          {patterns.length > 0 || structure ? (
            <Btn
              variant="ghost"
              onClick={() => {
                setCapturing(false);
                setStructure(null);
              }}
            >
              {structure ? "Done" : "Cancel"}
            </Btn>
          ) : null}
          <Btn
            variant="primary"
            disabled={busy || text.trim().length < 40}
            onClick={save}
          >
            {busy ? "Reading the shape…" : "Save this style"}
          </Btn>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ padding: "34px 44px 34px 56px", gap: 14 }}
        >
          <div className="kicker">The post you admired</div>
          <Area
            autoFocus
            value={text}
            placeholder="Paste the whole post here…"
            onChange={(e) => setText(e.target.value)}
            className="serif"
            style={{
              flex: 1,
              borderRadius: 6,
              padding: "26px 30px",
              fontFamily: "var(--font-prose)",
              fontSize: 16.5,
              lineHeight: 1.65,
              color: "var(--ink-3)",
              resize: "none",
            }}
          />
          {error ? (
            <div style={{ fontSize: 13, color: "rgb(var(--danger))" }}>{error}</div>
          ) : null}
        </div>

        <Readout structure={structure} />
      </div>
    </div>
  );
}
