/* ────────────────────────────────────────────────────────────────────────────
   PCP docs content model — pages are data, rendered by BlockRenderer.
   Keeping content as data makes the search index and the page tree come
   from a single source.
   ──────────────────────────────────────────────────────────────────────────── */

export type Lang = "python" | "typescript" | "rust" | "bash" | "json" | "text" | "toml";

export interface CodeBlock {
  kind: "code";
  lang: Lang;
  content: string;
  title?: string;
}

export interface AsciiBlock {
  kind: "ascii";
  content: string;
}

export interface TabsBlock {
  kind: "tabs";
  tabs: { id: string; label: string; blocks: Block[] }[];
  /** which tab id is selected when the page opens */
  defaultTab?: string;
}

export interface TableBlock {
  kind: "table";
  headers: string[];
  rows: string[][];
  /** render first column cells as inline code */
  codeFirstCol?: boolean;
}

export interface NoteBlock {
  kind: "note";
  label: string;
  /** inline formatting supported */
  text: string;
}

export interface LinkRowsBlock {
  kind: "linkrows";
  rows: { label: string; href: string; desc?: string }[];
}

export interface PlaceholderBlock {
  kind: "placeholder";
  title: string;
  body: string;
  willCover: string[];
}

export type Block =
  | { kind: "h1"; text: string; sub?: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | CodeBlock
  | AsciiBlock
  | TabsBlock
  | TableBlock
  | NoteBlock
  | LinkRowsBlock
  | PlaceholderBlock;

export interface PageDef {
  /** hash route, e.g. "/protocol/gates" */
  route: string;
  /** sidebar / search title */
  title: string;
  blocks: Block[];
}

export interface NavItem {
  label: string;
  route?: string;
  children?: NavItem[];
}

/** Strip inline markers to plain text (for search). */
export function inlinePlain(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}
