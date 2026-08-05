// The one seam between surfaces. `__TAURI_INTERNALS__` is injected only into
// the desktop webview, so this is how the shared UI knows which surface it is
// running on. Keep the count of files that read this to a minimum — everything
// else should go through a facade (commands.ts, and the api client if enabled).
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
