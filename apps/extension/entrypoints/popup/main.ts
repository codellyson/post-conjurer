import { EMPTY, readApiUrl, readStaged, writeStaged } from "../../lib/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const exemplar = $<HTMLTextAreaElement>("exemplar");
const author = $<HTMLInputElement>("author");
const engagement = $<HTMLInputElement>("engagement");
const apiUrl = $<HTMLInputElement>("apiUrl");
const platform = $<HTMLSpanElement>("platform");
const status = $<HTMLSpanElement>("status");
const send = $<HTMLButtonElement>("send");
const clear = $<HTMLButtonElement>("clear");

let currentPlatform = "";

async function load() {
  const staged = await readStaged();
  exemplar.value = staged.exemplar;
  author.value = staged.author;
  engagement.value = staged.engagement;
  currentPlatform = staged.platform;
  platform.textContent = staged.platform;
  apiUrl.value = await readApiUrl();
  refresh();
}

function refresh() {
  send.disabled = exemplar.value.trim().length < 40;
}

// Edits in the popup are the source of truth once made — the popup closes on
// every click elsewhere, so nothing is kept in memory between openings.
async function persist() {
  await writeStaged({
    ...EMPTY,
    exemplar: exemplar.value,
    author: author.value,
    engagement: engagement.value,
    platform: currentPlatform,
    at: Date.now(),
  });
}

for (const el of [exemplar, author, engagement]) {
  el.addEventListener("input", () => {
    refresh();
    void persist();
  });
}

apiUrl.addEventListener("change", () => {
  void chrome.storage.local.set({ apiUrl: apiUrl.value.replace(/\/$/, "") });
});

send.addEventListener("click", async () => {
  send.disabled = true;
  status.textContent = "Reading structure…";
  try {
    const res = await fetch(`${apiUrl.value.replace(/\/$/, "")}/api/patterns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: exemplar.value,
        author: author.value || undefined,
        engagement: engagement.value || undefined,
        platform: currentPlatform || undefined,
      }),
    });
    const body = (await res.json().catch(() => null)) as
      | { structure?: { name?: string }; message?: string }
      | null;
    if (!res.ok) throw new Error(body?.message ?? `Failed (${res.status})`);

    status.textContent = `Harvested "${body?.structure?.name ?? "pattern"}"`;
    await writeStaged(EMPTY);
    chrome.action.setBadgeText({ text: "" });
    exemplar.value = "";
    author.value = "";
    engagement.value = "";
  } catch (e) {
    // A dead API is the common case here, and "Failed to fetch" alone sends
    // people hunting through the extension rather than starting the server.
    const msg = e instanceof Error ? e.message : String(e);
    status.textContent = /fetch/i.test(msg) ? "No API — is `pnpm dev:api` running?" : msg;
  } finally {
    refresh();
  }
});

clear.addEventListener("click", async () => {
  await writeStaged(EMPTY);
  chrome.action.setBadgeText({ text: "" });
  exemplar.value = "";
  author.value = "";
  engagement.value = "";
  status.textContent = "";
  refresh();
});

void load();
