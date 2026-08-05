#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.POST_CONJURER_API_URL ?? "http://localhost:8787";
const TOKEN = process.env.POST_CONJURER_TOKEN ?? "";

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

// Never surface a raw fetch failure — rewrite it into something actionable.
async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (TOKEN) headers.set("Authorization", `Bearer ${TOKEN}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Could not reach the API at ${API_URL}. Start it with "pnpm dev:api".`);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `API returned ${res.status}.`);
  }
  return res.json();
}

const server = new McpServer({ name: "post-conjurer", version: "0.1.0" });

server.registerTool(
  "list_items",
  { description: "List the saved items.", inputSchema: {} },
  async () => {
    const data = (await call("/api/items")) as { items: unknown[] };
    return text(JSON.stringify(data.items, null, 2));
  },
);

server.registerTool(
  "add_item",
  { description: "Add an item.", inputSchema: { text: z.string().min(1) } },
  async ({ text: value }) => {
    const item = (await call("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    })) as { id: number };
    return text(`Added item #${item.id}.`);
  },
);

await server.connect(new StdioServerTransport());
