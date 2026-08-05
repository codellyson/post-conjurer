import { isTauri } from "./runtime";

/**
 * Hand a URL to the user's real browser.
 *
 * `window.open` is a no-op inside the Tauri webview, so the desktop surface
 * routes through the opener plugin instead. Returns false when the composer
 * could not be opened at all — a popup blocker, a URL outside the capability's
 * allow-list — so callers can say so rather than appear to do nothing.
 */
export async function openExternal(url: string): Promise<boolean> {
  if (isTauri) {
    try {
      // Imported lazily so the browser bundle never pulls in desktop-only code.
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return true;
    } catch {
      return false;
    }
  }
  return window.open(url, "_blank", "noopener,noreferrer") !== null;
}
