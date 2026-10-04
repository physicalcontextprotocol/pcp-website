"use client";

import type { ReactNode } from "react";

/* Inline mini-markup: `code`, **bold**, [label](href)
   Internal hrefs ("/protocol/gates") become hash-routed links;
   external hrefs open in a new tab. */

export function Inline({ text }: { text: string }) {
  return <>{parseInline(text)}</>;
}

function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      if (href.startsWith("http")) {
        out.push(
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        );
      } else {
        out.push(
          <a key={key++} href={href.startsWith("/") ? `#${href}` : href}>
            {m[1]}
          </a>
        );
      }
    } else if (m[3] !== undefined) {
      out.push(
        <code key={key++} className="ic">
          {m[3]}
        </code>
      );
    } else if (m[4] !== undefined) {
      out.push(
        <strong key={key++} style={{ fontWeight: 600 }}>
          {m[4]}
        </strong>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
