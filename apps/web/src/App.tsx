import { useCallback, useEffect, useMemo, useState } from "react";
import { FirstRun } from "@/components/FirstRun";
import { IdeasView } from "@/components/IdeasView";
import { PostsView, groupDrafts, type PostGroup } from "@/components/PostsView";
import { PostView } from "@/components/PostView";
import { Rail, type View } from "@/components/Rail";
import { SettingsPanel, type Lookback } from "@/components/SettingsPanel";
import { StylesView } from "@/components/StylesView";
import { Writing } from "@/components/Writing";
import type { Arc, FeedDraft, Pattern, Product } from "@/lib/conjurer";
import {
  generateDrafts,
  listAllDrafts,
  listIdeas,
  listPatterns,
  listProducts,
  scan,
  setArcStatus,
  setDraftStatus,
  triage,
} from "@/lib/conjurer";

const LAST_SCAN_KEY = "post-conjurer.lastScan";
const LOOKBACK_KEY = "post-conjurer.lookback";

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 120) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86_400)} days ago`;
}

export function App() {
  const [view, setView] = useState<View>("ideas");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [writing, setWriting] = useState<Arc | null>(null);
  const [settings, setSettings] = useState(false);

  const [drafts, setDrafts] = useState<FeedDraft[]>([]);
  const [ideas, setIdeas] = useState<Arc[]>([]);
  const [candidates, setCandidates] = useState(0);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [root, setRoot] = useState("");
  const [lookback, setLookback] = useState<Lookback>("2 months ago");
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // One load for the whole app. Every view is a projection of the same state,
  // so a change anywhere refreshes all of it and the rail counts stay honest.
  const refresh = useCallback(async () => {
    setError("");
    try {
      const [d, i, pat, prod] = await Promise.all([
        listAllDrafts(),
        listIdeas(),
        listPatterns(),
        listProducts(),
      ]);
      setDrafts(d);
      setIdeas(i.ideas);
      setCandidates(i.candidates);
      setPatterns(pat);
      setProducts(prod);
      setRoot((cur) => {
        if (cur) return cur;
        const p = prod.find((x) => x.repo_path)?.repo_path;
        return p ? p.replace(/\\/g, "/").split("/").slice(0, -1).join("/") : cur;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SCAN_KEY);
    if (stored) setLastScanAt(Number(stored));
    const lb = localStorage.getItem(LOOKBACK_KEY);
    if (lb) setLookback(lb as Lookback);
    void refresh();
  }, [refresh]);

  const groups = useMemo(() => groupDrafts(drafts), [drafts]);
  const counts: Record<View, number> = {
    ideas: ideas.length,
    posts: groups.length,
    styles: patterns.length,
  };

  const lastScan = lastScanAt
    ? `Last scan ${ago(lastScanAt)}\n${products.length} project${products.length === 1 ? "" : "s"}`
    : null;

  async function act(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  // Takes an explicit path so a just-chosen folder can be scanned immediately,
  // before the `root` state update has landed.
  const onScan = (path?: string) =>
    act("scan", async () => {
      await scan(path ?? root, lookback);
      const now = Date.now();
      localStorage.setItem(LAST_SCAN_KEY, String(now));
      setLastScanAt(now);
    });

  const onFindMore = () => act("triage", async () => void (await triage(12)));

  async function write(idea: Arc) {
    const pattern = patterns[0];
    if (!pattern) {
      setView("styles");
      return;
    }
    setWriting(idea);
    setError("");
    try {
      await generateDrafts(idea.id, pattern.id);
      const fresh = await listAllDrafts();
      setDrafts(fresh);
      const made = groupDrafts(fresh).find(
        (g) => g.lead.arc_id === idea.id && g.lead.pattern_id === pattern.id,
      );
      setWriting(null);
      if (made) {
        setOpenPost(made.key);
        setView("posts");
      }
      await refresh();
    } catch (e) {
      setWriting(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function copyAndOpen(g: PostGroup) {
    await navigator.clipboard.writeText(g.lead.text);
    setOpenPost(g.key);
    setView("posts");
  }

  const current = openPost ? groups.find((g) => g.key === openPost) : undefined;
  const firstRun = loaded && products.length === 0 && groups.length === 0;

  function body() {
    if (writing) {
      return (
        <Writing
          idea={writing}
          styleName={patterns[0]?.name ?? "your style"}
          ideasLeft={Math.max(0, ideas.length - 1)}
          onStop={() => setWriting(null)}
        />
      );
    }

    if (view === "posts" && current) {
      return (
        <PostView
          versions={current.versions}
          onBack={() => setOpenPost(null)}
          onRewrite={() => {
            const idea = ideas.find((i) => i.id === current.lead.arc_id);
            if (idea) void write(idea);
          }}
          onMarkPosted={(d) => act("mark", async () => void (await setDraftStatus(d.id, "used")))}
          onUnmark={(d) => act("mark", async () => void (await setDraftStatus(d.id, "new")))}
        />
      );
    }

    if (view === "posts") {
      return (
        <PostsView
          groups={groups}
          ideaCount={ideas.length}
          onOpen={(g) => setOpenPost(g.key)}
          onCopy={copyAndOpen}
          onGoToIdeas={() => setView("ideas")}
        />
      );
    }

    if (view === "styles") {
      return <StylesView patterns={patterns} onChanged={refresh} />;
    }

    return (
      <IdeasView
        ideas={ideas}
        candidates={candidates}
        products={products}
        hasStyles={patterns.length > 0}
        busy={busy === "triage"}
        onWrite={write}
        onDiscard={(i) => act("skip", async () => void (await setArcStatus(i.id, "skip")))}
        onFindMore={onFindMore}
        onGoToStyles={() => setView("styles")}
      />
    );
  }

  if (firstRun) {
    return (
      <main
        className="flex h-screen flex-col"
        style={{ background: "var(--paper)", color: "var(--ink)" }}
      >
        <FirstRun
          setRoot={setRoot}
          onScan={onScan}
          scanning={busy === "scan"}
          error={error}
        />
      </main>
    );
  }

  return (
    // h-screen, not min-h-screen: this is a desktop shell that owns the
    // viewport and scrolls internally. min-h-screen is a floor, so any list
    // taller than the window grew the whole document instead.
    <main
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--paper)", color: "var(--ink)", position: "relative" }}
    >
      <Rail
        view={view}
        counts={counts}
        lastScan={lastScan}
        scanning={busy === "scan"}
        onNavigate={(v) => {
          setView(v);
          setOpenPost(null);
        }}
        onRescan={onScan}
        onSettings={() => setSettings(true)}
      />

      {/* min-h-0 all the way down: a flex item defaults to min-height:auto,
          which is its content height, so an inner overflow-y-auto can never
          shrink enough to actually scroll. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <div
            style={{
              padding: "12px 64px",
              fontSize: 13,
              color: "rgb(var(--danger))",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            {error}
          </div>
        ) : null}
        {body()}
      </div>

      <SettingsPanel
        open={settings}
        root={root}
        setRoot={setRoot}
        lookback={lookback}
        setLookback={(v) => {
          setLookback(v);
          localStorage.setItem(LOOKBACK_KEY, v);
        }}
        products={products}
        repoCount={products.length}
        lastScan={lastScanAt ? `last scan ${ago(lastScanAt)}` : null}
        scanning={busy === "scan"}
        onRescan={onScan}
        onClose={() => setSettings(false)}
        onProductsChanged={refresh}
      />
    </main>
  );
}
