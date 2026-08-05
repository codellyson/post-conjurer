import type { Commit } from "./git.js";

export interface Signal {
  name: string;
  weight: number;
}

export interface Arc {
  title: string;
  commits: Commit[];
  from: number;
  to: number;
  score: number;
  signals: Signal[];
}

const TYPE_WEIGHT: Record<string, number> = {
  revert: 0.9,
  feat: 1,
  fix: 0.55,
  perf: 0.5,
  refactor: 0.35,
  docs: 0.15,
  test: 0.1,
  build: 0.1,
  chore: 0.05,
  style: 0.05,
  ci: 0.05,
  debug: 0.05,
};

// Deleting something you built is the most postable event in a history. But the
// *words* for it ("drop the tab bar", "cut paint work") appear in ordinary
// commits, so matching prose fires on nearly every arc and discriminates
// nothing. The honest signal is in the numstat: real removal deletes far more
// than it adds. Prose only corroborates.
const REMOVAL_WORDS = /\b(strip\w*|remove\w*|delete\w*|rip out|retire\w*|deprecate\w*|purge\w*)\b/i;
const REVERT = /^revert\b/i;

const LOW_EFFORT_SUBJECT = /^(updated?|wip|landmark|fixes?|changes?|misc|stuff|test)\b/i;

// Tearing out a feature people used is a story. Deleting dead code, a finished
// migration, or generated files is housekeeping that happens to be large — the
// numstat cannot tell them apart, but the wording usually can.
const CLEANUP_WORDS = /\b(unused|dead code|legacy|clean ?up|obsolete|stale|generated|leftover|orphan\w*|no longer (used|needed)|migration is complete)\b/i;

// Deliberately excludes bare `app/` and `apps/` — in a monorepo everything
// lives under those, so counting them made "user-facing" true of every change.
const USER_FACING = /(^|\/)(pages|components|views|routes|screens|public|entrypoints|ui)\//i;
const NOISE = /(lock\.(json|yaml)|-lock\.|\.gitignore|\.env|tsconfig|\.config\.|^\.github\/|^dist\/|^\.output\/)/i;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "add",
  "adds", "added", "update", "updates", "updated", "use", "uses", "make", "new",
  "when", "not", "now", "from", "into", "its", "it", "is", "be", "so", "that",
  "this", "more", "only", "all", "via", "up", "out",
]);

// An arc is a contiguous run of work on one theme, so it is bounded by a gap in
// time and a cap on length. Both exist to stop single-linkage chaining, where
// A relates to B and B to C until an entire project history is one "arc".
const MAX_GAP_MS = 4 * 24 * 60 * 60 * 1000;
const MAX_ARC_COMMITS = 6;

// A directory touched by most commits (src/app in a Next project) says nothing
// about whether two commits belong together. Only rare directories are signal.
const COMMON_DIR_RATIO = 0.4;

interface Parsed {
  commit: Commit;
  type: string | null;
  scope: string | null;
  keywords: Set<string>;
  dirs: Set<string>;
}

function parse(commit: Commit): Parsed {
  const m = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/.exec(commit.subject);
  const type = m ? m[1].toLowerCase() : null;
  const scope = m?.[2]?.toLowerCase() ?? null;
  const text = (m ? m[3] : commit.subject).toLowerCase();

  const keywords = new Set(
    text
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );

  const dirs = new Set(
    commit.files
      .filter((f) => !NOISE.test(f.path))
      .map((f) => f.path.split("/").slice(0, -1).join("/") || "."),
  );

  return { commit, type, scope, keywords, dirs };
}

function related(a: Parsed, b: Parsed, commonDirs: Set<string>): boolean {
  if (a.scope && a.scope === b.scope) return true;
  const dirHit = [...a.dirs].some((d) => !commonDirs.has(d) && b.dirs.has(d));
  const keyHits = [...a.keywords].filter((k) => b.keywords.has(k)).length;
  return dirHit || keyHits >= 2;
}

