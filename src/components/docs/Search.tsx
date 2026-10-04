"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/searchIndex";
import { trapTab } from "@/lib/focus";

const LISTBOX_ID = "search-results";
const optionId = (i: number) => `search-option-${i}`;

export function SearchOverlay({
  open,
  onClose,
  hits,
  query,
  onQuery,
  pageCount,
}: {
  open: boolean;
  onClose: () => void;
  hits: SearchHit[];
  query: string;
  onQuery: (q: string) => void;
  pageCount: number;
}) {
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevQuery, setPrevQuery] = useState(query);

  // latest-value mirrors so the window keydown listener can be registered once
  // per open, instead of on every keystroke
  const stateRef = useRef({ hits, active, onClose });
  useEffect(() => {
    stateRef.current = { hits, active, onClose };
  });

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
      const { hits: h, active: a, onClose: close } = stateRef.current;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((v) => Math.min(v + 1, h.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((v) => Math.max(v - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = h[a];
        if (hit) {
          window.location.hash = hit.anchor ? `${hit.route}#${hit.anchor}` : hit.route;
          close();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const showList = query.trim() !== "" && hits.length > 0;

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
        onKeyDown={trapTab}
      >
        <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
          <input
            ref={inputRef}
            className="searchinput"
            style={{ paddingLeft: 10 }}
            type="text"
            value={query}
            placeholder="Search the docs…"
            role="combobox"
            aria-expanded={showList}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && active < hits.length ? optionId(active) : undefined
            }
            aria-label="Search query"
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
          {query.trim() === "" ? (
            <div style={{ padding: "16px 12px", color: "var(--dimmer)", fontSize: 12 }}>
              {pageCount} pages indexed. ↑↓ to move, enter to open, esc to close.
            </div>
          ) : hits.length === 0 ? (
            <div style={{ padding: "16px 12px", color: "var(--dimmer)", fontSize: 12 }}>
              No matches.
            </div>
          ) : (
            <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
              {hits.map((h, i) => (
                <a
                  key={`${h.route}-${i}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  href={h.anchor ? `#${h.route}#${h.anchor}` : `#${h.route}`}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
