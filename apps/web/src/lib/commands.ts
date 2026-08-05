import { invoke } from "@tauri-apps/api/core";

// Mirrors the serde-tagged `CommandError` in src-tauri/src/lib.rs. The Rust
// side sends `{ kind, message }`; branch on `kind`, never on the message text.
export interface CommandError {
  kind: "invalid_input" | "not_found" | "internal";
  message: string;
}

export function isCommandError(value: unknown): value is CommandError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value
  );
}

// Turn any thrown command failure into a single line a user can act on —
// never surface a raw transport error. This is the "self-diagnosing" half of
// the DNA on the UI side; the Rust side supplies the plain-English message.
export function errorHint(error: unknown): string {
  if (isCommandError(error)) {
    switch (error.kind) {
      case "invalid_input":
        return `Check your input — ${error.message}`;
      case "not_found":
        return error.message;
      case "internal":
        return `Something went wrong: ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

export interface AppInfo {
  name: string;
  version: string;
}

export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}

export function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}

// Own-your-data: secrets go to the OS keychain, never localStorage or a file.
export function storeSecret(key: string, value: string): Promise<void> {
  return invoke<void>("store_secret", { key, value });
}

export function getSecret(key: string): Promise<string | null> {
  return invoke<string | null>("get_secret", { key });
}

export function deleteSecret(key: string): Promise<void> {
  return invoke<void>("delete_secret", { key });
}
