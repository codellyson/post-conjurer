# Post Conjurer — agent notes

A local-first Tauri desktop app in the "just" style: calm, tokenized, own-your-data.

## Stack contracts

- **One shell.** React + Vite UI in `apps/web`, Rust backend in `src-tauri`,
  talking over Tauri `invoke()`. The base app has no HTTP layer.
- **Design system is `@codellyson/justui` — no hardcoded colors.** Every color
  is a semantic token (`bg-bg`, `text-primary`, `text-accent`, `text-danger`).
  Never write a hex value in a component. Themes are applied by `bootTheme()`
  in `apps/web/src/main.tsx` and switched via the `ThemeToggle`.
- **Secrets live in the OS keychain** (`store_secret`/`get_secret`/`delete_secret`
  in `src-tauri/src/lib.rs`), one entry per key, missing key → `None`. Nothing
  sensitive touches `localStorage` or disk.
- **Errors are structured and plain-English.** Rust commands return
  `Result<T, CommandError>`; `CommandError` is a serde-tagged union mirrored in
  `apps/web/src/lib/commands.ts`. Branch on `kind`, never on message text.

## Sharp edges

- The justui Tailwind preset needs its `dist/**/*.js` in the content globs
  (`apps/web/tailwind.config.cjs`) or `ThemeToggle`/`Button` ship unstyled.
- `apps/web` runs on a fixed strict port (3030) — Tauri points its webview there.
- `isTauri` (`apps/web/src/lib/runtime.ts`) is the only surface check. Keep the
  set of files that read it small; everything else goes through `commands.ts`.
- Long Windows build paths can fail Rust linking (`LNK1104`). Set
  `CARGO_TARGET_DIR` to something short.

## Workflow

```sh
pnpm install
pnpm tauri:dev       # desktop, hot reload
pnpm dev             # browser-only web surface
pnpm -r build        # typecheck + build every package
```
