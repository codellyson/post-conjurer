import { runJson } from "../providers/index.js";

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

const FIELDS: (keyof PatternStructure)[] = [
  "name", "hook", "opening_move", "shape", "tension", "close", "voice",
  "length_words", "works_because",
];

// The hard rule here is not stylistic — it is the whole design. Storing the
// exemplar's phrasing would produce derivative posts and, at scale, plagiarism.
// Structure is the part that legitimately transfers between subjects.
const SYSTEM = `You reverse-engineer the *method* behind a social post that earned
unusual engagement, so that method can be reapplied to a completely different
subject.

Extract structure, never content. You are describing how the post is built —
the shape of its argument and rhythm — not what it says. Someone reading your
output must not be able to reconstruct the original. Specifically:

- Do NOT copy phrases, sentences, or distinctive wording from the post.
- Do NOT reference the post's actual subject matter, names, products or numbers.
- DO describe the moves in the abstract: what the first line does to the reader,
  how attention is held, how it ends.

Think about: what the opening line risks or promises; whether it opens on a
number, a confession, a contradiction, a scene, or a question; how long the
paragraphs run and how that rhythm changes; where the turn happens; whether it
resolves or deliberately leaves something open; how direct the ask is at the end.

Reply with JSON only — no prose, no markdown fences:

{"name":"short memorable label for this method, 2-4 words",
"hook":"the kind of hook, in the abstract",
"opening_move":"what the first 1-2 lines do to the reader",
"shape":"paragraph rhythm and length pattern",
"tension":"how attention is held through the middle",
"close":"how it ends and how hard the ask is",
"voice":"person, tone, formality, distance from the reader",
"length_words":<approximate word count of the original, as a number>,
"works_because":"one sentence on why this method earns engagement"}`;

export interface Harvest {
  structure: PatternStructure;
  costUsd: number;
}

export async function harvest(
  exemplar: string,
  meta: { author?: string; engagement?: string; platform?: string } = {},
  signal?: AbortSignal,
): Promise<Harvest> {
  const context = [
    meta.platform ? `platform: ${meta.platform}` : null,
    meta.author ? `author: ${meta.author}` : null,
    meta.engagement ? `engagement: ${meta.engagement}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `${context ? `${context}\n\n` : ""}post:\n"""\n${exemplar}\n"""`;

  const { data, costUsd } = await runJson<PatternStructure>(SYSTEM, prompt, {
    signal,
  });

  const missing = FIELDS.filter((f) => data[f] === undefined || data[f] === null);
  if (missing.length) {
    throw new Error(`pattern was missing fields: ${missing.join(", ")}`);
  }

  return { structure: { ...data, length_words: Number(data.length_words) }, costUsd };
}
