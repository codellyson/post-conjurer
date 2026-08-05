import {
  Button,
  Input,
  Label as JLabel,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@codellyson/justui/react";
import type { ComponentProps } from "react";

// These wrap justui rather than reimplementing it: the library brings the
// focus ring, disabled handling and Radix behaviour. The design study pins
// metrics to the half-pixel (13.5px/600, 9x18, radius 5), which Tailwind's
// scale can't express, so those arrive as inline style — which beats the
// utility classes without fighting them.

type Variant = "primary" | "outline" | "ghost" | "quiet";

const JUSTUI_VARIANT: Record<Variant, "primary" | "outline" | "ghost"> = {
  primary: "primary",
  outline: "outline",
  ghost: "ghost",
  quiet: "ghost",
};

const METRICS: Record<Variant, React.CSSProperties> = {
  primary: { fontSize: 13.5, fontWeight: 600, padding: "9px 18px" },
  outline: { fontSize: 13.5, fontWeight: 400, padding: "8px 14px" },
  ghost: { fontSize: 13.5, fontWeight: 400, padding: "8px 14px" },
  quiet: { fontSize: 13, fontWeight: 400, padding: "7px 10px", color: "var(--ink-6)" },
};

export function Btn({
  variant = "outline",
  large,
  style,
  ...rest
}: Omit<ComponentProps<typeof Button>, "variant"> & { variant?: Variant; large?: boolean }) {
  return (
    <Button
      {...rest}
      variant={JUSTUI_VARIANT[variant]}
      style={{
        height: "auto",
        borderRadius: large ? 6 : 5,
        ...METRICS[variant],
        ...(large ? { fontSize: 15, fontWeight: 600, padding: "13px 26px" } : null),
        ...style,
      }}
    />
  );
}

const FIELD: React.CSSProperties = {
  width: "100%",
  height: "auto",
  fontSize: 14,
  color: "var(--ink-3)",
  background: "var(--field)",
  border: "1px solid var(--field-border)",
  borderRadius: 5,
  padding: "10px 12px",
  fontFamily: "inherit",
};

export function Field({ style, ...rest }: ComponentProps<typeof Input>) {
  return <Input {...rest} style={{ ...FIELD, ...style }} />;
}

export function Area({ style, ...rest }: ComponentProps<typeof Textarea>) {
  return <Textarea {...rest} style={{ ...FIELD, resize: "vertical", ...style }} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <JLabel style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>{children}</JLabel>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "var(--ink-6)", lineHeight: 1.6 }}>{children}</div>;
}

// Look back / Appearance. The study draws these as separate bordered pills,
// not a joined segmented group, so they stay plain buttons.
export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex" style={{ gap: 6 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            style={{
              fontSize: 13.5,
              padding: "8px 14px",
              borderRadius: 5,
              border: `1px solid ${on ? "var(--c-accent)" : "var(--field-border)"}`,
              background: on ? "var(--accent-wash)" : "transparent",
              color: on ? "var(--c-accent-hover)" : "var(--ink-3)",
              fontWeight: on ? 600 : 400,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The One / Two / Three version switcher. justui's Tabs is Radix underneath,
// so arrow-key navigation and roving focus come with it.
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList
        aria-label={label}
        style={{
          height: "auto",
          gap: 2,
          background: "var(--rail-hover)",
          padding: 3,
          borderRadius: 6,
        }}
      >
        {options.map((o) => (
          <TabsTrigger
            key={o.id}
            value={o.id}
            style={{
              fontSize: 13,
              fontWeight: o.id === value ? 600 : 400,
              padding: "5px 14px",
              borderRadius: 4,
              background: o.id === value ? "var(--paper)" : "transparent",
              color: o.id === value ? "var(--ink)" : "var(--ink-4)",
              boxShadow: "none",
            }}
          >
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
