"use client";

import { useState } from "react";
import type { NavItem } from "@/content/types";

export function Sidebar({
  nav,
  route,
  onNavigate,
}: {
  nav: NavItem[];
  route: string;
  onNavigate?: () => void;
}) {
  // groups containing the active route start expanded
  const initial: Record<string, boolean> = {};
  for (const item of nav) {
    if (item.children?.some((c) => c.route === route)) initial[item.label] = true;
  }
  const [open, setOpen] = useState<Record<string, boolean>>(initial);

  const toggle = (label: string) =>
    setOpen((o) => ({ ...o, [label]: !o[label] }));

  return (
    <nav aria-label="Documentation">
      {nav.map((item) =>
        item.children ? (
          <div key={item.label} style={{ marginBottom: 6 }}>
            <button
              type="button"
              className="navgroup-label"
              aria-expanded={!!open[item.label]}
              onClick={() => toggle(item.label)}
            >
              <span className="twist">{open[item.label] ? "−" : "+"}</span>
              {item.label}
            </button>
            {open[item.label] && (
              <div style={{ paddingLeft: 14, marginBottom: 6 }}>
                {item.children.map((c) => (
                  <a
                    key={c.route}
                    href={`#${c.route}`}
                    className="navitem"
                    aria-current={route === c.route ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <a
            key={item.route}
            href={`#${item.route}`}
            className="navitem"
            aria-current={route === item.route ? "page" : undefined}
            onClick={onNavigate}
            style={{ display: "flex", marginBottom: 2 }}
          >
            {item.label}
          </a>
        )
      )}
    </nav>
  );
}
