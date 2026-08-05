/**
 * Three roles, mirroring Pullquote's capture-by-pointing model. Page metadata
 * is useless on Facebook and X, so each part of an exemplar is captured by
 * highlighting it and saying what it is.
 */
export type Role = "exemplar" | "author" | "engagement";

export interface Staged {
  exemplar: string;
  author: string;
  /** What the post actually earned — the thing that makes it worth learning from. */
  engagement: string;
  url: string;
  platform: string;
  at: number;
}

export const EMPTY: Staged = {
  exemplar: "",
  author: "",
  engagement: "",
  url: "",
  platform: "",
  at: 0,
};

export const STAGED_KEY = "staged";

export async function readStaged(): Promise<Staged> {
  const got = await chrome.storage.session.get(STAGED_KEY);
  return { ...EMPTY, ...(got[STAGED_KEY] as Partial<Staged> | undefined) };
}

export async function writeStaged(next: Staged): Promise<void> {
  await chrome.storage.session.set({ [STAGED_KEY]: next });
}

export async function readApiUrl(): Promise<string> {
  const got = await chrome.storage.local.get("apiUrl");
  return (got.apiUrl as string | undefined) || "http://localhost:8787";
}
