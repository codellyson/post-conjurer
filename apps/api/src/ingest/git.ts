import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// Delimiters no commit message will realistically contain, so the format stays
// parseable even when bodies span many lines.
const REC = "REC";
const FLD = "FLD";

export interface FileChange {
  path: string;
  insertions: number;
  deletions: number;
}

export interface Commit {
  hash: string;
  at: number;
  subject: string;
  body: string;
  files: FileChange[];
  insertions: number;
  deletions: number;
  churn: number;
}

export interface Repo {
  name: string;
  path: string;
}

export async function findRepos(root: string): Promise<Repo[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, ".git")))
    .map((e) => ({ name: e.name, path: join(root, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readCommits(
  repoPath: string,
  opts: { since?: string; limit?: number } = {},
): Promise<Commit[]> {
  const args = [
    "log",
    // Merges carry no authored change of their own — they would cluster into
    // arcs and dilute every score with empty narrative.
    "--no-merges",
    "--numstat",
    `--format=${REC}%H${FLD}%at${FLD}%s${FLD}%b`,
  ];
  if (opts.since) args.push(`--since=${opts.since}`);
  if (opts.limit) args.push(`-n${opts.limit}`);

  let stdout: string;
  try {
    ({ stdout } = await run("git", args, {
      cwd: repoPath,
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch {
    return [];
  }

  return stdout
    .split(REC)
    .slice(1)
    .map(parseRecord)
    .filter((c): c is Commit => c !== null);
}

function parseRecord(record: string): Commit | null {
  const [hash, at, subject, rest] = record.split(FLD);
  if (!hash || !subject) return null;

  const files: FileChange[] = [];
  const bodyLines: string[] = [];
  for (const line of (rest ?? "").split("\n")) {
    const stat = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (stat) {
      files.push({
        path: stat[3],
        insertions: stat[1] === "-" ? 0 : Number(stat[1]),
        deletions: stat[2] === "-" ? 0 : Number(stat[2]),
      });
    } else if (line.trim()) {
      bodyLines.push(line);
    }
  }

  const insertions = files.reduce((n, f) => n + f.insertions, 0);
  const deletions = files.reduce((n, f) => n + f.deletions, 0);

  return {
    hash: hash.trim(),
    at: Number(at) * 1000,
    subject: subject.trim(),
    body: bodyLines.join("\n").trim(),
    files,
    insertions,
    deletions,
    churn: insertions + deletions,
  };
}
