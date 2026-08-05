import { Dialog, DialogContent, DialogTitle } from "@codellyson/justui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IconProps } from "@/components/icons";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "@/components/icons";
import { Btn } from "@/components/ui";
import type { BrowseEntry, BrowseResult } from "@/lib/conjurer";
import { browseFolder, pickFolder } from "@/lib/conjurer";

// Keycaps, so the keys read as keys rather than as arrows floating in a
// sentence. Each pairing stays on one line.
function Hint({
  icons,
  also,
  children,
}: {
  icons: React.ComponentType<IconProps>[];
  also?: string;
  children: React.ReactNode;
}) {
  const cap: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    padding: "0 5px",
    borderRadius: 4,
    border: "1px solid var(--field-border)",
    background: "var(--field)",
    color: "var(--ink-4)",
    fontSize: 11,
  };
  return (
    <span className="flex items-center" style={{ gap: 6, whiteSpace: "nowrap" }}>
      {icons.map((Icon, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} style={cap}>
          <Icon size={10} />
        </span>
      ))}
      {also ? <span style={cap}>{also}</span> : null}
      <span>{children}</span>
    </span>
  );
}

// The native dialog can show a tree; it can't show which of those folders are
// actually repos. That is the only question being asked on this screen, so the
// list answers it directly.
function Marker({ entry }: { entry: BrowseEntry }) {
  if (entry.isRepo) {
    return (
      <span
        className="flex items-center"
        style={{ gap: 7, fontSize: 12.5, color: "var(--ink-6)" }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-7)" }}
        />
        a repo itself
      </span>
    );
  }
  if (entry.repos > 0) {
    return (
      <span
        className="flex items-center"
        style={{ gap: 7, fontSize: 12.5, color: "var(--c-accent)" }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-accent)" }}
        />
        {entry.repos} repo{entry.repos === 1 ? "" : "s"} inside
      </span>
    );
  }
  return null;
}

export function FolderBrowser({
  open,
  initialPath,
  onClose,
  onChoose,
}: {
  open: boolean;
  /** Where to land. Defaults to the home directory. */
  initialPath?: string;
  onClose: () => void;
  onChoose: (path: string) => void;
}) {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (path?: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await browseFolder(path);
      setData(r);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load(initialPath);
  }, [open, initialPath, load]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const entries = data?.entries ?? [];

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(entries.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && entries[active]) {
      e.preventDefault();
      void load(entries[active].path);
    } else if ((e.key === "Backspace" || e.key === "ArrowLeft") && data?.parent) {
      e.preventDefault();
      void load(data.parent);
    } else if (e.key === "ArrowRight" && entries[active]) {
      e.preventDefault();
      void load(entries[active].path);
    }
  }

  async function native() {
    const r = await pickFolder();
    if (r.path) onChoose(r.path);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-folder-browser
        style={{
          width: 620,
          maxWidth: "none",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: "34px 40px",
          borderRadius: 8,
          background: "var(--paper)",
          borderColor: "var(--field-border)",
        }}
      >
        <div className="flex flex-col" style={{ gap: 6 }}>
          <DialogTitle asChild>
            <div className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
              Where are your projects?
            </div>
          </DialogTitle>
          <div style={{ fontSize: 14, color: "var(--ink-5)" }}>
            Pick the folder that <em>holds</em> your repos, not a repo itself.
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 8 }}>
          <Btn
            disabled={!data?.parent || loading}
            onClick={() => data?.parent && load(data.parent)}
            style={{ padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <ArrowUp size={13} />
            Up
          </Btn>
          <div
            title={data?.path}
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-3)",
              background: "var(--field)",
              border: "1px solid var(--field-border)",
              borderRadius: 5,
              padding: "9px 12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              direction: "rtl",
              textAlign: "left",
            }}
          >
            {data?.path ?? "…"}
          </div>
        </div>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Folders"
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{
            height: 300,
            overflowY: "auto",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
          }}
        >
          {loading ? (
            <div style={{ padding: 20, fontSize: 14, color: "var(--ink-6)" }}>Reading…</div>
          ) : error ? (
            <div style={{ padding: 20, fontSize: 14, color: "rgb(var(--danger))" }}>{error}</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 20, fontSize: 14, color: "var(--ink-6)" }}>
              Nothing to open in here. This may be the folder you want.
            </div>
          ) : (
            entries.map((e, i) => (
              <button
                key={e.path}
                type="button"
                role="option"
                aria-selected={i === active}
                data-index={i}
                onClick={() => setActive(i)}
                onDoubleClick={() => load(e.path)}
                className="flex w-full items-center justify-between text-left"
                style={{
                  gap: 16,
                  padding: "11px 14px",
                  fontSize: 14,
                  color: "var(--ink-2)",
                  background: i === active ? "var(--rail-active)" : "transparent",
                  borderBottom: "1px solid var(--line-softer)",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
                <Marker entry={e} />
              </button>
            ))
          )}
        </div>

        {/* The hint and the actions each get a full line. Sharing one row put
            six wrapping fragments against two buttons and read as debris. */}
        <div className="flex flex-col" style={{ gap: 18 }}>
          <div
            className="flex items-center"
            style={{ fontSize: 12.5, color: "var(--ink-6)", gap: 18, flexWrap: "wrap" }}
          >
            <Hint icons={[ArrowUp, ArrowDown]}>move</Hint>
            <Hint icons={[ArrowRight]} also="Enter">
              open
            </Hint>
            <Hint icons={[ArrowLeft]}>go up</Hint>
          </div>

          <div className="flex items-center justify-end" style={{ gap: 10 }}>
            <Btn variant="ghost" onClick={native}>
              Use the system dialog
            </Btn>
            <Btn
              variant="primary"
              disabled={!data?.path}
              onClick={() => data && onChoose(data.path)}
            >
              Use this folder
            </Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
