import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PMCP — Physical Model Context Protocol",
    template: "%s — PMCP",
  },
  description:
    "PMCP coordinates access to shared physical resources — space, tools, actuation — across multiple robots or actuated agents, through formally verified safety gates.",
  icons: { icon: "/pmcp-mark.svg" },
  openGraph: {
    title: "PMCP — Physical Model Context Protocol",
    description:
      "Safety coordination protocol for multi-robot systems. Lease, Constitution, Shadow, E-Stop.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className="pmcp-body antialiased">
        {children}
      </body>
    </html>
  );
}
