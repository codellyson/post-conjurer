import { ArrowDown as PArrowDown } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowLeft as PArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRight as PArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsClockwise as PArrowsClockwise } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { ArrowUp as PArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CaretDown as PCaretDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { FolderOpen as PFolderOpen } from "@phosphor-icons/react/dist/ssr/FolderOpen";
import { Gear as PGear } from "@phosphor-icons/react/dist/ssr/Gear";
import { Lightbulb as PLightbulb } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { Article as PArticle } from "@phosphor-icons/react/dist/ssr/Article";
import { Quotes as PQuotes } from "@phosphor-icons/react/dist/ssr/Quotes";

// Phosphor is the set Broadsheet names. Imported per-icon from the ssr entry
// rather than the barrel: the barrel pulls in every icon in the library and
// costs a long Vite cold start for five shapes.
//
// weight="fill" is Phosphor's solid cut. These wrappers exist only to pin that
// and the default size, so no call site can quietly ship a different weight.

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULTS = {
  weight: "fill",
  // Icons sit inside flex rows next to text; without this they get stretched
  // by align-items: stretch and shrunk by a tight container.
  style: { display: "block", flex: "none" },
} as const;

export function ArrowUp({ size = 14, ...p }: IconProps) {
  return <PArrowUp size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function ArrowDown({ size = 14, ...p }: IconProps) {
  return <PArrowDown size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function ArrowLeft({ size = 14, ...p }: IconProps) {
  return <PArrowLeft size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function ArrowRight({ size = 14, ...p }: IconProps) {
  return (
    <PArrowRight size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />
  );
}

export function CaretDown({ size = 14, ...p }: IconProps) {
  return <PCaretDown size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function Rescan({ size = 14, ...p }: IconProps) {
  return (
    <PArrowsClockwise size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />
  );
}

export function Settings({ size = 14, ...p }: IconProps) {
  return <PGear size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function FolderOpen({ size = 14, ...p }: IconProps) {
  return (
    <PFolderOpen size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />
  );
}

export function IdeasIcon({ size = 14, ...p }: IconProps) {
  return <PLightbulb size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function PostsIcon({ size = 14, ...p }: IconProps) {
  return <PArticle size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}

export function StylesIcon({ size = 14, ...p }: IconProps) {
  return <PQuotes size={size} {...DEFAULTS} {...p} style={{ ...DEFAULTS.style, ...p.style }} />;
}
