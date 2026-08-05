import { pathToFileURL } from "node:url";
import { detectArcs, type Arc } from "./arcs.js";
import { findRepos, readCommits } from "./git.js";

interface ScanResult {
  repo: string;
  arc: Arc;
}

export async function scan(
  root: string,
  opts: { since?: string; top?: number; maxPerRepo?: number } = {},
): Promise<ScanResult[]> {
  const repos = await findRepos(root);
  const results: ScanResult[] = [];
  // Forks and renamed projects share history, so the same arc surfaces from
  // several repos. Whichever repo is scanned first claims it.
  const seen = new Set<string>();

  for (const repo of repos) {
    const commits = await readCommits(repo.path, { since: opts.since });
    if (commits.length === 0) continue;
    for (const arc of detectArcs(commits)) {
      const key = arc.commits.map((c) => c.hash).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ repo: repo.name, arc });
    }
  }

  results.sort((a, b) => b.arc.score - a.arc.score);
  if (!opts.top) return results;

  // A queue of ten posts all about the same project — or all about deleting
  // things — reads worse than a lower-scoring mix. Selection is not ranking.
  const perRepo = new Map<string, number>();
  const picked: ScanResult[] = [];
  const skipped: ScanResult[] = [];

  for (const r of results) {
    const n = perRepo.get(r.repo) ?? 0;
    if (n >= (opts.maxPerRepo ?? 2)) {
      skipped.push(r);
      continue;
    }
    perRepo.set(r.repo, n + 1);
    picked.push(r);
    if (picked.length === opts.top) break;
  }

  return picked.length < opts.top
    ? picked.concat(skipped.slice(0, opts.top - picked.length))
    : picked;
}

function date(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

async function main() {
  const root = process.argv[2] ?? process.cwd();
  const since = process.env.SINCE ?? "12 months ago";
  const top = Number(process.env.TOP ?? 15);

  const repos = await findRepos(root);
  console.log(`Scanning ${repos.length} repos under ${root} (since ${since})\n`);

  const results = await scan(root, { since, top });

  results.forEach(({ repo, arc }, i) => {
    const span =
      date(arc.from) === date(arc.to)
        ? date(arc.from)
        : `${date(arc.from)} → ${date(arc.to)}`;
    console.log(`${String(i + 1).padStart(2)}. [${arc.score}] ${repo} · ${span}`);
    console.log(`    ${arc.title}`);
    console.log(
      `    signals: ${arc.signals.map((s) => `${s.name}(${s.weight.toFixed(2)})`).join(" ")}`,
    );
    if (arc.commits.length > 1) {
      for (const c of arc.commits) {
        console.log(`      · ${c.subject}`);
      }
    }
    console.log();
  });
}

// pathToFileURL, not string concatenation — on Windows argv[1] is a drive path
// and the hand-built `file://…` never matches import.meta.url's `file:///C:/…`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
