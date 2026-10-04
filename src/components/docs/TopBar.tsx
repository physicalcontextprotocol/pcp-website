"use client";

import { Logo } from "./Logo";

export const PCP_VERSION = "v0.5";
export const GITHUB_ORG = "https://github.com/physicalcontextprotocol";

export function TopBar({
  onMenu,
  onSearch,
  menuOpen,
  searchOpen,
  menuButtonRef,
  searchButtonRef,
}: {
  onMenu: () => void;
  onSearch: () => void;
  menuOpen: boolean;
  searchOpen: boolean;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
  searchButtonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 50,
        background: "#000",
        borderBottom: "1px solid var(--line-strong)",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        {/* left: menu (mobile) + logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={onMenu}
            ref={menuButtonRef}
            style={{
              background: "none",
              border: 0,
              color: "#fff",
              cursor: "pointer",
              padding: 4,
              marginLeft: -4,
              lineHeight: 0,
            }}
            className="md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="1" y1="4" x2="17" y2="4" stroke="#fff" strokeWidth="1.2" />
              <line x1="1" y1="9" x2="17" y2="9" stroke="#fff" strokeWidth="1.2" />
              <line x1="1" y1="14" x2="17" y2="14" stroke="#fff" strokeWidth="1.2" />
            </svg>
          </button>
          <a
            href="#/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <Logo size={19} />
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "0.12em",
              }}
            >
              PCP
            </span>
          </a>
        </div>

        {/* right: search trigger + GitHub + version */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button
            type="button"
            onClick={onSearch}
            ref={searchButtonRef}
            aria-expanded={searchOpen}
            aria-haspopup="dialog"
            className="topsearch"
            style={{
              background: "none",
              border: 0,
              color: "var(--dim)",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: "pointer",
              padding: "4px 0",
              letterSpacing: "0.02em",
            }}
          >
            search
            <span
              style={{
                color: "var(--dimmer)",
                border: "1px solid var(--line)",
                padding: "1px 5px",
                marginLeft: 8,
                fontSize: 10,
              }}
            >
              ⌘K
            </span>
          </button>
          <a
            href={GITHUB_ORG}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: "var(--dim)",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
          >
            GitHub
          </a>
          <span
            style={{
              fontSize: 12,
              color: "var(--dim)",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {PCP_VERSION}
          </span>
        </div>
      </div>
    </header>
  );
}
