import OpenAI from "openai";
import type { Provider, Run, RunOpts } from "./types.js";
import { parseJson } from "./types.js";

export const openai: Provider = {
  id: "openai",
  label: "ChatGPT (OpenAI)",
  credential: "OPENAI_API_KEY",

  available() {
    return !!process.env.OPENAI_API_KEY;
  },

  // Not hard-coded to a model I'd be guessing at — set OPENAI_MODEL to whatever
  // is current on your account. The default is a starting point, not a claim.
  defaultModel() {
    return process.env.OPENAI_MODEL ?? "gpt-5";
  },

  async runJson<T>(system: string, prompt: string, opts: RunOpts = {}): Promise<Run<T>> {
    const client = new OpenAI();
    const model = opts.model ?? this.defaultModel();

    const response = await client.chat.completions.create(
      {
        model,
        // Native JSON mode; the unfence in parseJson stays as a safety net.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      },
      { signal: opts.signal },
    );

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error(
        `OpenAI returned no content (finish_reason: ${response.choices[0]?.finish_reason})`,
      );
    }

    return {
      data: parseJson<T>(text, "openai"),
      // Rates vary by model, so this is left to the provider's own dashboard
      // rather than reported as a number that could be wrong.
      costUsd: 0,
      model,
    };
  },
};
