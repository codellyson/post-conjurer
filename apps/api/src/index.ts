import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { detectArcs } from "./ingest/arcs.js";
import { findRepos, readCommits } from "./ingest/git.js";
import { generate } from "./ingest/generate.js";
import { browse } from "./ingest/browse.js";
import { harvest } from "./ingest/patterns.js";
import { pickFolder } from "./ingest/pick-folder.js";
import { getProvider, providerStatuses, writeSetting } from "./providers/index.js";
import {
  applyVerdict,
  countCandidates,
  getArc,
  getPattern,
  getProductByName,
  listAllDrafts,
  listArcs,
  listDrafts,
  listIdeas,
  listPatterns,
  excludedPaths,
  listProducts,
  markScanned,
  saveArc,
  setProductExcluded,
  saveDraft,
  savePattern,
  setArcStatus,
  setDraftStatus,
  updateProduct,
  upsertProduct,
} from "./ingest/store.js";
import { triage } from "./ingest/triage.js";

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.API_TOKEN ?? "";

const app = new Hono();

// The capture extension posts from a chrome-extension:// origin, which is
// cross-origin however the request is made. Without this, captures fail with
// no error the extension can surface.
app.use(
  "/api/*",
  cors({
    origin: (o) => o,
    allowHeaders: ["content-type", "authorization"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    // The browser surface sends credentials: "include" (see apps/web
    // api-client.ts). Without this the response is rejected even though
    // allow-origin matches, and it surfaces only as "Failed to fetch".
    credentials: true,
  }),
);

// An empty API_TOKEN means "trust localhost" for local dev. Set one and the
// desktop app sends the matching bearer from the keychain.
app.use("/api/*", async (c, next) => {
  if (!TOKEN) return next();
  if (c.req.header("Authorization") !== `Bearer ${TOKEN}`) {
    return c.json(
      {
        kind: "unauthorized",
        message: "Missing or wrong bearer token. Set the same API_TOKEN here and in the app.",
      },
      401,
    );
  }
  return next();
});

app.get("/health", (c) => c.json({ ok: true }));

app.get("/api/browse", async (c) => {
  try {
    return c.json(await browse(c.req.query("path")));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return c.json({ kind: "browse", message }, 400);
  }
});

app.post("/api/pick-folder", async (c) => {
  const r = await pickFolder();
  if (r.ok) return c.json({ path: r.path });
  return c.json({ path: null, reason: r.reason });
});

app.post("/api/scan", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | { root?: string; since?: string; only?: string }
    | null;
  const root = body?.root;
  if (!root) {
    return c.json(
      { kind: "invalid_input", message: "Pass `root`: the folder holding your repos." },
      400,
    );
  }

  const all = await findRepos(root);
  const skip = excludedPaths();
  const only = typeof body?.only === "string" ? body.only : null;
  const repos = all.filter((r) => !skip.has(r.path) && (!only || r.path === only));

  let found = 0;
  let added = 0;

  for (const repo of repos) {
    const commits = await readCommits(repo.path, { since: body?.since ?? "12 months ago" });
    const productId = upsertProduct(repo.name, repo.path);
    markScanned(productId);
    if (commits.length === 0) continue;
    for (const arc of detectArcs(commits)) {
      found++;
      if (saveArc(productId, arc)) added++;
    }
  }

  return c.json({ repos: repos.length, skipped: all.length - repos.length, found, added });
});

app.get("/api/arcs", (c) => {
  const status = c.req.query("status");
  const limit = Number(c.req.query("limit") ?? 50);
  return c.json({ arcs: listArcs({ status, limit }) });
});

app.post("/api/triage", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const candidates = listArcs({ status: "candidate", limit });
  if (candidates.length === 0) return c.json({ triaged: 0, verdicts: [] });

  let result;
  try {
    result = await triage(candidates, AbortSignal.timeout(10 * 60 * 1000));
  } catch (err) {
    return c.json(
      { kind: "internal", message: err instanceof Error ? err.message : String(err) },
      502,
    );
  }

  for (const v of result.verdicts) applyVerdict(v.key, v);
  return c.json({
    sent: candidates.length,
    triaged: result.verdicts.length,
    cost_usd: result.costUsd,
    verdicts: result.verdicts,
  });
});

app.get("/api/products", (c) => c.json({ products: listProducts() }));

