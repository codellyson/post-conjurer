import { Btn } from "@/components/ui";
import type { Arc, Product } from "@/lib/conjurer";

const DAY = 24 * 60 * 60 * 1000;

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// A span that crosses a year boundary reads as reversed without the year —
// "between Aug 2 and Jul 24" looks like a bug even when it isn't.
function rangeLabel(from: number, to: number): string {
  const sameYear = new Date(from).getFullYear() === new Date(to).getFullYear();
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? null : { year: "numeric" }),
    });
  return `${fmt(from)} and ${fmt(to)}`;
}

function spanLabel(idea: Arc): string {
  const n = idea.commits.length;
  const days = Math.max(1, Math.round((idea.to_at - idea.from_at) / DAY));
  const over = days === 1 ? "in one day" : `over ${days} days`;
  return `${idea.product} · ${n} commit${n === 1 ? "" : "s"} ${over} · ends ${shortDate(idea.to_at)}`;
}

function IdeaRow({
  idea,
  last,
  canWrite,
  onWrite,
  onDiscard,
}: {
  idea: Arc;
  last: boolean;
  canWrite: boolean;
  onWrite: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className="list-row flex items-start"
      style={{
        gap: 26,
        padding: "24px 0",
        borderBottom: last ? undefined : "1px solid var(--line-softer)",
      }}
    >
      <div className="flex flex-1 flex-col" style={{ gap: 8 }}>
        <div
          className="serif"
          style={{ fontSize: 21, lineHeight: 1.42, textWrap: "pretty", color: "var(--ink)" }}
        >
          {idea.angle ?? idea.title}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-6)" }}>{spanLabel(idea)}</div>
      </div>

      <div className="row-actions flex" style={{ gap: 7, paddingTop: 4 }}>
        <Btn
          variant="primary"
          disabled={!canWrite}
          onClick={onWrite}
          style={{ fontSize: 13, padding: "7px 14px" }}
        >
          Write it
        </Btn>
        <Btn variant="quiet" onClick={onDiscard} style={{ fontSize: 13 }}>
          Discard
        </Btn>
      </div>
    </div>
  );
}

const BATCH = 12;

