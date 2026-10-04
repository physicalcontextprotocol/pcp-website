import type { PageDef, Block } from "@/content/types";
import { inlinePlain } from "@/content/types";
import { slugify } from "./slug";

export interface SearchDoc {
  route: string;
  page: string;
  section: string;
  text: string;
  anchor: string | null;
}

/* Flatten page blocks into searchable documents, tracking the nearest
   heading and tab context. */
export function buildIndex(pages: PageDef[]): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const p of pages) {
    let section = "";
    let tab = "";

    const push = (text: string) => {
      const t = text.trim();
      if (!t) return;
      docs.push({
        route: p.route,
        page: p.title,
        section: section && tab ? `${section} — ${tab}` : section || tab,
        text: t,
        anchor: section && !tab ? slugify(section) : null,
      });
    };

    const walk = (blocks: Block[]) => {
      for (const b of blocks) {
        switch (b.kind) {
          case "h1":
          case "h2":
          case "h3":
            section = inlinePlain(b.text);
            break;
          case "p":
          case "note":
            push(inlinePlain(b.text));
            break;
          case "list":
            for (const it of b.items) push(inlinePlain(it));
            break;
          case "linkrows":
            for (const r of b.rows)
              push(`${r.label} ${r.desc ? inlinePlain(r.desc) : ""}`);
            break;
          case "code":
            if (b.title) push(b.title);
            push(
              b.content
                .split("\n")
                .map((l) => l.trim())
                .join(" ")
                .slice(0, 400)
            );
            break;
          case "ascii":
            push(
              b.content
                .replace(/[│┌┐└┘├┤─▼▲►·]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            );
            break;
          case "table":
            push(b.headers.join(" "));
            for (const r of b.rows) push(r.map(inlinePlain).join(" "));
            break;
          case "placeholder":
            push(
              `${b.title} ${inlinePlain(b.body)} ${b.willCover
                .map(inlinePlain)
                .join(" ")}`
            );
            break;
          case "tabs":
            for (const t of b.tabs) {
              const prevTab = tab;
              const prevSection = section;
              tab = t.label;
              walk(t.blocks);
              tab = prevTab;
              section = prevSection;
            }
            break;
        }
      }
    };

    walk(p.blocks);
  }

  return docs;
}

export interface SearchHit extends SearchDoc {
  score: number;
  snippet: [string, string, string]; // before, match, after
}

export function queryIndex(
  index: SearchDoc[],
  q: string,
  limit = 14
): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const d of index) {
    const page = d.page.toLowerCase();
    const section = d.section.toLowerCase();
    const text = d.text.toLowerCase();
    let score = 0;
    let at = -1;
    if (page.includes(needle)) {
      score += 12;
      at = 0;
    }
    if (section.includes(needle)) {
      score += 6;
      if (at < 0) at = 0;
    }
    let from = 0;
    let occurrences = 0;
    let first = -1;
    for (;;) {
      const i = text.indexOf(needle, from);
      if (i < 0) break;
      occurrences++;
      if (first < 0) first = i;
      from = i + needle.length;
    }
    if (occurrences > 0) {
      score += Math.min(occurrences, 5);
      at = first;
    }
    if (score === 0) continue;
    if (at < 0) at = 0;
    const start = Math.max(0, at - 48);
    const before = d.text.slice(start, at);
    const match = d.text.slice(at, at + needle.length);
    const after = d.text.slice(at + needle.length, at + needle.length + 88);
    hits.push({
      ...d,
      score,
      snippet: [start > 0 ? `…${before}` : before, match, after],
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
