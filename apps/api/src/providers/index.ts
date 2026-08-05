import { getDb } from "../db.js";
import { anthropic } from "./anthropic.js";
import { claudeCli } from "./claude-cli.js";
import { google } from "./google.js";
import { openai } from "./openai.js";
import type { Provider, ProviderId, Run, RunOpts } from "./types.js";

// Order is the UI's order and the fallback order. The CLI leads because it is
// the only one that needs no key.
export const PROVIDERS: Provider[] = [claudeCli, anthropic, openai, google];

export function getProvider(id: string): Provider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

function readSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM setting WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function writeSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO setting (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

/** The provider to use: the chosen one if it is usable, else the first that is. */
export function activeProvider(): Provider {
  const chosen = readSetting("provider");
  const picked = chosen ? getProvider(chosen) : null;
  if (picked?.available()) return picked;

  const fallback = PROVIDERS.find((p) => p.available());
  if (!fallback) {
    throw new Error(
      "No AI provider is configured. Install Claude Code, or set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY.",
    );
  }
  return fallback;
}

export function activeModel(provider: Provider): string {
  return readSetting(`model:${provider.id}`) || provider.defaultModel();
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  credential: string;
  available: boolean;
  model: string;
  active: boolean;
}

export function providerStatuses(): ProviderStatus[] {
  let active: string | null = null;
  try {
    active = activeProvider().id;
  } catch {
    active = null;
  }
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    credential: p.credential,
    available: p.available(),
    model: activeModel(p),
    active: p.id === active,
  }));
}

/** Every call site goes through this, so provider choice is one setting. */
export async function runJson<T>(
  system: string,
  prompt: string,
  opts: RunOpts = {},
): Promise<Run<T>> {
  const provider = activeProvider();
  return provider.runJson<T>(system, prompt, {
    ...opts,
    model: opts.model ?? activeModel(provider),
  });
}

export type { Provider, ProviderId, Run, RunOpts };
