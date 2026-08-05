import { useState } from "react";
import { Area, Btn } from "@/components/ui";
import type { Product } from "@/lib/conjurer";
import { saveDossier, setSourceExcluded } from "@/lib/conjurer";

function ago(ms: number | null): string {
  if (!ms) return "never read";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 3600) return "read just now";
  if (s < 86_400) return `read ${Math.floor(s / 3600)}h ago`;
  return `read ${Math.floor(s / 86_400)}d ago`;
}

function Dossier({ source, onSaved }: { source: Product; onSaved: () => void }) {
  const [what, setWhat] = useState(source.what_it_does ?? "");
  const [who, setWho] = useState(source.audience ?? "");
  const [moments, setMoments] = useState(source.moments ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setState("saving");
    await saveDossier(source.id, { what_it_does: what, audience: who, moments });
    setState("saved");
    onSaved();
  }

  return (
    <div className="flex flex-col" style={{ gap: 14, padding: "18px 0 24px", maxWidth: 620 }}>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div style={{ fontSize: 13, color: "var(--ink-6)" }}>What it does</div>
        <Area
          rows={2}
          value={what}
          placeholder="One or two plain sentences, as you'd say it to a friend."
          onChange={(e) => setWhat(e.target.value)}
        />
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div style={{ fontSize: 13, color: "var(--ink-6)" }}>Who it's for</div>
        <Area
          rows={2}
          value={who}
          placeholder="Who has this problem, and where are they."
          onChange={(e) => setWho(e.target.value)}
        />
      </div>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div style={{ fontSize: 13, color: "var(--ink-6)" }}>Moments</div>
        {/* The one field a repo can never supply, and the only thing standing
            between a post and an invented anecdote. */}
        <div style={{ fontSize: 12.5, color: "var(--ink-6)", lineHeight: 1.5 }}>
          First paying user, something someone said, a number you're proud of. One per line.
          Without this the writer has no concrete detail to reach for.
        </div>
        <Area
          rows={4}
          value={moments}
          onChange={(e) => setMoments(e.target.value)}
        />
      </div>
      <div className="flex items-center" style={{ gap: 12 }}>
        <Btn variant="primary" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </Btn>
        {state === "saved" ? (
          <span style={{ fontSize: 13, color: "var(--ink-6)" }}>Saved</span>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  source,
  open,
  onToggle,
  onChanged,
  onRescan,
  busy,
}: {
  source: Product;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onRescan: () => void;
  busy: boolean;
}) {
  const off = source.excluded === 1;
  const hasMoments = !!source.moments?.trim();

  return (
    <div
      className="list-row"
      style={{ borderBottom: "1px solid var(--line-softer)", opacity: off ? 0.5 : 1 }}
    >
      <div className="flex items-center" style={{ gap: 20, padding: "14px 0" }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex flex-1 items-baseline text-left"
          style={{ gap: 14, minWidth: 0 }}
        >
          <span style={{ fontSize: 15, color: "var(--ink-2)" }}>{source.name}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-7)" }}>{source.kind}</span>
        </button>

        <span
          className="flex items-baseline"
          style={{ gap: 16, fontSize: 12.5, color: "var(--ink-6)" }}
        >
          {off ? (
            <span>not scanned</span>
          ) : (
            <>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {source.candidate_count} unread
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {source.keep_count} kept
              </span>
              <span>{ago(source.last_scan_at)}</span>
            </>
          )}
          <span style={{ color: hasMoments ? "var(--c-accent)" : "var(--ink-7)", width: 84 }}>
            {hasMoments ? "has moments" : "no moments"}
          </span>
        </span>

        <span className="row-actions flex items-center" style={{ gap: 6 }}>
          {!off ? (
            <Btn variant="quiet" disabled={busy} onClick={onRescan} style={{ fontSize: 12.5 }}>
              Rescan
            </Btn>
          ) : null}
          <Btn
            variant="quiet"
            style={{ fontSize: 12.5 }}
            onClick={() => setSourceExcluded(source.id, !off).then(onChanged)}
          >
            {off ? "Include" : "Ignore"}
          </Btn>
        </span>
      </div>

      {open ? <Dossier source={source} onSaved={onChanged} /> : null}
    </div>
  );
}

export function SourcesView({
  sources,
  busy,
  onChanged,
  onRescanOne,
}: {
  sources: Product[];
  busy: boolean;
  onChanged: () => void;
  onRescanOne: (source: Product) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const active = sources.filter((s) => s.excluded !== 1);
  const described = active.filter((s) => s.moments?.trim()).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-end justify-between"
        style={{ padding: "40px 64px 24px", borderBottom: "1px solid var(--line-soft)" }}
      >
        <div className="flex flex-col" style={{ gap: 7 }}>
          <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
            {active.length} source{active.length === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
            {described === 0
              ? "None describe themselves yet — posts from these stay abstract"
              : `${described} of ${active.length} can supply a real anecdote`}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: "0 64px 48px" }}>
        {sources.map((s) => (
          <Row
            key={s.id}
            source={s}
            open={open === s.id}
            onToggle={() => setOpen(open === s.id ? null : s.id)}
            onChanged={onChanged}
            onRescan={() => onRescanOne(s)}
            busy={busy}
          />
        ))}
      </div>
    </div>
  );
}
