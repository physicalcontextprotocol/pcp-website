"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { TopBar, GITHUB_ORG, PMCP_VERSION } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { SearchOverlay } from "./Search";
import { BlockRenderer } from "./BlockRenderer";
import { buildIndex, queryIndex } from "@/lib/searchIndex";
import { NAV, PAGES } from "@/content";

let lastRoute = "/";

/* Hash is either a page route ("#/protocol/gates") or a heading anchor
   ("#some-heading") — anchors must not reset the page route. */
function pageFromHash(): { route: string | null; hash: string } {
  const h = window.location.hash.replace(/^#/, "");
  if (!h.startsWith("/")) return { route: null, hash: h };
  const r = h.replace(/\/+$/, "") || "/";
  lastRoute = r;
  return { route: r, hash: h };
}

interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

const searchIndex = buildIndex(PAGES);

export function DocsApp() {
  const [route, setRoute] = useState<string>("/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  // authoritative route for the hashchange listener — avoids stale closures
  const routeRef = useRef<string | null>(null);

  const page = useMemo(
    () => PAGES.find((p) => p.route === route) ?? PAGES[0],
    [route]
  );

  // Derive the on-this-page rail from the rendered DOM, so it reflects
  // only visible content (e.g. the active SDK tab) and never duplicates.
  const [headings, setHeadings] = useState<Heading[]>([]);
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;
    let raf = 0;
    const derive = () => {
      raf = requestAnimationFrame(() => {
        const els = Array.from(article.querySelectorAll<HTMLElement>("h2, h3"));
        setHeadings(
          els.map((el) => ({
            id: el.id,
            text: el.textContent ?? "",
            depth: el.tagName === "H2" ? 2 : 3,
          }))
        );
      });
    };
    derive();
    const mo = new MutationObserver(derive);
    mo.observe(article, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [route]);

  const hits = useMemo(() => queryIndex(searchIndex, query), [query]);

  useEffect(() => {
    const onHash = () => {
      const { route: next } = pageFromHash();
      if (next !== null && next !== routeRef.current) {
        routeRef.current = next;
        setRoute(next);
        window.scrollTo({ top: 0 });
      }
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // global shortcuts: Cmd/Ctrl+K or "/" opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // lock body scroll when overlays open
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  // scroll spy over h2/h3
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setActiveHeading(en.target.id);
            return;
          }
        }
        // if none intersecting, keep the last active
      },
      { rootMargin: "-60px 0px -70% 0px", threshold: 0 }
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar onMenu={() => setMenuOpen(true)} onSearch={() => setSearchOpen(true)} />

      {/* desktop sidebar */}
      <aside
        className="hidden md:block"
        style={{
          position: "fixed",
          top: 52,
          bottom: 0,
          left: 0,
          width: 248,
          borderRight: "1px solid var(--line)",
          overflowY: "auto",
          padding: "28px 16px 40px",
        }}
      >
        <Sidebar nav={NAV} route={route} />
      </aside>

      {/* mobile sidebar overlay */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(0,0,0,0.85)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeMenu();
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 272,
              background: "#000",
              borderRight: "1px solid var(--line-strong)",
              overflowY: "auto",
              padding: "20px 16px 40px",
            }}
          >
            <button
              className="navgroup-label"
              onClick={closeMenu}
              style={{ marginBottom: 12 }}
            >
              <span className="twist">×</span>
              close
            </button>
            <Sidebar nav={NAV} route={route} onNavigate={closeMenu} />
          </div>
        </div>
      )}

      {/* content column */}
      <div
        style={{
          paddingTop: 52,
          display: "flex",
          flex: 1,
          flexDirection: "column",
        }}
        className="md:ml-[248px]"
      >
        <main
          style={{
            width: "100%",
            maxWidth: 1440,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <article
            style={{
              width: "100%",
              maxWidth: 700,
              padding: "44px 24px 40px",
            }}
            className="px-5 md:px-8"
          >
            <nav aria-label="Breadcrumb" style={{ fontSize: 11.5, color: "var(--dimmer)", marginBottom: 18, letterSpacing: "0.02em" }}>
              <a href="#/" style={{ color: "var(--dim)", textDecoration: "none" }}>
                PMCP
              </a>
              {route !== "/" && (
                <>
                  {" / "}
                  <span style={{ color: "var(--dim)" }}>
                    {route
                      .split("/")
                      .filter(Boolean)
                      .join(" / ")}
                  </span>
                </>
              )}
            </nav>
            <BlockRenderer key={route} blocks={page.blocks} />

            {/* footer — license, GitHub, version. Nothing else. */}
            <footer
              style={{
                marginTop: 72,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                fontSize: 11.5,
                color: "var(--dim)",
              }}
            >
              <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--dim)", textDecoration: "none" }}
              >
                Apache 2.0
              </a>
              <a
                href={GITHUB_ORG}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--dim)", textDecoration: "none" }}
              >
                GitHub
              </a>
              <span>{PMCP_VERSION}</span>
            </footer>
          </article>
        </main>
      </div>

      {/* on-this-page rail (xl only) */}
      {headings.length > 0 && (
        <div
          className="onpage hidden xl:block"
          style={{
            position: "fixed",
            top: 84,
            right: 32,
            width: 200,
          }}
        >
          <div className="oplabel">on this page</div>
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={activeHeading === h.id ? "active" : ""}
              style={{ paddingLeft: h.depth === 3 ? 22 : 10 }}
            >
              {h.text}
            </a>
          ))}
        </div>
      )}

      <SearchOverlay
        open={searchOpen}
        onClose={closeSearch}
        hits={hits}
        query={query}
        onQuery={setQuery}
      />
    </div>
  );
}
