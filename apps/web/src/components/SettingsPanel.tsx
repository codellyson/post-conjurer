import { Dialog, DialogContent, DialogTitle } from "@codellyson/justui/react";
import { useEffect, useState } from "react";
import { FolderBrowser } from "@/components/FolderBrowser";
import { Area, Btn, Hint, Label, Pills } from "@/components/ui";
import type { Product, ProviderStatus } from "@/lib/conjurer";
import { listProviders, saveDossier, setProvider } from "@/lib/conjurer";
import type { Appearance } from "@/lib/theme";
import { readAppearance, setAppearance } from "@/lib/theme";

export const LOOKBACK = [
  { id: "2 weeks ago", label: "2 weeks" },
  { id: "2 months ago", label: "2 months" },
  { id: "20 years ago", label: "Everything" },
] as const;

export type Lookback = (typeof LOOKBACK)[number]["id"];

function Dossier({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState(product.what_it_does ?? "");
  const [who, setWho] = useState(product.audience ?? "");
  const [moments, setMoments] = useState(product.moments ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const empty = !what && !who && !moments;

  async function save() {
    setState("saving");
    await saveDossier(product.id, { what_it_does: what, audience: who, moments });
    setState("saved");
    onSaved();
  }

  return (
    <div style={{ borderBottom: "1px solid var(--line-softer)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
        style={{ padding: "10px 0" }}
      >
        <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{product.name}</span>
        <span style={{ fontSize: 12.5, color: empty ? "var(--ink-6)" : "var(--c-accent)" }}>
          {empty ? "not described" : "described"}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col" style={{ gap: 10, padding: "4px 0 16px" }}>
          <Area
            rows={2}
            value={what}
            placeholder="What it does, as you'd say it to a friend"
            onChange={(e) => setWhat(e.target.value)}
          />
          <Area
            rows={2}
            value={who}
            placeholder="Who it's for"
            onChange={(e) => setWho(e.target.value)}
          />
          {/* The only field a repo can never supply, and the one that keeps
              generated posts from reading like a changelog. */}
          <Area
            rows={3}
            value={moments}
            placeholder="Moments — first paying user, something someone said, a number you're proud of. One per line."
            onChange={(e) => setMoments(e.target.value)}
          />
          <div className="flex items-center" style={{ gap: 10 }}>
            <Btn onClick={save} disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : "Save"}
            </Btn>
            {state === "saved" ? (
              <span style={{ fontSize: 13, color: "var(--ink-6)" }}>Saved</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsPanel({
  open,
  root,
  setRoot,
  lookback,
  setLookback,
  products,
  repoCount,
  lastScan,
  onClose,
  onRescan,
  scanning,
  onProductsChanged,
}: {
  open: boolean;
  root: string;
  setRoot: (v: string) => void;
  lookback: Lookback;
  setLookback: (v: Lookback) => void;
  products: Product[];
  repoCount: number;
  lastScan: string | null;
  onClose: () => void;
  onRescan: () => void;
  scanning: boolean;
  onProductsChanged: () => void;
}) {
  const [appearance, setAppearanceState] = useState<Appearance>("light");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAppearanceState(readAppearance());
    listProviders()
      .then(setProviders)
      .catch(() => undefined);
  }, [open]);

  const active = providers.find((p) => p.active);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Radix brings the focus trap, Escape and aria-modal. The study's
          slide-over is the same modal pinned to the right edge, so the
          geometry is overridden inline rather than rebuilt. */}
      <DialogContent
        data-settings
        style={{
          left: "auto",
          right: 0,
          top: 0,
          bottom: 0,
          transform: "none",
          width: 480,
          maxWidth: "none",
          display: "flex",
          flexDirection: "column",
          gap: 30,
          padding: "34px 40px",
          borderRadius: 0,
          borderWidth: "0 0 0 1px",
          background: "var(--paper)",
          boxShadow: "var(--slide-shadow)",
          overflowY: "auto",
        }}
      >
        <DialogTitle asChild>
          <div className="serif" style={{ fontSize: 24, fontWeight: 400 }}>
            Settings
          </div>
        </DialogTitle>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <Label>Projects folder</Label>
          <div className="flex items-center" style={{ gap: 8 }}>
            <div
              title={root}
              style={{
                flex: 1,
                fontSize: 14,
                color: "var(--ink-3)",
                border: "1px solid var(--field-border)",
                borderRadius: 5,
                padding: "10px 12px",
                background: "var(--field)",
                fontFamily: "var(--font-mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {root || "not set"}
            </div>
            <Btn onClick={() => setBrowsing(true)} style={{ padding: "10px 14px" }}>
              Change
            </Btn>
          </div>

          <FolderBrowser
            open={browsing}
            initialPath={root || undefined}
            onClose={() => setBrowsing(false)}
            onChoose={(path) => {
              setRoot(path);
              setBrowsing(false);
            }}
          />
          <Hint>
            {repoCount} repositor{repoCount === 1 ? "y" : "ies"} found
            {lastScan ? ` · ${lastScan}` : ""}
          </Hint>
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <Label>Model</Label>
          <div
            style={{
              fontSize: 14,
              color: "var(--ink-3)",
              border: "1px solid var(--field-border)",
              borderRadius: 5,
              padding: "10px 12px",
              background: "var(--field)",
            }}
          >
            {active ? `${active.label} · ${active.model}` : "none available"}
          </div>
          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!p.available}
                aria-pressed={p.active}
                onClick={() => setProvider(p.id).then((r) => setProviders(r.providers))}
                style={{
                  fontSize: 13,
                  padding: "6px 12px",
                  borderRadius: 5,
                  border: `1px solid ${p.active ? "var(--c-accent)" : "var(--field-border)"}`,
                  background: p.active ? "var(--accent-wash)" : "transparent",
                  color: p.active ? "var(--c-accent-hover)" : "var(--ink-3)",
                  opacity: p.available ? 1 : 0.45,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Deliberately not a key field: this app reads credentials from the
              API process's environment so the database never carries one. */}
          <Hint>
            Keys come from the environment, never the database. Your code is never uploaded —
            only the commit messages and the summaries you see.
          </Hint>
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <Label>Look back</Label>
          <Pills
            options={LOOKBACK.map((l) => ({ id: l.id, label: l.label }))}
            value={lookback}
            onChange={(v) => setLookback(v as Lookback)}
          />
          <div className="flex items-center" style={{ gap: 10 }}>
            <Btn onClick={onRescan} disabled={scanning || !root}>
              {scanning ? "Rescanning…" : "Rescan now"}
            </Btn>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <Label>Appearance</Label>
          <Pills
            options={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ]}
            value={appearance}
            onChange={(v) => {
              setAppearanceState(v as Appearance);
              setAppearance(v as Appearance);
            }}
          />
        </div>

        {products.length ? (
          <div className="flex flex-col" style={{ gap: 8 }}>
            <Label>What your projects are</Label>
            <Hint>
              Without this, posts stay abstract. Moments is the only place a real anecdote can
              come from.
            </Hint>
            <div className="flex flex-col">
              {products.map((p) => (
                <Dossier key={p.id} product={p} onSaved={onProductsChanged} />
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ flex: 1 }} />
        <Hint>Roughly 3¢ per set of three versions.</Hint>
      </DialogContent>
    </Dialog>
  );
}
