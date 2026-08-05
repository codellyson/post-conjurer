# Post Conjurer

A tauri project.

A local-first desktop app. Your data stays on your machine — secrets go to the
OS keychain, nothing is sent to a server you don't run.

## Stack

- **Tauri 2** desktop shell over a **Rust** backend, over `invoke()` — no HTTP layer.
- **React 19 + Vite**, styled with [`@codellyson/justui`](https://www.npmjs.com/package/@codellyson/justui): six themes, light + dark, 13px density. Semantic tokens only — no hardcoded colors.
- **OS keychain** for secrets; structured, plain-English errors across the IPC boundary.

## Prerequisites

Node 20+, pnpm, and the Rust toolchain plus your platform's webview deps — see
[tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

## Develop

```sh
pnpm install
pnpm tauri:dev      # desktop app, hot reload
pnpm dev            # just the web surface, in a browser (invoke() calls no-op)
```

## Build

```sh
pnpm tauri:build    # native installer
```

## Layout

```text
apps/web/      React UI (justui). Talks to Rust through src/lib/commands.ts.
src-tauri/     Rust backend: keychain, commands, the CommandError boundary.
```

## Adding a command

1. Write a `#[tauri::command]` in `src-tauri/src/lib.rs` returning `CommandResult<T>`.
2. Register it in `generate_handler![]`.
3. Add a typed wrapper in `apps/web/src/lib/commands.ts`.

Errors cross as a tagged union (`{ kind, message }`) — branch on `kind`, never on
message text. Keep the Rust enum and the TS interface in sync; nothing enforces it.

## Icons

`src-tauri/icons/` ships a placeholder set. Replace with your own and list them in
`bundle.icon` in `src-tauri/tauri.conf.json`.
