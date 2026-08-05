import { GoogleGenAI } from "@google/genai";
import type { Provider, Run, RunOpts } from "./types.js";
import { parseJson } from "./types.js";

export const google: Provider = {
  id: "google",
  label: "Gemini (Google)",
  credential: "GOOGLE_API_KEY",

  available() {
    return !!(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY);
  },

  // As with OpenAI: set GOOGLE_MODEL rather than trusting this default, which
  // is a starting point rather than a verified current model id.
  defaultModel() {
    return process.env.GOOGLE_MODEL ?? "gemini-2.5-pro";
  },

  async runJson<T>(system: string, prompt: string, opts: RunOpts = {}): Promise<Run<T>> {
    const client = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
    });
    const model = opts.model ?? this.defaultModel();

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        abortSignal: opts.signal,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned no text");

    return { data: parseJson<T>(text, "google"), costUsd: 0, model };
  },
};
