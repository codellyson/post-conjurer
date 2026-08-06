import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CaretDown } from "@/components/icons";
import { Btn, Seg } from "@/components/ui";
import { openExternal } from "@/lib/open-external";
import type { FeedDraft } from "@/lib/conjurer";

const PLATFORMS = [
  { id: "x", label: "X", composer: (t: string) => `https://x.com/intent/post?text=${t}` },
  {
    id: "linkedin",
    label: "LinkedIn",
    // LinkedIn does not accept prefilled text; the clipboard carries the post.
    composer: () => "https://www.linkedin.com/feed/?shareActive=true",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    composer: (t: string) => `https://bsky.app/intent/compose?text=${t}`,
  },
  {
    id: "mastodon",
    label: "Mastodon",
    composer: (t: string) => `https://mastodon.social/share?text=${t}`,
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];
const PLATFORM_KEY = "post-conjurer.platform";

const NAMES = ["One", "Two", "Three", "Four", "Five"];

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Six bars standing for the run of commits — the tallest is the one that
// carried the decision. Heights come from the real subjects so the figure is
// data rather than decoration.
function Sparkline({ commits }: { commits: FeedDraft["commits"] }) {
  const last = commits.slice(-6);
  const peak = last.reduce((best, c, i) => (c.subject.length > last[best].subject.length ? i : best), 0);
  return (
    <span className="flex items-end" style={{ gap: 3 }}>
      {last.map((c, i) => (
        <span
          key={c.hash}
          style={{
            width: 3,
            height: 6 + ((c.subject.length * 7) % 9),
            background: i === peak ? "var(--c-accent)" : "var(--field-border-strong)",
            opacity: i === peak ? 1 : 0.7,
          }}
        />
      ))}
    </span>
  );
}

export function PostView({
  versions,
  rewriting,
  onBack,
  onRewrite,
  onMarkPosted,
  onUnmark,
}: {
  versions: FeedDraft[];
  rewriting: boolean;
  onBack: () => void;
  onRewrite: () => void;
  onMarkPosted: (draft: FeedDraft) => void;
  onUnmark: (draft: FeedDraft) => void;
}) {
  const [index, setIndex] = useState(0);
  const [showWork, setShowWork] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stranded, setStranded] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("x");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PLATFORM_KEY);
    if (PLATFORMS.some((p) => p.id === stored)) setPlatform(stored as PlatformId);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const draft = versions[index] ?? versions[0];
  if (!draft) return null;

  const words = draft.text.trim().split(/\s+/).length;
  const active = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];
  const dates = draft.commits.map((c) => c.at);
  const first = dates.length ? shortDate(Math.min(...dates)) : "";
  const lastDay = dates.length ? shortDate(Math.max(...dates)) : "";
  const span = !dates.length ? "" : first === lastDay ? first : `${first} – ${lastDay}`;

  async function copyAndOpen(p: (typeof PLATFORMS)[number]) {
    await navigator.clipboard.writeText(draft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    localStorage.setItem(PLATFORM_KEY, p.id);
    setPlatform(p.id);
    setMenu(false);
    setStranded("");

    // The post is already on the clipboard either way, so a composer that
    // refuses to open is a message, not a failure.
    const url = p.composer(encodeURIComponent(draft.text));
    if (!(await openExternal(url))) setStranded(p.label);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex items-center justify-between"
        style={{ padding: "18px 56px", borderBottom: "1px solid var(--line-soft)" }}
      >
        <div className="flex items-center" style={{ gap: 18 }}>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center"
            style={{ fontSize: 13.5, color: "var(--ink-6)", gap: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-6)")}
          >
            <ArrowLeft size={13} />
            Posts
          </button>
          {versions.length > 1 ? (
            <Seg
              value={String(index)}
              onChange={(v) => setIndex(Number(v))}
              options={versions.map((_, i) => ({ id: String(i), label: NAMES[i] ?? `#${i + 1}` }))}
            />
          ) : null}
          <span style={{ fontSize: 13, color: "var(--ink-7)" }}>{words} words</span>
          {stranded ? (
            <span style={{ fontSize: 13, color: "var(--c-accent)" }}>
              Copied — paste it into {stranded}
            </span>
          ) : null}
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          <Btn variant="ghost" disabled={rewriting} onClick={onRewrite}>
            {rewriting ? "Rewriting…" : "Rewrite"}
          </Btn>
          {draft.status === "used" ? (
            <Btn onClick={() => onUnmark(draft)}>Posted</Btn>
          ) : (
            <Btn onClick={() => onMarkPosted(draft)}>Mark posted</Btn>
          )}

          <div style={{ position: "relative" }} ref={menuRef}>
            <div className="flex items-stretch" style={{ borderRadius: 5, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => copyAndOpen(active)}
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#fff",
                  background: "var(--c-accent)",
                  padding: "9px 18px",
                }}
              >
                {copied ? "Copied" : `Copy & open ${active.label}`}
              </button>
              <span style={{ width: 1, background: "rgba(255,255,255,.28)" }} />
              <button
                type="button"
                aria-label="Choose where to open"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className="flex items-center"
                style={{
                  color: "#fff",
                  background: "var(--c-accent)",
                  padding: "9px 11px",
                }}
              >
                <CaretDown size={13} />
              </button>
            </div>

            {menu ? (
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  width: 250,
                  background: "var(--paper)",
                  border: "1px solid var(--field-border)",
                  borderRadius: 6,
                  boxShadow: "0 12px 30px rgba(60,48,34,.14)",
                  padding: 6,
                  zIndex: 5,
                }}
              >
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => copyAndOpen(p)}
                    className="flex w-full items-center justify-between text-left"
                    style={{
                      fontSize: 14,
                      padding: "9px 12px",
                      borderRadius: 4,
                      color: p.id === platform ? "var(--ink)" : "var(--ink-3)",
                      background: p.id === platform ? "var(--field)" : "transparent",
                    }}
                  >
                    <span>{p.label}</span>
                    {p.id === platform ? (
                      <span style={{ color: "var(--ink-6)", fontSize: 12.5 }}>default</span>
                    ) : null}
                  </button>
                ))}
                <div
                  style={{ height: 1, background: "var(--line-soft)", margin: "5px 8px" }}
                />
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-6)",
                    padding: "6px 12px 8px",
                    lineHeight: 1.5,
                  }}
                >
                  Copies the post and opens the composer. Nothing is posted for you.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Fixed 640px column, top-aligned at a constant 66px — never vertically
          centred, or a short post floats and a long one jumps. */}
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto" style={{ padding: "66px 0 0" }}>
        <div className="flex flex-col" style={{ width: 640, gap: 26 }}>
          <div className="post-prose">
            {draft.text
              .split(/\n\s*\n/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <p key={i}>{para}</p>
              ))}
          </div>

          <div className="hair" style={{ marginTop: 12 }} />

          <div
            className="flex items-center"
            style={{ gap: 10, fontSize: 13, color: "var(--ink-6)", flexWrap: "wrap" }}
          >
            {draft.commits.length ? <Sparkline commits={draft.commits} /> : null}
            <span>
              {draft.commits.length
                ? `From ${draft.commits.length} commits in `
                : "From work in "}
              <span style={{ color: "var(--ink-3)" }}>{draft.product}</span>
              {span ? `, ${span}` : ""} · shape of{" "}
              <span style={{ color: "var(--ink-3)" }}>{draft.pattern_name}</span>
            </span>
            {draft.commits.length ? (
              <button
                type="button"
                onClick={() => setShowWork((s) => !s)}
                style={{ color: "var(--link)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--link-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--link)")}
              >
                {showWork ? "hide" : "show the work"}
              </button>
            ) : null}
          </div>

          {/* The only place raw commits are allowed — below the post, never
              beside it, so it can't compete. */}
          {showWork ? (
            <div className="flex flex-col" style={{ gap: 24, paddingBottom: 60 }}>
              <div
                className="flex flex-col"
                style={{ borderLeft: "2px solid var(--line)", paddingLeft: 22 }}
              >
                {[...draft.commits]
                  .sort((a, b) => b.at - a.at)
                  .map((c) => (
                    <div key={c.hash} className="flex" style={{ gap: 16, padding: "11px 0" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--ink-7)",
                          width: 54,
                          flex: "0 0 54px",
                        }}
                      >
                        {shortDate(c.at)}
                      </span>
                      <span style={{ fontSize: 14.5, color: "var(--ink-2)", flex: 1 }}>
                        {c.subject}
                      </span>
                    </div>
                  ))}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-6)", paddingLeft: 24 }}>
                Only the messages and dates were read. No code was sent anywhere.
              </div>
            </div>
          ) : (
            <div style={{ paddingBottom: 60 }} />
          )}
        </div>
      </div>
    </div>
  );
}
