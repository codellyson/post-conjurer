import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Own-your-data: the database is a plain file under your home directory. Back
// it up, move it, or delete it — it is yours, not a row in someone's cloud.
let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const dir = process.env.DATA_DIR ?? join(homedir(), ".post-conjurer");
  mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(join(dir, "data.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      repo_path TEXT,
      what_it_does TEXT,
      audience TEXT,
      -- First paying user, a screenshot, something someone said. None of this
      -- exists in a codebase, and it is what makes a post land.
      moments TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES product(id),
      -- Commit hashes joined. Makes re-scanning idempotent, and collapses arcs
      -- that surface from several repos sharing history.
      key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      from_at INTEGER NOT NULL,
      to_at INTEGER NOT NULL,
      score REAL NOT NULL,
      signals TEXT NOT NULL,
      commits TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'candidate',
      kind TEXT,
      angle TEXT,
      reason TEXT,
      triaged_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS arc_by_status ON arc(status, score DESC);

    CREATE TABLE IF NOT EXISTS pattern (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT,
      author TEXT,
      engagement TEXT,
      -- Kept for provenance and re-extraction only. It is never sent to the
      -- generator: posts are built from the structure column, so nothing can
      -- leak the exemplar's wording into your output.
      source_text TEXT NOT NULL,
      structure TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draft (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arc_id INTEGER NOT NULL REFERENCES arc(id),
      pattern_id INTEGER NOT NULL REFERENCES pattern(id),
      text TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS draft_by_arc ON draft(arc_id, created_at DESC);

    -- Provider choice and per-provider model. API keys are deliberately NOT
    -- here: they come from the environment (or, on desktop, the OS keychain),
    -- so a copy of data.db never carries a credential.
    CREATE TABLE IF NOT EXISTS setting (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // CREATE TABLE IF NOT EXISTS won't add a column to a table that already
  // exists, so new columns need an explicit guarded ALTER.
  addColumn(db, "draft", "status", "TEXT NOT NULL DEFAULT 'new'");

  return db;
}

function addColumn(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