export function detectArcs(commits: Commit[]): Arc[] {
  const parsed = commits.map(parse).sort((a, b) => a.commit.at - b.commit.at);

  const dirCounts = new Map<string, number>();
  for (const p of parsed) {
    for (const d of p.dirs) dirCounts.set(d, (dirCounts.get(d) ?? 0) + 1);
  }
  const commonDirs = new Set(
    [...dirCounts]
      .filter(([, n]) => n / parsed.length > COMMON_DIR_RATIO)
      .map(([d]) => d),
  );

  const groups: Parsed[][] = [];
  let current: Parsed[] = [];

  for (const p of parsed) {
    const last = current[current.length - 1];
    const breaks =
      !last ||
      p.commit.at - last.commit.at > MAX_GAP_MS ||
      current.length >= MAX_ARC_COMMITS ||
      // Compare against the tail only. Testing against every member is what
      // lets an arc absorb anything transitively connected to it.
      !current.slice(-2).some((q) => related(p, q, commonDirs));

    if (breaks && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length) groups.push(current);

  return groups.map(toArc).sort((a, b) => b.score - a.score);
}

function toArc(group: Parsed[]): Arc {
  const commits = group.map((p) => p.commit);
  const blob = commits.map((c) => `${c.subject}\n${c.body}`).join("\n");
  const signals: Signal[] = [];

  const typeScore = Math.max(
    ...group.map((p) => (p.type ? (TYPE_WEIGHT[p.type] ?? 0.3) : 0.3)),
  );
  signals.push({ name: `type:${bestType(group)}`, weight: typeScore * 0.8 });

  const insertions = commits.reduce((n, c) => n + c.insertions, 0);
  const deletions = commits.reduce((n, c) => n + c.deletions, 0);
  const churn = insertions + deletions;

  const touched = commits.flatMap((c) => c.files);
  const userFacing = touched.filter((f) => USER_FACING.test(f.path)).length;
  const userFacingRatio = userFacing / Math.max(touched.length, 1);

  if (deletions >= 80 && deletions > insertions * 1.5) {
    const ratio = deletions / Math.max(insertions, 1);
    const corroborated = REMOVAL_WORDS.test(blob);
    // Ratio says "this was a removal"; magnitude says "how much was torn out".
    // Scoring ratio alone rated deleting 131 lines the same as deleting 8,362.
    const magnitude = Math.min(
      2.2,
      0.3 +
        Math.log10(ratio) * 0.4 +
        Math.log10(deletions) / 3 +
        (corroborated ? 0.3 : 0),
    );
    // "legacy" and "unused" show up in genuine pivots too ("remove playground
    // and legacy composer"). If the deletion reached code the user could see,
    // it was a decision — the wording doesn't get to demote it.
    const cleanup = CLEANUP_WORDS.test(blob) && userFacingRatio < 0.15;
    signals.push({
      name: `${cleanup ? "cleanup" : "net-removal"}:-${deletions - insertions}`,
      weight: cleanup ? magnitude * 0.35 : magnitude,
    });
  }

  if (commits.some((c) => REVERT.test(c.subject))) {
    signals.push({ name: "revert", weight: 0.8 });
  }

  if (commits.length > 1) {
    signals.push({
      name: `arc:${commits.length}`,
      weight: Math.min(0.4, 0.1 * (commits.length - 1)),
    });
  }

  if (churn > 0) {
    signals.push({
      name: `churn:${churn}`,
      weight: Math.min(0.4, Math.log10(churn) / 10),
    });
  }

  if (userFacing > 0) {
    signals.push({ name: "user-facing", weight: userFacingRatio * 0.3 });
  }

  const noisy = touched.length > 0 && touched.every((f) => NOISE.test(f.path));
  if (noisy) signals.push({ name: "config-only", weight: -0.8 });

  const lowEffort = commits.filter((c) => LOW_EFFORT_SUBJECT.test(c.subject)).length;
  if (lowEffort) {
    signals.push({
      name: `vague-subjects:${lowEffort}`,
      weight: -0.3 * (lowEffort / commits.length),
    });
  }

  return {
    title: pickTitle(group),
    commits: commits.slice().sort((a, b) => a.at - b.at),
    from: Math.min(...commits.map((c) => c.at)),
    to: Math.max(...commits.map((c) => c.at)),
    score: Number(signals.reduce((n, s) => n + s.weight, 0).toFixed(2)),
    signals,
  };
}

function bestType(group: Parsed[]): string {
  return (
    group
      .filter((p) => p.type)
      .sort(
        (a, b) =>
          (TYPE_WEIGHT[b.type!] ?? 0.3) - (TYPE_WEIGHT[a.type!] ?? 0.3),
      )[0]?.type ?? "none"
  );
}

// The arc's headline is its highest-signal commit, not its first — the commit
// that removed four features says more than the one that laid the groundwork.
function pickTitle(group: Parsed[]): string {
  const ranked = group.slice().sort((a, b) => {
    const score = (p: Parsed) =>
      (p.type ? (TYPE_WEIGHT[p.type] ?? 0.3) : 0.3) +
      (p.commit.deletions > p.commit.insertions * 1.5 ? 1 : 0) +
      (REMOVAL_WORDS.test(p.commit.subject) ? 0.5 : 0) +
      Math.min(0.3, p.commit.churn / 4000);
    return score(b) - score(a);
  });
  return ranked[0].commit.subject;
}