app.patch("/api/products/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const pick = (k: string) =>
    typeof body?.[k] === "string" ? (body[k] as string) : undefined;

  if (typeof body?.excluded === "boolean") {
    if (!setProductExcluded(id, body.excluded)) {
      return c.json({ kind: "not_found", message: `No product ${id}.` }, 404);
    }
    return c.json({ ok: true });
  }

  const ok = updateProduct(id, {
    what_it_does: pick("what_it_does"),
    audience: pick("audience"),
    moments: pick("moments"),
  });
  if (!ok) {
    return c.json({ kind: "not_found", message: `No product ${id}, or nothing to update.` }, 404);
  }
  return c.json({ ok: true });
});

app.get("/api/providers", (c) => c.json({ providers: providerStatuses() }));

app.patch("/api/providers", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | { provider?: unknown; model?: unknown }
    | null;

  if (typeof body?.provider === "string") {
    const p = getProvider(body.provider);
    if (!p) {
      return c.json({ kind: "invalid_input", message: `Unknown provider ${body.provider}.` }, 400);
    }
    writeSetting("provider", p.id);
    if (typeof body.model === "string" && body.model.trim()) {
      writeSetting(`model:${p.id}`, body.model.trim());
    }
  }
  return c.json({ providers: providerStatuses() });
});

app.get("/api/patterns", (c) => c.json({ patterns: listPatterns() }));

app.post("/api/patterns", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const exemplar = typeof body?.text === "string" ? body.text.trim() : "";
  if (exemplar.length < 40) {
    return c.json(
      { kind: "invalid_input", message: "Paste the full post — at least a few sentences." },
      400,
    );
  }
  const str = (k: string) =>
    typeof body?.[k] === "string" && body[k] ? (body[k] as string) : undefined;

  try {
    const { structure, costUsd } = await harvest(
      exemplar,
      { author: str("author"), engagement: str("engagement"), platform: str("platform") },
      AbortSignal.timeout(5 * 60 * 1000),
    );
    const id = savePattern({
      name: structure.name,
      platform: str("platform"),
      author: str("author"),
      engagement: str("engagement"),
      sourceText: exemplar,
      structure,
    });
    return c.json({ id, structure, cost_usd: costUsd }, 201);
  } catch (err) {
    return c.json(
      { kind: "internal", message: err instanceof Error ? err.message : String(err) },
      502,
    );
  }
});

app.get("/api/drafts", (c) =>
  c.json({ drafts: listAllDrafts(c.req.query("all") === "1") }),
);

app.post("/api/drafts/:id/status", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "");
  if (!["new", "used", "discarded"].includes(status)) {
    return c.json(
      { kind: "invalid_input", message: "status must be new, used, or discarded." },
      400,
    );
  }
  if (!setDraftStatus(Number(c.req.param("id")), status)) {
    return c.json({ kind: "not_found", message: "No such draft." }, 404);
  }
  return c.json({ ok: true, status });
});

app.get("/api/ideas", (c) =>
  c.json({ ideas: listIdeas(), candidates: countCandidates() }),
);

app.get("/api/arcs/:id/drafts", (c) =>
  c.json({ drafts: listDrafts(Number(c.req.param("id"))) }),
);

app.post("/api/arcs/:id/generate", async (c) => {
  const arcId = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => null)) as { pattern_id?: unknown } | null;

  const arc = getArc(arcId);
  if (!arc) return c.json({ kind: "not_found", message: `No arc ${arcId}.` }, 404);

  const pattern = getPattern(Number(body?.pattern_id));
  if (!pattern) {
    return c.json(
      { kind: "invalid_input", message: "Pick a pattern first — harvest one on the Patterns tab." },
      400,
    );
  }

  const product = getProductByName(arc.product);
  if (!product) {
    return c.json({ kind: "not_found", message: `No product ${arc.product}.` }, 404);
  }

  try {
    const { drafts, costUsd } = await generate(
      product,
      arc,
      pattern.structure,
      AbortSignal.timeout(10 * 60 * 1000),
    );
    for (const d of drafts) saveDraft(arcId, pattern.id, d);
    return c.json({ drafts: listDrafts(arcId), cost_usd: costUsd }, 201);
  } catch (err) {
    return c.json(
      { kind: "internal", message: err instanceof Error ? err.message : String(err) },
      502,
    );
  }
});

app.post("/api/arcs/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "");
  if (!["keep", "skip", "candidate"].includes(status)) {
    return c.json(
      { kind: "invalid_input", message: "status must be keep, skip, or candidate." },
      400,
    );
  }
  if (!setArcStatus(id, status)) {
    return c.json({ kind: "not_found", message: `No arc ${id}.` }, 404);
  }
  return c.json({ ok: true, status });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
