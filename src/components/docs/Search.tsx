"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/searchIndex";
export function SearchOverlay({
  open,
  onClose,
  hits,
  query,
  onQuery,
}: {
  open: boolean;
  onClose: () => void;
  hits: SearchHit[];
  query: string;
  onQuery: (q: string) => void;
}) {
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevQuery, setPrevQuery] = useState(query);

  // reset the highlighted row whenever the query changes (render-phase reset,
  // the React-endorsed pattern — no state-in-effect cascade)
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActive(0);
  }

  // focus the input after the overlay is visible
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, hits.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = hits[active];
        if (hit) {
          window.location.hash = hit.route;
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, onClose]);

  if (!open) return null;

  return (
    <div
      className="searchmodal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="searchpanel"
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
          <input
            ref={inputRef}
            className="searchinput"
            style={{ paddingLeft: 10 }}
              type="text"
              value={query}
              placeholder="Search the docs…"
              aria-label="Search query"
              onChange={(e) => onQuery(e.target.value)}
            />
        </div>
        <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
          {query.trim() === "" ? (
            <div style={{ padding: "16px 12px", color: "var(--dimmer)", fontSize: 12 }}>
              18 pages indexed. ↑↓ to move, enter to open, esc to close.
            </div>
          ) : hits.length === 0 ? (
            <div style={{ padding: "16px 12px", color: "var(--dimmer)", fontSize: 12 }}>
              No matches.
            </div>
          ) : (
            hits.map((h, i) => (
              <a
                key={`${h.route}-${i}`}
                href={`#${h.route}`}
                className="searchresult"
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={onClose}
              >
                <span className="sr-page">{h.page}</span>
                <span className="sr-title">{h.section || h.page}</span>
                <span className="sr-snippet">
                  {h.snippet[0]}
                  <span className="srchl">{h.snippet[1]}</span>
                  {h.snippet[2]}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
