import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FirstRun } from "@/components/FirstRun";
import { groupDrafts } from "@/components/PostsView";
import { Rail, type View } from "@/components/Rail";
import { SettingsPanel, type Lookback } from "@/components/SettingsPanel";
import { Btn } from "@/components/ui";
import { Unreachable } from "@/components/Unreachable";
import { useDrafts, useIdeas, usePatterns, useProducts, useScan } from "@/lib/queries";

const LAST_SCAN_KEY = "post-conjurer.lastScan";
const LOOKBACK_KEY = "post-conjurer.lookback";

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 120) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86_400)} days ago`;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function viewFor(pathname: string): View {
  if (pathname.startsWith("/posts")) return "posts";
  if (pathname.startsWith("/styles")) return "styles";
  if (pathname.startsWith("/sources")) return "sources";
  return "ideas";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [settings, setSettings] = useState(false);
  const [root, setRoot] = useState("");
  const [lookback, setLookback] = useState<Lookback>("2 months ago");
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  const drafts = useDrafts();
  const ideas = useIdeas();
  const patterns = usePatterns();
  const products = useProducts();
  const scanning = useScan();

  const queries = [drafts, ideas, patterns, products];
  // A retry that has already failed once but is parked counts as a failure for
  // display. TanStack pauses retries while the window is unfocused, so without
  // this the app sits on zeros — no data, no error — until you click back into
  // it, which reads as an empty library rather than an unreachable one.
  const stalled = queries.find(
    (q) => q.isError || (q.fetchStatus === "paused" && q.failureReason),
  );
  const failure = stalled?.error ?? stalled?.failureReason;
  const anyData = queries.some((q) => q.data !== undefined);
  const settled = queries.every((q) => !q.isPending);

  // reset, not refetch: a retryer parked by an unfocused window does not
  // restart on refetch, so the button would do nothing exactly when it matters.
  const retryAll = () => void qc.resetQueries();

  const productList = useMemo(() => products.data ?? [], [products.data]);
  const groups = useMemo(() => groupDrafts(drafts.data ?? []), [drafts.data]);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SCAN_KEY);
    if (stored) setLastScanAt(Number(stored));
    const lb = localStorage.getItem(LOOKBACK_KEY);
    if (lb) setLookback(lb as Lookback);
  }, []);

  useEffect(() => {
    if (root) return;
    const p = productList.find((x) => x.repo_path)?.repo_path;
    if (p) setRoot(p.replace(/\\/g, "/").split("/").slice(0, -1).join("/"));
  }, [productList, root]);

  const onScan = (path?: string) =>
    scanning.mutate(
      { root: path ?? root, since: lookback },
      {
        onSuccess: () => {
          const now = Date.now();
          localStorage.setItem(LAST_SCAN_KEY, String(now));
          setLastScanAt(now);
        },
      },
    );

  // An empty app and an unreachable API look identical from the data alone, so
  // only a load that has actually returned can justify the first-run screen.
  if (failure && !anyData) {
    return (
      <Unreachable
        detail={message(failure)}
        retrying={queries.some((q) => q.isFetching)}
        onRetry={retryAll}
      />
    );
  }

  if (settled && anyData && productList.length === 0 && groups.length === 0) {
    return (
      <main
        className="flex h-screen flex-col"
        style={{ background: "var(--paper)", color: "var(--ink)" }}
      >
        <FirstRun
          setRoot={setRoot}
          onScan={onScan}
          scanning={scanning.isPending}
          error={scanning.error ? message(scanning.error) : ""}
        />
      </main>
    );
  }

  const counts: Record<View, number> = {
    ideas: ideas.data?.ideas.length ?? 0,
    posts: groups.length,
    styles: patterns.data?.length ?? 0,
    sources: productList.filter((p) => p.excluded !== 1).length,
  };

  return (
    // h-screen, not min-h-screen: this is a desktop shell that owns the
    // viewport and scrolls internally. min-h-screen is a floor, so any list
    // taller than the window grew the whole document instead.
    <main
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--paper)", color: "var(--ink)", position: "relative" }}
    >
      <Rail
        view={viewFor(pathname)}
        counts={counts}
        lastScan={
          lastScanAt
            ? `Last scan ${ago(lastScanAt)}\n${productList.length} project${productList.length === 1 ? "" : "s"}`
            : null
        }
        scanning={scanning.isPending}
        onNavigate={(v) => void navigate({ to: `/${v}` })}
        onRescan={() => onScan()}
        onSettings={() => setSettings(true)}
      />

      {/* min-h-0 all the way down: a flex item defaults to min-height:auto,
          which is its content height, so an inner overflow-y-auto can never
          shrink enough to actually scroll. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* A read that fails once the app has data keeps the data on screen
            rather than blanking a working page. */}
        {failure && anyData ? (
          <div
            className="flex items-center justify-between"
            style={{
              padding: "10px 64px",
              fontSize: 13,
              color: "var(--ink-5)",
              background: "var(--field)",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <span>Showing what was last loaded — the library went quiet.</span>
            <Btn
              variant="quiet"
              style={{ fontSize: 12.5 }}
              onClick={retryAll}
            >
              Retry
            </Btn>
          </div>
        ) : null}

        {scanning.error ? (
          <div
            style={{
              padding: "12px 64px",
              fontSize: 13,
              color: "rgb(var(--danger))",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            {message(scanning.error)}
          </div>
        ) : null}

        <div key={pathname} className="view-swap flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
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
        repoCount={productList.length}
        lastScan={lastScanAt ? `last scan ${ago(lastScanAt)}` : null}
        scanning={scanning.isPending}
        onRescan={() => onScan()}
        onClose={() => setSettings(false)}
      />
    </main>
  );
}
