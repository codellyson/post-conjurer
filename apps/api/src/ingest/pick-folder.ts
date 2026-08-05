import { execFile } from "node:child_process";
import { platform } from "node:os";

// The API is the only part of this app that runs outside the browser sandbox,
// so it is the only part that can open a real folder chooser. The browser's
// showDirectoryPicker() hands back a handle whose `name` is the folder's own
// name — never an absolute path — which is useless to git.
//
// This also covers the desktop build: the Tauri webview talks to this same
// local API, so one implementation serves both surfaces.

// The dialog is modal and waits on a human, so the timeout is generous. It
// exists only so a dismissed-but-orphaned dialog can't wedge the process.
const TIMEOUT_MS = 5 * 60_000;
const PROMPT = "Choose the folder that holds your projects";

interface Picker {
  cmd: string;
  args: string[];
}

function pickerFor(os: string): Picker | null {
  if (os === "win32") {
    // -STA is required: the shell's folder browser is a COM apartment-threaded
    // control and returns nothing from PowerShell's default MTA.
    return {
      cmd: "powershell.exe",
      args: [
        "-NoProfile",
        "-STA",
        "-Command",
        `$f = (New-Object -ComObject Shell.Application).BrowseForFolder(0, '${PROMPT}', 0); if ($f) { $f.Self.Path }`,
      ],
    };
  }
  if (os === "darwin") {
    return {
      cmd: "osascript",
      args: ["-e", `POSIX path of (choose folder with prompt "${PROMPT}")`],
    };
  }
  if (os === "linux") {
    return {
      cmd: "zenity",
      args: ["--file-selection", "--directory", `--title=${PROMPT}`],
    };
  }
  return null;
}

export type PickResult =
  | { ok: true; path: string }
  | { ok: false; reason: "cancelled" | "unavailable" };

export function pickFolder(): Promise<PickResult> {
  const picker = pickerFor(platform());
  if (!picker) return Promise.resolve({ ok: false, reason: "unavailable" });

  return new Promise((resolve) => {
    execFile(picker.cmd, picker.args, { timeout: TIMEOUT_MS }, (error, stdout) => {
      const path = stdout.trim();
      // Every one of these tools exits non-zero when the user cancels, so a
      // failure with no path is a cancellation, not a broken picker.
      if (error && !path) {
        const missing =
          (error as NodeJS.ErrnoException).code === "ENOENT" ||
          /not recognized|command not found/i.test(error.message);
        resolve({ ok: false, reason: missing ? "unavailable" : "cancelled" });
        return;
      }
      if (!path) {
        resolve({ ok: false, reason: "cancelled" });
        return;
      }
      resolve({ ok: true, path: path.replace(/\\/g, "/").replace(/\/+$/, "") });
    });
  });
}
