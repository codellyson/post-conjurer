export interface Run<T> {
  data: T;
  costUsd: number;
  model: string;
}

export interface RunOpts {
  effort?: string;
  signal?: AbortSignal;
  model?: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** How this provider authenticates, for the UI to explain what's missing. */
  credential: string;
  /** False when the key/binary isn't present — the UI greys it out. */
  available(): boolean;
  defaultModel(): string;
  runJson<T>(system: string, prompt: string, opts?: RunOpts): Promise<Run<T>>;
}

export type ProviderId = "claude-cli" | "anthropic" | "openai" | "google";

// Every provider is asked for bare JSON. Some support a native JSON mode and
// some only take the instruction, so all output goes through this on the way
// back rather than trusting any of them to skip the fence.
export function unfence(text: string): string {
  const fenced = /^\s*```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/.exec(text);
  return (fenced ? fenced[1] : text).trim();
}

export function parseJson<T>(text: string, provider: string): T {
  try {
    return JSON.parse(unfence(text)) as T;
  } catch {
    throw new Error(`${provider} did not return JSON: ${text.slice(0, 300)}`);
  }
}
