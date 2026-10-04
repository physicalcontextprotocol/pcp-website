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
  // `toggled` holds only explicit user overrides; a group that was never
  // touched derives its state from the active route, so deep links land with
  // the containing group already expanded.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const isOpen = (item: NavItem) =>
    toggled[item.label] ?? (item.children?.some((c) => c.route === route) ?? false);

  const toggle = (label: string, current: boolean) =>
    setToggled((t) => ({ ...t, [label]: !current }));

  return (
    <nav aria-label="Documentation">
      {nav.map((item) => {
        if (!item.children) {
          return (
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
          );
        }
        const open = isOpen(item);
        return (
          <div key={item.label} style={{ marginBottom: 6 }}>
            <button
              type="button"
              className="navgroup-label"
              aria-expanded={open}
              onClick={() => toggle(item.label, open)}
            >
              <span className="twist">{open ? "−" : "+"}</span>
              {item.label}
            </button>
            {open && (
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
        );
      })}
    </nav>
  );
}
