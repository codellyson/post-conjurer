import { getDb } from "../db.js";
import type { Arc } from "./arcs.js";
import type { Commit } from "./git.js";
import type { PatternStructure } from "./patterns.js";

export interface StoredArc {
  id: number;
  product: string;
  key: string;
  title: string;
  from_at: number;
  to_at: number;
  score: number;
  signals: { name: string; weight: number }[];
  commits: Pick<Commit, "hash" | "subject" | "at">[];
  status: string;
  kind: string | null;
  angle: string | null;
  reason: string | null;
}

export function upsertProduct(name: string, repoPath: string): number {
  const db = getDb();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  db.prepare(
    `INSERT INTO product (slug, name, repo_path, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET repo_path = excluded.repo_path`,
  ).run(slug, name, repoPath, Date.now());
  const row = db.prepare("SELECT id FROM product WHERE slug = ?").get(slug) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`product upsert failed for ${slug}`);
  return row.id;
}

export function saveArc(productId: number, arc: Arc): boolean {
  const key = arc.commits.map((c) => c.hash).join(",");
  // Re-scans replay the same arcs. Ignoring the conflict preserves any triage
  // verdict already attached rather than resetting it to `candidate`.
  const info = getDb()
    .prepare(
      `INSERT OR IGNORE INTO arc
         (product_id, key, title, from_at, to_at, score, signals, commits, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      productId,
      key,
      arc.title,
      arc.from,
      arc.to,
      arc.score,
      JSON.stringify(arc.signals),
      JSON.stringify(
        arc.commits.map((c) => ({ hash: c.hash, subject: c.subject, at: c.at })),
      ),
      Date.now(),
    );
  return info.changes > 0;
}

export function listArcs(
  opts: { status?: string; limit?: number } = {},
): StoredArc[] {
  const rows = getDb()
    .prepare(
      `SELECT a.id, p.name AS product, a.key, a.title, a.from_at, a.to_at,
              a.score, a.signals, a.commits, a.status, a.kind, a.angle, a.reason
         FROM arc a JOIN product p ON p.id = a.product_id
        WHERE (? IS NULL OR a.status = ?)
        ORDER BY a.score DESC
        LIMIT ?`,
    )
    .all(
      opts.status ?? null,
      opts.status ?? null,
      opts.limit ?? 50,
    ) as Record<string, unknown>[];

  return rows.map((r) => ({
    ...r,
    signals: JSON.parse(String(r.signals)),
    commits: JSON.parse(String(r.commits)),
  })) as unknown as StoredArc[];
}

export interface StoredProduct {
  id: number;
  slug: string;
  name: string;
  repo_path: string | null;
  what_it_does: string | null;
  audience: string | null;
  moments: string | null;
  keep_count: number;
  candidate_count: number;
}

export function listProducts(): StoredProduct[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.slug, p.name, p.repo_path, p.what_it_does, p.audience, p.moments,
              COUNT(CASE WHEN a.status = 'keep' THEN 1 END) AS keep_count,
              COUNT(CASE WHEN a.status = 'candidate' THEN 1 END) AS candidate_count
         FROM product p LEFT JOIN arc a ON a.product_id = p.id
        GROUP BY p.id
        ORDER BY keep_count DESC, p.name`,
    )
    .all() as unknown as StoredProduct[];
}

export function updateProduct(
  id: number,
  fields: { what_it_does?: string; audience?: string; moments?: string },
): boolean {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return false;
  const set = entries.map(([k]) => `${k} = ?`).join(", ");
  const info = getDb()
    .prepare(`UPDATE product SET ${set} WHERE id = ?`)
    .run(...entries.map(([, v]) => v as string), id);
  return info.changes > 0;
}

export function setArcStatus(id: number, status: string): boolean {
  const info = getDb().prepare("UPDATE arc SET status = ? WHERE id = ?").run(status, id);
  return info.changes > 0;
}

export interface StoredPattern {
  id: number;
  name: string;
  platform: string | null;
  author: string | null;
  engagement: string | null;
  source_text: string;
  structure: PatternStructure;
  created_at: number;
}

