export type Appearance = "light" | "dark" | "system";

const KEY = "post-conjurer.appearance";

export function readAppearance(): Appearance {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "light";
}

export function applyAppearance(a: Appearance): void {
  const dark =
    a === "dark" ||
    (a === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function setAppearance(a: Appearance): void {
  localStorage.setItem(KEY, a);
  applyAppearance(a);
}

// Only "system" needs to react to the OS flipping; light and dark are pinned.
export function watchSystemAppearance(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readAppearance() === "system") applyAppearance("system");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
