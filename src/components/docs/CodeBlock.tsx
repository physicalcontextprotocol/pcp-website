"use client";

import { useState, useMemo } from "react";
import { tokenize } from "@/lib/highlight";
import type { Lang } from "@/content/types";

export function CodeBlock({
  lang,
  content,
  title,
}: {
  lang: Lang;
  content: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toks = useMemo(() => tokenize(content, lang), [content, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="codewrap">
      <div className="codetitle">
        <span>{title ?? lang}</span>
        <button
          className="copybtn"
          onClick={copy}
          aria-label="Copy code"
          type="button"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre>
        <code>
          {toks.map((t, i) =>
            t.cls ? (
              <span key={i} className={t.cls}>
                {t.text}
              </span>
            ) : (
              <span key={i}>{t.text}</span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
