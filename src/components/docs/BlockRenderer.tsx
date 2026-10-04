"use client";

import { Inline } from "./Inline";
import { CodeBlock } from "./CodeBlock";
import { TabsBlockView } from "./Tabs";
import type { Block } from "@/content/types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case "h1":
      return (
        <h1
          id={slugify(b.text)}
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            margin: "0 0 8px",
          }}
        >
          {b.text}
        </h1>
      );

    case "h2":
      return (
        <h2
          id={slugify(b.text)}
          style={{
            fontSize: 16.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: "56px 0 12px",
            scrollMarginTop: 24,
          }}
        >
          {b.text}
        </h2>
      );

    case "h3":
      return (
        <h3
          id={slugify(b.text)}
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--dim)",
            margin: "40px 0 8px",
            scrollMarginTop: 24,
          }}
        >
          {b.text}
        </h3>
      );

    case "p":
      return (
        <p style={{ margin: "0 0 20px", maxWidth: 72 * 14 }}>
          <Inline text={b.text} />
        </p>
      );

    case "list":
      return b.ordered ? (
        <ol
          style={{
            margin: "0 0 20px",
            paddingLeft: 24,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {b.items.map((it, i) => (
            <li key={i} style={{ paddingLeft: 4 }}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      ) : (
        <ul
          style={{
            margin: "0 0 20px",
            paddingLeft: 24,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {b.items.map((it, i) => (
            <li key={i} style={{ paddingLeft: 4, textIndent: "-14px" }}>
              <span style={{ color: "var(--dimmer)" }}>— </span>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );

    case "code":
      return <CodeBlock lang={b.lang} content={b.content} title={b.title} />;

    case "ascii":
      return (
        <div className="asciiwrap">
          <pre aria-label="Protocol diagram">
            <code>{b.content}</code>
          </pre>
        </div>
      );

    case "tabs":
      return <TabsBlockView tabs={b.tabs} defaultTab={b.defaultTab} />;

    case "table":
      return (
        <div className="tblwrap">
          <table className="pmcp">
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      {b.codeFirstCol && j === 0 ? (
                        <code className="ic">{c}</code>
                      ) : (
                        <Inline text={c} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "note":
      return (
        <div className="note">
          <span className="notelabel">{b.label}</span>
          <Inline text={b.text} />
        </div>
      );

    case "linkrows":
      return (
        <div className="linkrows">
          {b.rows.map((r, i) => (
            <div key={i} className="linkrow">
              <a href={r.href.startsWith("/") ? `#${r.href}` : r.href} {...(r.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {r.label}
              </a>
              {r.desc ? <span className="linkdesc">{r.desc}</span> : null}
            </div>
          ))}
        </div>
      );

    case "placeholder":
      return (
        <div
          style={{
            border: "1px solid var(--line-strong)",
            padding: "20px 22px",
            margin: "28px 0",
          }}
        >
          <div
            style={{
              color: "var(--dim)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            placeholder — content not yet drafted
          </div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{b.title}</div>
          <p style={{ margin: "0 0 12px", fontSize: 13 }}>
            <Inline text={b.body} />
          </p>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>
            When drafted, this page will cover:
          </div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 12, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {b.willCover.map((w, i) => (
              <li key={i}>
                <span style={{ color: "var(--dimmer)" }}>— </span>
                <Inline text={w} />
              </li>
            ))}
          </ul>
        </div>
      );
  }
}
