import { apiFetch } from "./api-client";

export type ArcStatus = "candidate" | "keep" | "skip";

export interface Arc {
  id: number;
  product: string;
  key: string;
  title: string;
  from_at: number;
  to_at: number;
  score: number;
  signals: { name: string; weight: number }[];
  commits: { hash: string; subject: string; at: number }[];
  status: ArcStatus;
  kind: string | null;
  angle: string | null;
  reason: string | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  kind: string;
  repo_path: string | null;
  what_it_does: string | null;
  audience: string | null;
  moments: string | null;
  excluded: number;
  last_scan_at: number | null;
  keep_count: number;
  candidate_count: number;
}

export interface PatternStructure {
  name: string;
  hook: string;
  opening_move: string;
  shape: string;
  tension: string;
  close: string;
  voice: string;
  length_words: number;
  works_because: string;
}

export interface Pattern {
  id: number;
  name: string;
  platform: string | null;
  author: string | null;
  engagement: string | null;
  source_text: string;
  structure: PatternStructure;
  created_at: number;
}

export interface Draft {
  id: number;
  arc_id: number;
  pattern_id: number;
  pattern_name: string;
  text: string;
  note: string | null;
  created_at: number;
}

export interface ProviderStatus {
  id: string;
  label: string;
  credential: string;
  available: boolean;
  model: string;
  active: boolean;
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function listArcs(status?: ArcStatus, limit = 50): Promise<Arc[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (status) q.set("status", status);
  return (await json<{ arcs: Arc[] }>(await apiFetch(`/api/arcs?${q}`))).arcs;
}

export async function listProducts(): Promise<Product[]> {
  return (await json<{ products: Product[] }>(await apiFetch("/api/products"))).products;
}

export interface BrowseEntry {
  name: string;
  path: string;
  isRepo: boolean;
  repos: number;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  home: string;
  entries: BrowseEntry[];
}

export async function browseFolder(path?: string): Promise<BrowseResult> {
  const q = path ? `?path=${encodeURIComponent(path)}` : "";
  return json<BrowseResult>(await apiFetch(`/api/browse${q}`));
}

// Opens a real OS folder chooser on the machine running the API. `path` is
// null when the user cancels; `reason: "unavailable"` means no picker exists
// on this platform and the caller should fall back to typing a path.
export async function pickFolder() {
  return json<{ path: string | null; reason?: "cancelled" | "unavailable" }>(
    await apiFetch("/api/pick-folder", { method: "POST" }),
  );
}

export async function scan(root: string, since = "12 months ago", only?: string) {
  return json<{ repos: number; skipped: number; found: number; added: number }>(
    await apiFetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ root, since, only }),
    }),
  );
}

export async function setSourceExcluded(id: number, excluded: boolean) {
  return json<{ ok: true }>(
    await apiFetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ excluded }),
    }),
  );
}

export async function triage(limit = 12) {
  return json<{ sent: number; triaged: number; cost_usd: number }>(
    await apiFetch(`/api/triage?limit=${limit}`, { method: "POST" }),
  );
}

export async function setArcStatus(id: number, status: ArcStatus) {
  return json<{ ok: true }>(
    await apiFetch(`/api/arcs/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
}

export async function listProviders(): Promise<ProviderStatus[]> {
  return (await json<{ providers: ProviderStatus[] }>(await apiFetch("/api/providers")))
    .providers;
}

export async function setProvider(provider: string, model?: string) {
  return json<{ providers: ProviderStatus[] }>(
    await apiFetch("/api/providers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model }),
    }),
  );
}

export async function listPatterns(): Promise<Pattern[]> {
  return (await json<{ patterns: Pattern[] }>(await apiFetch("/api/patterns"))).patterns;
}

export async function harvestPattern(input: {
  text: string;
  author?: string;
  engagement?: string;
  platform?: string;
}) {
  return json<{ id: number; structure: PatternStructure; cost_usd: number }>(
    await apiFetch("/api/patterns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export interface FeedDraft extends Draft {
  product: string;
  angle: string | null;
  status: "new" | "used" | "discarded";
  commits: { hash: string; subject: string; at: number }[];
}

export async function listAllDrafts(): Promise<FeedDraft[]> {
  return (await json<{ drafts: FeedDraft[] }>(await apiFetch("/api/drafts"))).drafts;
}

export async function setDraftStatus(id: number, status: FeedDraft["status"]) {
  return json<{ ok: true }>(
    await apiFetch(`/api/drafts/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
}

export async function listIdeas(): Promise<{ ideas: Arc[]; candidates: number }> {
  return json<{ ideas: Arc[]; candidates: number }>(await apiFetch("/api/ideas"));
}

export async function listDrafts(arcId: number): Promise<Draft[]> {
  return (await json<{ drafts: Draft[] }>(await apiFetch(`/api/arcs/${arcId}/drafts`)))
    .drafts;
}

export async function generateDrafts(arcId: number, patternId: number) {
  return json<{ drafts: Draft[]; cost_usd: number }>(
    await apiFetch(`/api/arcs/${arcId}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pattern_id: patternId }),
    }),
  );
}

export async function saveDossier(
  id: number,
  fields: { what_it_does?: string; audience?: string; moments?: string },
) {
  return json<{ ok: true }>(
    await apiFetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    }),
  );
}
