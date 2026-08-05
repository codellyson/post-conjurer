import { runJson } from "../providers/index.js";
import type { StoredArc } from "./store.js";

export interface Verdict {
  key: string;
  postable: boolean;
  kind: "decision" | "pivot" | "removal" | "shipped" | "fix" | "cleanup" | "noise";
  angle: string;
  reason: string;
}

const KINDS = new Set([
  "decision", "pivot", "removal", "shipped", "fix", "cleanup", "noise",
]);

const SYSTEM = `You triage a developer's git history into candidate social posts.

You are given "arcs" — contiguous runs of commits on one theme — that a scoring
heuristic already shortlisted. The heuristic can measure size, deletion ratio
and file paths. It cannot tell a decision from housekeeping. That is your job.

Judge each arc on one question: is there a story here that a person who does
not write code would find interesting?

Postable arcs usually involve a choice with a reason behind it — something
removed that people were using, a direction reversed, a constraint that forced
an unusual approach, a problem solved in a way worth explaining.

Not postable: dependency bumps, dead-code deletion, finished migrations,
renames, config, formatting, generated files, and work whose only interest is
that it happened.

The "angle" is the post's premise in one sentence, aimed at a general audience
on Facebook — not a changelog line. Translate the change into what it means for
the person using the product. "fix: reject zero-total invoices" becomes "your
invoice can't accidentally go out for zero", not "I added validation". If an arc
is only interesting to developers, mark it not postable rather than dressing it
up.

Be selective. A short list of real stories beats a long list of maybes.

Reply with JSON only — no prose, no markdown fences. Shape:

{"verdicts":[{"key":"<copied exactly from the input>","postable":true,
"kind":"decision|pivot|removal|shipped|fix|cleanup|noise",
"angle":"one sentence","reason":"one sentence"}]}

Return exactly one verdict per arc given, with keys copied character for
character.`;

function render(arcs: StoredArc[]): string {
  return arcs
    .map((a) =>
      [
        `key: ${a.key}`,
        `  product: ${a.product}`,
        `  headline: ${a.title}`,
        `  signals: ${a.signals.map((s) => s.name).join(", ")}`,
        `  commits:`,
        ...a.commits.map((c) => `    - ${c.subject}`),
      ].join("\n"),
    )
    .join("\n\n");
}

export interface TriageResult {
  verdicts: Verdict[];
  costUsd: number;
}

export async function triage(
  arcs: StoredArc[],
  signal?: AbortSignal,
): Promise<TriageResult> {
  if (arcs.length === 0) return { verdicts: [], costUsd: 0 };

  const { data, costUsd } = await runJson<{ verdicts?: unknown }>(
    SYSTEM,
    render(arcs),
    { signal },
  );

  if (!Array.isArray(data.verdicts)) {
    throw new Error("triage output had no `verdicts` array");
  }

  const known = new Set(arcs.map((a) => a.key));
  const verdicts = data.verdicts.filter(
    (v): v is Verdict =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as Verdict).key === "string" &&
      // A hallucinated or mangled key would silently update nothing, so drop it
      // here where it can be counted rather than in the UPDATE.
      known.has((v as Verdict).key) &&
      typeof (v as Verdict).postable === "boolean" &&
      KINDS.has((v as Verdict).kind) &&
      typeof (v as Verdict).angle === "string" &&
      typeof (v as Verdict).reason === "string",
  );

  return { verdicts, costUsd };
}
