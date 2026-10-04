"use client";

import { useState } from "react";
import { BlockRenderer } from "./BlockRenderer";
import type { Block } from "@/content/types";

export function TabsBlockView({
  tabs,
  defaultTab,
}: {
  tabs: { id: string; label: string; blocks: Block[] }[];
  defaultTab?: string;
}) {
  const [sel, setSel] = useState(
    defaultTab && tabs.some((t) => t.id === defaultTab) ? defaultTab : tabs[0]?.id
  );

  return (
    <div>
      <div className="tabrow" role="tablist" aria-label="Language">
        {tabs.map((t) => (
          <button
            key={t.id}
            className="tabbtn"
            role="tab"
            type="button"
            aria-selected={sel === t.id}
            onClick={() => setSel(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabpanel" role="tabpanel">
        {tabs
          .filter((t) => t.id === sel)
          .map((t) => (
            <BlockRenderer key={t.id} blocks={t.blocks} />
          ))}
      </div>
    </div>
  );
}
