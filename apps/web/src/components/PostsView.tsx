import { useState } from "react";
import { Btn } from "@/components/ui";
import type { FeedDraft } from "@/lib/conjurer";

export interface PostGroup {
  key: string;
  versions: FeedDraft[];
  lead: FeedDraft;
  posted: boolean;
}

// One generation — an idea written in one style — is one post with three
// versions inside it, not three posts.
export function groupDrafts(drafts: FeedDraft[]): PostGroup[] {
  const byKey = new Map<string, FeedDraft[]>();
  for (const d of drafts) {
    if (d.status === "discarded") continue;
    const key = `${d.arc_id}:${d.pattern_id}`;
    const list = byKey.get(key);
    if (list) list.push(d);
    else byKey.set(key, [d]);
  }
  return [...byKey.entries()]
    .map(([key, versions]) => {
      versions.sort((a, b) => a.id - b.id);
      return {
        key,
        versions,
        lead: versions[0],
        posted: versions.some((v) => v.status === "used"),
      };
    })
    .sort((a, b) => b.lead.created_at - a.lead.created_at);
}

function ago(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} hours ago`;
  if (s < 172_800) return "yesterday";
  if (s < 604_800) return `${Math.floor(s / 86_400)} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function excerpt(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}

function PostRow({
  group,
  last,
  onOpen,
  onCopy,
}: {
  group: PostGroup;
  last: boolean;
  onOpen: () => void;
  onCopy: () => void;
}) {
  const { lead, posted } = group;
  const words = lead.text.trim().split(/\s+/).length;

  return (
    <div
      className="list-row flex items-start"
      style={{
        gap: 22,
        padding: "26px 0",
        borderBottom: last ? undefined : "1px solid var(--line-softer)",
        opacity: posted ? 0.68 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = posted ? "0.68" : "1")}
    >
      {/* A single warm dot means it still wants something from you. */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          marginTop: 11,
          flex: "0 0 8px",
          background: posted ? "transparent" : "var(--c-accent)",
          border: posted ? "1px solid var(--field-border-strong)" : undefined,
        }}
      />

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left"
        style={{ gap: 7 }}
      >
        <span
          className="serif"
          style={{ fontSize: 20, lineHeight: 1.5, textWrap: "pretty", color: "var(--ink)" }}
        >
          {excerpt(lead.text)}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-6)" }}>
          {posted ? "posted" : "written"} {ago(lead.created_at)} · {words} words ·{" "}
          {lead.pattern_name} · {lead.product}
        </span>
      </button>

      {!posted ? (
        <div className="row-actions" style={{ paddingTop: 6 }}>
          <Btn
            variant="quiet"
            onClick={onCopy}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--link)" }}
          >
            Copy & open

          </Btn>
        </div>
      ) : null}
    </div>
  );
}

export function PostsView({
  groups,
  onOpen,
  onCopy,
  onGoToIdeas,
  ideaCount,
}: {
  groups: PostGroup[];
  onOpen: (g: PostGroup) => void;
  onCopy: (g: PostGroup) => void;
  onGoToIdeas: () => void;
  ideaCount: number;
}) {
  const [filter, setFilter] = useState<"all" | "waiting">("all");
  const posted = groups.filter((g) => g.posted).length;
  const waiting = groups.length - posted;
  const shown = filter === "all" ? groups : groups.filter((g) => !g.posted);

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 64 }}>
        <div className="flex flex-col items-center" style={{ maxWidth: 460, gap: 16 }}>
          <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
            Nothing written yet.
          </div>
          <div
            style={{ fontSize: 14, color: "var(--ink-5)", textAlign: "center", lineHeight: 1.6 }}
          >
            {ideaCount > 0
              ? `${ideaCount} ideas are waiting. Pick one and it writes three versions.`
              : "Rescan your projects to find something worth telling."}
          </div>
          <Btn variant="primary" onClick={onGoToIdeas}>
            {ideaCount > 0 ? `See ${ideaCount} ideas` : "Go to ideas"}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-end justify-between"
        style={{ padding: "40px 64px 24px", borderBottom: "1px solid var(--line-soft)" }}
      >
        <div className="flex flex-col" style={{ gap: 7 }}>
          <div className="serif" style={{ fontSize: 34, letterSpacing: "-.01em" }}>
            {groups.length} post{groups.length === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
            {posted} posted · {waiting} waiting on you
          </div>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              fontSize: 13.5,
              padding: "7px 13px",
              borderRadius: 5,
              border: filter === "all" ? "1px solid var(--field-border-strong)" : "1px solid transparent",
              color: filter === "all" ? "var(--ink)" : "var(--ink-5)",
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("waiting")}
            style={{
              fontSize: 13.5,
              padding: "7px 13px",
              borderRadius: 5,
              border:
                filter === "waiting" ? "1px solid var(--field-border-strong)" : "1px solid transparent",
              color: filter === "waiting" ? "var(--ink)" : "var(--ink-5)",
            }}
          >
            Not posted
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ padding: "0 64px 40px" }}>
        {shown.map((g, i) => (
          <PostRow
            key={g.key}
            group={g}
            last={i === shown.length - 1}
            onOpen={() => onOpen(g)}
            onCopy={() => onCopy(g)}
          />
        ))}
      </div>
    </div>
  );
}
