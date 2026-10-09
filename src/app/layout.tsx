import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PCP — Physical Context Protocol",
    template: "%s — PCP",
  },
  description:
    "PCP coordinates access to shared physical resources — space, tools, actuation — across multiple robots or actuated agents, through formally verified safety gates.",
  icons: { icon: "/pcp-mark.svg" },
  openGraph: {
    title: "PCP — Physical Context Protocol",
    description:
      "Safety coordination protocol for multi-robot systems. Lease, Constitution, Shadow, E-Stop.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* Runs before first paint so the stored theme is applied without a flash. */
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem('pcp-theme')}catch(e){}document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="pcp-body antialiased">
        {children}
      </body>
    </html>
  );
}
