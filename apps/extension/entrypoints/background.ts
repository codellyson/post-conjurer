import { type Role, readStaged, writeStaged } from "../lib/types";

const ITEMS: { id: Role; title: string }[] = [
  { id: "exemplar", title: "Post Conjurer: post body" },
  { id: "author", title: "Post Conjurer: author" },
  { id: "engagement", title: "Post Conjurer: engagement numbers" },
];

// Runs inside the page via chrome.scripting.executeScript, so it is serialised
// with Function.prototype.toString() and may not reference anything outside its
// own body. Selection.toString() keeps the blank lines between paragraphs,
// which the post's rhythm depends on — info.selectionText flattens them.
function grabSelection(): { text: string; url: string; host: string } {
  const sel = window.getSelection();
  const text = (sel?.toString() ?? "").replace(/ /g, " ").trim();
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  return {
    text,
    url: canonical || location.href,
    host: location.hostname.replace(/^www\./, ""),
  };
}

function platformFor(host: string): string {
  if (/facebook\./.test(host)) return "Facebook";
  if (/(^|\.)x\.com|twitter\./.test(host)) return "X";
  if (/linkedin\./.test(host)) return "LinkedIn";
  if (/threads\./.test(host)) return "Threads";
  return host;
}

function badge(count: number): void {
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}

// WXT imports this module at build time to analyse it, so the listeners must
// be registered inside defineBackground rather than at the top level — bare
// addListener calls run against its fake browser and fail the build.
export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    for (const item of ITEMS) {
      chrome.contextMenus.create({ id: item.id, title: item.title, contexts: ["selection"] });
    }
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    const role = info.menuItemId as Role;
    if (!ITEMS.some((i) => i.id === role)) return;

    let grabbed: { text: string; url: string; host: string } | undefined;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabSelection,
      });
      grabbed = result?.result ?? undefined;
    } catch {
      // activeTab is not granted on chrome:// pages and the store; fall back to
      // the text Chrome already handed us rather than failing silently.
      grabbed = { text: info.selectionText ?? "", url: info.pageUrl ?? "", host: "" };
    }
    if (!grabbed?.text) return;

    const staged = await readStaged();
    const next = {
      ...staged,
      [role]: grabbed.text,
      url: staged.url || grabbed.url,
      platform: staged.platform || platformFor(grabbed.host),
      at: Date.now(),
    };
    await writeStaged(next);

    badge([next.exemplar, next.author, next.engagement].filter(Boolean).length);
  });
});
