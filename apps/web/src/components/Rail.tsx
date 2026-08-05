import type { IconProps } from "@/components/icons";
import { IdeasIcon, PostsIcon, Rescan, Settings, StylesIcon } from "@/components/icons";

export type View = "ideas" | "posts" | "styles";

const ITEMS: { id: View; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { id: "ideas", label: "Ideas", Icon: IdeasIcon },
  { id: "posts", label: "Posts", Icon: PostsIcon },
  { id: "styles", label: "Styles", Icon: StylesIcon },
];

function Row({
  label,
  Icon,
  count,
  active,
  onClick,
  disabled,
}: {
  label: string;
  Icon: React.ComponentType<IconProps>;
  count?: number;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className="flex items-center justify-between text-left"
      style={{
        gap: 10,
        padding: "9px 10px",
        borderRadius: 5,
        background: active ? "var(--rail-active)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) e.currentTarget.style.background = "var(--rail-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
        <Icon size={15} style={{ color: active ? "var(--c-accent)" : "var(--ink-5)" }} />
        <span style={{ fontSize: 14.5, fontWeight: active ? 600 : 400 }}>{label}</span>
      </span>
      {/* Zero is information — an empty slot just reads as unfinished chrome. */}
      {count !== undefined ? (
        <span
          style={{
            fontSize: 13,
            fontVariantNumeric: "tabular-nums",
            color: count ? "var(--ink-5)" : "var(--ink-7)",
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function Rail({
  view,
  counts,
  lastScan,
  onNavigate,
  onRescan,
  onSettings,
  scanning,
}: {
  view: View;
  counts: Record<View, number>;
  lastScan: string | null;
  onNavigate: (v: View) => void;
  onRescan: () => void;
  onSettings: () => void;
  scanning: boolean;
}) {
  return (
    <nav
      className="flex flex-col"
      style={{
        width: 228,
        flex: "0 0 228px",
        background: "var(--rail)",
        borderRight: "1px solid var(--line)",
        padding: "22px 0",
      }}
    >
      <div className="flex items-center" style={{ gap: 10, padding: "0 22px 26px" }}>
        <span
          style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--c-accent)" }}
        />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
          Post Conjurer
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 2, padding: "0 12px" }}>
        {ITEMS.map((item) => (
          <Row
            key={item.id}
            label={item.label}
            Icon={item.Icon}
            count={counts[item.id]}
            active={view === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Rescan and Settings are destinations too, so they take the same row
          shape as the nav above rather than a run-on line of text links. */}
      <div className="flex flex-col" style={{ gap: 10 }}>
        {lastScan ? (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-6)",
              lineHeight: 1.5,
              padding: "0 22px",
              whiteSpace: "pre-line",
            }}
          >
            {lastScan}
          </div>
        ) : null}
        <div style={{ padding: "0 22px" }}>
          <div className="hair" />
        </div>
        <div className="flex flex-col" style={{ gap: 2, padding: "0 12px" }}>
          <Row
            label={scanning ? "Rescanning…" : "Rescan"}
            Icon={Rescan}
            disabled={scanning}
            onClick={onRescan}
          />
          <Row label="Settings" Icon={Settings} onClick={onSettings} />
        </div>
      </div>
    </nav>
  );
}