export function savePattern(row: {
  name: string;
  platform?: string;
  author?: string;
  engagement?: string;
  sourceText: string;
  structure: PatternStructure;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO pattern (name, platform, author, engagement, source_text, structure, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.name,
      row.platform ?? null,
      row.author ?? null,
      row.engagement ?? null,
      row.sourceText,
      JSON.stringify(row.structure),
      Date.now(),
    );
  return Number(info.lastInsertRowid);
}

export function listPatterns(): StoredPattern[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, platform, author, engagement, source_text, structure, created_at
         FROM pattern ORDER BY created_at DESC`,
    )
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    ...r,
    structure: JSON.parse(String(r.structure)),
  })) as unknown as StoredPattern[];
}

export function getPattern(id: number): StoredPattern | null {
  return listPatterns().find((p) => p.id === id) ?? null;
}

export function getArc(id: number): StoredArc | null {
  return listArcs({ limit: 10000 }).find((a) => a.id === id) ?? null;
}

export function getProductByName(name: string): StoredProduct | null {
  return listProducts().find((p) => p.name === name) ?? null;
}

export interface StoredDraft {
  id: number;
  arc_id: number;
  pattern_id: number;
  pattern_name: string;
  text: string;
  note: string | null;
  created_at: number;
}

export function saveDraft(
  arcId: number,
  patternId: number,
  d: { text: string; note?: string },
): number {
  const info = getDb()
    .prepare(
      "INSERT INTO draft (arc_id, pattern_id, text, note, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(arcId, patternId, d.text, d.note ?? null, Date.now());
  return Number(info.lastInsertRowid);
}

export interface FeedDraft extends StoredDraft {
  product: string;
  angle: string | null;
  status: string;
  // Carried through so a finished post can show what it was made from. Without
  // this the post arrives with no visible cause, which reads as magic.
  commits: Pick<Commit, "hash" | "subject" | "at">[];
}

/** Every draft across every arc — the Posts view, which is the app's front page. */
export function listAllDrafts(includeDiscarded = false): FeedDraft[] {
  const rows = getDb()
    .prepare(
      `SELECT d.id, d.arc_id, d.pattern_id, pat.name AS pattern_name, d.text, d.note,
              d.created_at, d.status, pr.name AS product, a.angle, a.commits
         FROM draft d
         JOIN arc a ON a.id = d.arc_id
         JOIN product pr ON pr.id = a.product_id
         JOIN pattern pat ON pat.id = d.pattern_id
        WHERE (? OR d.status != 'discarded')
        ORDER BY CASE d.status WHEN 'new' THEN 0 ELSE 1 END, d.created_at DESC`,
    )
    .all(includeDiscarded ? 1 : 0) as Record<string, unknown>[];

  return rows.map((r) => ({
    ...r,
    commits: JSON.parse(String(r.commits)),
  })) as unknown as FeedDraft[];
}

export function setDraftStatus(id: number, status: string): boolean {
  const info = getDb()
    .prepare("UPDATE draft SET status = ? WHERE id = ?")
    .run(status, id);
  return info.changes > 0;
}

/** Kept arcs that have no draft yet — the Ideas view. */
export function listIdeas(): StoredArc[] {
  const withDrafts = new Set(
    (getDb().prepare("SELECT DISTINCT arc_id FROM draft").all() as { arc_id: number }[]).map(
      (r) => r.arc_id,
    ),
  );
  return listArcs({ status: "keep", limit: 500 }).filter((a) => !withDrafts.has(a.id));
}

export function countCandidates(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM arc WHERE status = 'candidate'")
    .get() as { n: number };
  return row.n;
}

export function listDrafts(arcId: number): StoredDraft[] {
  return getDb()
    .prepare(
      `SELECT d.id, d.arc_id, d.pattern_id, p.name AS pattern_name, d.text, d.note, d.created_at
         FROM draft d JOIN pattern p ON p.id = d.pattern_id
        WHERE d.arc_id = ? ORDER BY d.created_at DESC`,
    )
    .all(arcId) as unknown as StoredDraft[];
}

export function applyVerdict(
  key: string,
  v: { postable: boolean; kind: string; angle: string; reason: string },
): void {
  getDb()
    .prepare(
      `UPDATE arc SET status = ?, kind = ?, angle = ?, reason = ?, triaged_at = ?
        WHERE key = ?`,
    )
    .run(
      v.postable ? "keep" : "skip",
      v.kind,
      v.angle,
      v.reason,
      Date.now(),
      key,
    );
}
