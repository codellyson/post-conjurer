import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Post Conjurer Capture",
    description:
      "Right-click a post that performed well and send its structure to Post Conjurer.",
    // No content script and no bubble: capture is context-menu only, so this
    // never asks to read every page, and it cannot collide with Pullquote's
    // selection bubble on the same selection.
    permissions: ["activeTab", "scripting", "contextMenus", "storage"],
    // Match patterns cannot carry a port, so this covers whichever port the
    // local API runs on. It is the only host this extension can ever reach.
    host_permissions: ["http://localhost/*", "http://127.0.0.1/*"],
    action: {},
  },
});
