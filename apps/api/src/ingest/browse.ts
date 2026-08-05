import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface BrowseEntry {
  name: string;
  path: string;
  /** This folder is itself a git repo. */
  isRepo: boolean;
  /** How many of its immediate children are repos. */
  repos: number;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  home: string;
  entries: BrowseEntry[];
}

// Folders that are never the answer and are expensive to walk.
const SKIP = new Set(["node_modules", "vendor", "target", "dist", "build", "Library"]);

// A parent folder's repo count needs one readdir per child. That is fine for a
// projects directory and ruinous for `/`, so the fan-out is bounded — past
// this, entries still list, they just don't advertise a count.
const COUNT_LIMIT = 60;

function normalise(p: string): string {
  return p.replace(/\\/g, "/").replace(/(?!^)\/+$/, "");
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function isRepo(p: string): Promise<boolean> {
  try {
    // A worktree or submodule has .git as a file, not a directory.
    await stat(join(p, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function subdirs(p: string): Promise<string[]> {
  const items = await readdir(p, { withFileTypes: true });
  return items
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP.has(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function browse(input?: string): Promise<BrowseResult> {
  const home = normalise(homedir());
  const target = resolve(input && input.trim() ? input : home);

  if (!(await isDir(target))) {
    throw Object.assign(new Error(`Not a folder: ${target}`), { status: 400 });
  }

  const names = await subdirs(target);
  const countable = names.length <= COUNT_LIMIT;

  const entries = await Promise.all(
    names.map(async (name): Promise<BrowseEntry> => {
      const path = normalise(join(target, name));
      const repo = await isRepo(path);
      let repos = 0;
      // A repo's own children are its source, not more projects — don't recurse.
      if (!repo && countable) {
        try {
          const kids = await subdirs(path);
          const flags = await Promise.all(kids.map((k) => isRepo(join(path, k))));
          repos = flags.filter(Boolean).length;
        } catch {
          repos = 0;
        }
      }
      return { name, path, isRepo: repo, repos };
    }),
  );

  const up = normalise(dirname(target));
  const here = normalise(target);

  return { path: here, parent: up === here ? null : up, home, entries };
}
