import { runJson } from "../providers/index.js";
import type { PatternStructure } from "./patterns.js";
import type { StoredArc } from "./store.js";
import type { StoredProduct } from "./store.js";

export interface Draft {
  text: string;
  note: string;
}

const SYSTEM = `You write a social post about something a developer built.

You are given: the product it concerns, the angle (the post's premise, already
decided), the commits behind it as raw evidence, and a structural pattern
harvested from an unrelated post that performed well.

Apply the pattern's *method* — its hook type, rhythm, turn, and close — to this
subject. The pattern is a shape, not a template: never reproduce wording from
it, and never mention it.

Hard rules:

- Write for people who do not code. No commit subjects, no file names, no
  jargon, no framework names unless the whole point depends on one.
- The angle is fixed. Do not swap it for a different premise.
- Use only facts present in the input. Invent nothing: no user counts, revenue,
  or testimonials, and — the easy one to slip on — no invented people, customers,
  conversations, messages, or scenes. Writing "someone in Lagos tried to pay me
  last month" when no such moment appears in the dossier is a fabrication even
  though it sounds harmless, and the reader will take it as true.
- The only concrete anecdotes available to you are the ones listed under
  "moments". If that section is absent, write about the decision itself and the
  reasoning behind it. A post with no anecdote is fine; an invented one is not.
- First person, the builder's own voice.
- No hashtags unless the pattern's close calls for them. No emoji unless the
  pattern's voice calls for them.
- Match the pattern's length within roughly 30%.

Produce 3 drafts that differ meaningfully — not three rewordings of one opening.
Vary which detail leads.

Reply with JSON only — no prose, no markdown fences:

{"drafts":[{"text":"the full post, newlines as \\n","note":"what this draft leads with, 6 words or fewer"}]}`;

function dossier(p: StoredProduct): string {
  const lines = [
    `product: ${p.name}`,
    p.what_it_does ? `what it does: ${p.what_it_does}` : null,
    p.audience ? `who it's for: ${p.audience}` : null,
    p.moments ? `moments:\n${p.moments}` : null,
  ].filter(Boolean);

  // An empty dossier is the single biggest cause of build-log-flavoured output,
  // so say so in-band rather than letting the model quietly fill the gap.
  if (lines.length === 1) {
    lines.push(
      "(no dossier yet — keep the post close to the angle and do not invent detail)",
    );
  }
  return lines.join("\n");
}

export interface Generation {
  drafts: Draft[];
  costUsd: number;
}

export async function generate(
  product: StoredProduct,
  arc: StoredArc,
  pattern: PatternStructure,
  signal?: AbortSignal,
): Promise<Generation> {
  const prompt = [
    dossier(product),
    "",
    `angle: ${arc.angle ?? arc.title}`,
    "",
    "evidence (raw commits — background only, never quote these):",
    ...arc.commits.map((c) => `  - ${c.subject}`),
    "",
    "pattern to apply:",
    `  hook: ${pattern.hook}`,
    `  opening move: ${pattern.opening_move}`,
    `  shape: ${pattern.shape}`,
    `  tension: ${pattern.tension}`,
    `  close: ${pattern.close}`,
    `  voice: ${pattern.voice}`,
    `  target length: ~${pattern.length_words} words`,
  ].join("\n");

  const { data, costUsd } = await runJson<{ drafts?: unknown }>(SYSTEM, prompt, {
    effort: "medium",
    signal,
  });

  if (!Array.isArray(data.drafts)) throw new Error("output had no `drafts` array");

  const drafts = data.drafts.filter(
    (d): d is Draft =>
      typeof d === "object" &&
      d !== null &&
      typeof (d as Draft).text === "string" &&
      (d as Draft).text.trim().length > 0,
  );

  if (drafts.length === 0) throw new Error("no usable drafts came back");
  return { drafts, costUsd };
}