// What the queue actually contains, so the page carries information instead of
// a count. The per-project split is the thing you can act on: it tells you
// where the unread work is before you spend anything reading it.
function Unread({
  products,
  candidates,
  busy,
  hasStyles,
  onFindMore,
  onGoToStyles,
  onGoToSources,
}: {
  products: Product[];
  candidates: number;
  busy: boolean;
  hasStyles: boolean;
  onFindMore: () => void;
  onGoToStyles: () => void;
  onGoToSources: () => void;
}) {
  const queued = products
    .filter((p) => p.candidate_count > 0)
    .sort((a, b) => b.candidate_count - a.candidate_count);
  const top = queued.slice(0, 9);
  const others = queued.length - top.length;
  const nothing = candidates === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: "56px 64px" }}>
      <div className="flex flex-col" style={{ maxWidth: 620, gap: 14 }}>
        <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
          {nothing ? "Nothing to read" : `${candidates} changes, unread`}
        </div>
        <div style={{ fontSize: 15, color: "var(--ink-5)", lineHeight: 1.6 }}>
          {nothing
            ? "Every change in your repos has been looked at. Rescan to pick up new work."
            : `Reading a batch sorts real decisions from routine commits and turns the keepers into ideas you can post about. It takes about half a minute for ${BATCH} and costs well under a cent.`}
        </div>
        {!nothing ? (
          <div className="flex items-center" style={{ gap: 12, paddingTop: 4 }}>
            <Btn variant="primary" disabled={busy} onClick={onFindMore}>
              {busy ? "Reading…" : `Read the next ${Math.min(BATCH, candidates)}`}
            </Btn>
            <span style={{ fontSize: 13, color: "var(--ink-6)" }}>
              {candidates > BATCH ? `${candidates - BATCH} would remain` : "clears the queue"}
            </span>
          </div>
        ) : null}
        {!hasStyles ? (
          <div style={{ fontSize: 13.5, color: "var(--ink-5)", paddingTop: 2 }}>
            You'll also need a style before anything can be written —{" "}
            <button
              type="button"
              onClick={onGoToStyles}
              style={{ color: "var(--link)", fontWeight: 600 }}
            >
              show it writing you like
            </button>
            .
          </div>
        ) : null}
      </div>

      {top.length ? (
        <div className="flex flex-col" style={{ maxWidth: 620, paddingTop: 44, gap: 2 }}>
          <div className="kicker" style={{ paddingBottom: 10 }}>
            Where the unread work is
          </div>
          {top.map((p) => (
            <div
              key={p.id}
              className="flex items-baseline justify-between"
              style={{
                gap: 20,
                padding: "11px 0",
                borderBottom: "1px solid var(--line-softer)",
              }}
            >
              <span style={{ fontSize: 14.5, color: "var(--ink-2)" }}>{p.name}</span>
              <span className="flex items-baseline" style={{ gap: 14 }}>
                {p.keep_count > 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--ink-6)" }}>
                    {p.keep_count} kept
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--ink-5)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.candidate_count} unread
                </span>
              </span>
            </div>
          ))}
          <div
            className="flex items-baseline"
            style={{ gap: 10, fontSize: 13, color: "var(--ink-6)", paddingTop: 12 }}
          >
            {others > 0 ? <span>and {others} more ·</span> : null}
            <button
              type="button"
              onClick={onGoToSources}
              style={{ color: "var(--link)" }}
            >
              Manage sources
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function IdeasView({
  ideas,
  candidates,
  products,
  hasStyles,
  busy,
  onWrite,
  onDiscard,
  onFindMore,
  onGoToStyles,
  onGoToSources,
}: {
  ideas: Arc[];
  candidates: number;
  products: Product[];
  hasStyles: boolean;
  busy: boolean;
  onWrite: (idea: Arc) => void;
  onDiscard: (idea: Arc) => void;
  onFindMore: () => void;
  onGoToStyles: () => void;
  onGoToSources: () => void;
}) {
  const shown = ideas.slice(0, 12);
  const rest = ideas.length - shown.length;

  const from = ideas.length ? Math.min(...ideas.map((i) => i.from_at)) : 0;
  const to = ideas.length ? Math.max(...ideas.map((i) => i.to_at)) : 0;

  // Before the first triage there are no ideas but plenty of raw material.
  // Showing what's in the queue, per project, beats an empty page telling you
  // a number you can't act on.
  if (ideas.length === 0) {
    return (
      <Unread
        products={products}
        candidates={candidates}
        busy={busy}
        hasStyles={hasStyles}
        onFindMore={onFindMore}
        onGoToStyles={onGoToStyles}
        onGoToSources={onGoToSources}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-end justify-between"
        style={{ padding: "40px 64px 26px", borderBottom: "1px solid var(--line-soft)" }}
      >
        <div className="flex flex-col" style={{ gap: 7 }}>
          <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
            {ideas.length
              ? `${ideas.length} thing${ideas.length === 1 ? "" : "s"} worth telling`
              : "Nothing waiting"}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
            {ideas.length
              ? `Pulled from work you did between ${rangeLabel(from, to)}`
              : candidates > 0
                ? `${candidates} changes from your repos haven't been read yet`
                : "Rescan to pull in recent work"}
          </div>
        </div>
        {candidates > 0 ? (
          <Btn disabled={busy} onClick={onFindMore} style={{ fontSize: 13.5, padding: "7px 13px" }}>
            {busy ? "Reading…" : "Find more"}
          </Btn>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: "6px 64px 0" }}>
        {!hasStyles && ideas.length ? (
          <div style={{ fontSize: 13.5, color: "var(--ink-5)", padding: "18px 0 0" }}>
            Nothing can be written yet —{" "}
            <button
              type="button"
              onClick={onGoToStyles}
              style={{ color: "var(--link)", fontWeight: 600 }}
            >
              show it writing you like
            </button>{" "}
            first.
          </div>
        ) : null}

        {shown.map((idea, i) => (
          <IdeaRow
            key={idea.id}
            idea={idea}
            last={i === shown.length - 1}
            canWrite={hasStyles}
            onWrite={() => onWrite(idea)}
            onDiscard={() => onDiscard(idea)}
          />
        ))}

        {ideas.length ? (
          <div style={{ padding: "22px 0 40px", fontSize: 13.5, color: "var(--ink-6)" }}>
            {rest > 0 ? `${rest} more below · ` : ""}nothing expires
          </div>
        ) : null}
      </div>
    </div>
  );
}
