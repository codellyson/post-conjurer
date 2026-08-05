import { isTauri } from "./runtime";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

// The entire surface difference, in one place: the desktop app authenticates
// with a bearer token from the OS keychain; the browser relies on the API's own
// cookie. UI code calls apiFetch and never has to know which surface it is on.
async function bearer(): Promise<string | null> {
  if (!isTauri) return null;
  const { getSecret } = await import("./commands");
  return getSecret("bearer");
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await bearer();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    // Cookies in the browser; bearer tokens in Tauri. Don't mix.
    credentials: isTauri ? "omit" : "include",
  });
}
