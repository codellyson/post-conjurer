import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IdeasView } from "@/components/IdeasView";
import { PostsView, groupDrafts } from "@/components/PostsView";
import { PostView } from "@/components/PostView";
import { Shell } from "@/components/Shell";
import { SourcesView } from "@/components/SourcesView";
import { StylesView } from "@/components/StylesView";
import { Writing } from "@/components/Writing";
import type { Arc } from "@/lib/conjurer";
import {
  useDrafts,
  useGenerate,
  useIdeas,
  usePatterns,
  useProducts,
  useScan,
  useSetArcStatus,
  useSetDraftStatus,
  useTriage,
} from "@/lib/queries";

const rootRoute = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});

function IdeasRoute() {
  const navigate = useNavigate();
  const ideas = useIdeas();
  const patterns = usePatterns();
  const products = useProducts();
  const drafts = useDrafts();
  const triaging = useTriage();
  const arcStatus = useSetArcStatus();
  const generating = useGenerate();
  const [writing, setWriting] = useState<Arc | null>(null);

  const patternList = patterns.data ?? [];
  const list = ideas.data?.ideas ?? [];

  async function write(idea: Arc) {
    const pattern = patternList[0]?.id;
    if (!pattern) {
      void navigate({ to: "/styles" });
      return;
    }
    setWriting(idea);
    try {
      await generating.mutateAsync({ arcId: idea.id, patternId: pattern });
      const fresh = await drafts.refetch();
      const made = groupDrafts(fresh.data ?? []).find(
        (g) => g.lead.arc_id === idea.id && g.lead.pattern_id === pattern,
      );
      if (made) void navigate({ to: "/posts/$key", params: { key: made.key } });
    } finally {
      setWriting(null);
    }
  }

  if (writing) {
    return (
      <Writing
        idea={writing}
        styleName={patternList[0]?.name ?? "your style"}
        ideasLeft={Math.max(0, list.length - 1)}
        onStop={() => setWriting(null)}
      />
    );
  }

  return (
    <IdeasView
      ideas={list}
      candidates={ideas.data?.candidates ?? 0}
      products={products.data ?? []}
      hasStyles={patternList.length > 0}
      busy={triaging.isPending}
      onWrite={(i) => void write(i)}
      onDiscard={(i) => arcStatus.mutate({ id: i.id, status: "skip" })}
      onFindMore={() => triaging.mutate(12)}
      onGoToStyles={() => void navigate({ to: "/styles" })}
      onGoToSources={() => void navigate({ to: "/sources" })}
    />
  );
}

function PostsRoute() {
  const navigate = useNavigate();
  const drafts = useDrafts();
  const ideas = useIdeas();
  const groups = useMemo(() => groupDrafts(drafts.data ?? []), [drafts.data]);

  return (
    <PostsView
      groups={groups}
      ideaCount={ideas.data?.ideas.length ?? 0}
      onOpen={(g) => void navigate({ to: "/posts/$key", params: { key: g.key } })}
      onCopy={async (g) => {
        await navigator.clipboard.writeText(g.lead.text);
        void navigate({ to: "/posts/$key", params: { key: g.key } });
      }}
      onGoToIdeas={() => void navigate({ to: "/ideas" })}
    />
  );
}

function PostRoute() {
  const { key } = useParams({ from: "/posts/$key" });
  const navigate = useNavigate();
  const drafts = useDrafts();
  const generating = useGenerate();
  const draftStatus = useSetDraftStatus();
  const groups = useMemo(() => groupDrafts(drafts.data ?? []), [drafts.data]);
  const group = groups.find((g) => g.key === key);

  // A discarded or rewritten post can vanish from under a live URL.
  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ padding: 64 }}>
        <div className="flex flex-col items-center" style={{ gap: 14, maxWidth: 420 }}>
          <div className="serif" style={{ fontSize: 26 }}>
            That post is gone
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-5)", textAlign: "center" }}>
            It was discarded or rewritten since this link was opened.
          </div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/posts" })}
            style={{ fontSize: 13.5, color: "var(--link)", fontWeight: 600 }}
          >
            Back to posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <PostView
      versions={group.versions}
      rewriting={generating.isPending}
      onBack={() => void navigate({ to: "/posts" })}
      onRewrite={() =>
        generating.mutate({ arcId: group.lead.arc_id, patternId: group.lead.pattern_id })
      }
      onMarkPosted={(d) => draftStatus.mutate({ id: d.id, status: "used" })}
      onUnmark={(d) => draftStatus.mutate({ id: d.id, status: "new" })}
    />
  );
}

function StylesRoute() {
  return <StylesView patterns={usePatterns().data ?? []} />;
}

function SourcesRoute() {
  const products = useProducts();
  const scanning = useScan();
  const root = useMemo(() => {
    const p = (products.data ?? []).find((x) => x.repo_path)?.repo_path;
    return p ? p.replace(/\\/g, "/").split("/").slice(0, -1).join("/") : "";
  }, [products.data]);

  return (
    <SourcesView
      sources={products.data ?? []}
      busy={scanning.isPending}
      onRescanOne={(s) =>
        s.repo_path && scanning.mutate({ root, since: "2 months ago", only: s.repo_path })
      }
    />
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IdeasRoute,
});

const ideasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ideas",
  component: IdeasRoute,
});

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts",
  component: PostsRoute,
});

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$key",
  component: PostRoute,
});

const stylesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/styles",
  component: StylesRoute,
});

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sources",
  component: SourcesRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  ideasRoute,
  postsRoute,
  postRoute,
  stylesRoute,
  sourcesRoute,
]);

// Hash history, not browser history: the desktop build serves from a custom
// protocol that has no server to rewrite unknown paths back to index.html, so
// a reload on /posts/12:3 would 404.
export const router = createRouter({ routeTree, history: createHashHistory() });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
