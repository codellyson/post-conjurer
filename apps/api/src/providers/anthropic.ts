import Anthropic from "@anthropic-ai/sdk";
import type { Provider, Run, RunOpts } from "./types.js";
import { parseJson } from "./types.js";

// $/1M tokens, for the cost estimate the UI shows. Claude Opus 5 rates.
const IN = 5 / 1_000_000;
const OUT = 25 / 1_000_000;

export const anthropic: Provider = {
  id: "anthropic",
  label: "Claude (API key)",
  credential: "ANTHROPIC_API_KEY",

  available() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  defaultModel() {
    return process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
  },

  async runJson<T>(system: string, prompt: string, opts: RunOpts = {}): Promise<Run<T>> {
    const client = new Anthropic();
    const model = opts.model ?? this.defaultModel();

    const response = await client.messages.create(
      {
        model,
        // Thinking is on by default on Claude Opus 5 and shares this budget
        // with the response, so it is sized well above the JSON alone.
        max_tokens: 16000,
        system,
        output_config: { effort: (opts.effort ?? "medium") as "low" | "medium" | "high" },
        messages: [{ role: "user", content: prompt }],
      },
      { signal: opts.signal },
    );

    if (response.stop_reason === "refusal") {
      throw new Error(
        `Claude declined this request (${response.stop_details?.category ?? "unspecified"}).`,
      );
    }

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error(`Claude returned no text (stop_reason: ${response.stop_reason})`);
    }

    return {
      data: parseJson<T>(block.text, "anthropic"),
      costUsd:
        response.usage.input_tokens * IN + response.usage.output_tokens * OUT,
      model,
    };
  },
};
