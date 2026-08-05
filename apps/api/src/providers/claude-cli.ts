import { spawn, spawnSync } from "node:child_process";
import type { Provider, Run, RunOpts } from "./types.js";
import { parseJson } from "./types.js";

interface Envelope {
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
}

function bin(): string {
  return process.env.CLAUDE_BIN ?? "claude";
}

let cached: boolean | null = null;

export const claudeCli: Provider = {
  id: "claude-cli",
  label: "Claude Code (CLI)",
  credential: "None — uses your existing Claude Code login",

  available() {
    if (cached !== null) return cached;
    const r = spawnSync(bin(), ["--version"], { timeout: 20000, windowsHide: true });
    cached = r.status === 0;
    return cached;
  },

  defaultModel() {
    return process.env.CONJURER_MODEL ?? "opus";
  },

  runJson<T>(system: string, prompt: string, opts: RunOpts = {}): Promise<Run<T>> {
    const model = opts.model ?? this.defaultModel();
    const args = [
      "-p",
      "--output-format", "json",
      "--model", model,
      "--effort", opts.effort ?? "medium",
      // Replacing the default system prompt rather than appending to it is what
      // makes this cheap: the default drags the whole Claude Code harness
      // (tools, skills, CLAUDE.md) into every call — measured ~13x the cost.
      "--system-prompt", system,
      "--disable-slash-commands",
      "--disallowedTools",
      "Bash Edit Write Read Glob Grep WebFetch WebSearch Task NotebookEdit",
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(bin(), args, { signal: opts.signal, windowsHide: true });
      let out = "";
      let err = "";

      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", (e) =>
        reject(
          new Error(
            `Could not run "${bin()}". Is Claude Code installed and on PATH? (${e.message})`,
          ),
        ),
      );
      child.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`claude exited ${code}: ${err.trim() || out.trim()}`));
        }
        let envelope: Envelope;
        try {
          envelope = JSON.parse(out) as Envelope;
        } catch {
          return reject(new Error(`claude returned a non-JSON envelope: ${out.slice(0, 300)}`));
        }
        if (envelope.is_error) {
          return reject(new Error(`claude reported an error: ${envelope.result ?? "no detail"}`));
        }
        try {
          resolve({
            data: parseJson<T>(envelope.result ?? "", "claude-cli"),
            costUsd: envelope.total_cost_usd ?? 0,
            model,
          });
        } catch (e) {
          reject(e);
        }
      });

      child.stdin.end(prompt);
    });
  },
};
