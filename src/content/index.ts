import type { PageDef, NavItem } from "./types";
import { overviewPage } from "./pages/overview";
import { quickstartPage } from "./pages/quickstart";
import {
  protocolOverviewPage,
  protocolGatesPage,
  protocolEstopPage,
  protocolLeasesPage,
  protocolWireFormatPage,
} from "./pages/protocol";
import {
  sdkPythonPage,
  sdkTypescriptPage,
  sdkRustPage,
} from "./pages/sdks";
import {
  conformancePage,
  serversPage,
  registryPage,
  verificationPage,
  limitationsPage,
} from "./pages/reference";
import {
  governancePage,
  versioningPage,
  securityPage,
  contributingPage,
} from "./pages/meta";

export const PAGES: PageDef[] = [
  overviewPage,
  quickstartPage,
  protocolOverviewPage,
  protocolGatesPage,
  protocolEstopPage,
  protocolLeasesPage,
  protocolWireFormatPage,
  sdkPythonPage,
  sdkTypescriptPage,
  sdkRustPage,
  conformancePage,
  serversPage,
  registryPage,
  verificationPage,
  limitationsPage,
  governancePage,
  versioningPage,
  securityPage,
  contributingPage,
];

/* Sidebar order mirrors the sitemap — Limitations sits at the same
   visual weight as everything above it. Not demoted. */
export const NAV: NavItem[] = [
  { label: "Overview", route: "/" },
  { label: "Quickstart", route: "/quickstart" },
  {
    label: "Protocol",
    children: [
      { label: "Overview", route: "/protocol/overview" },
      { label: "Gates", route: "/protocol/gates" },
      { label: "E-Stop", route: "/protocol/estop" },
      { label: "Leases & Fencing", route: "/protocol/leases-fencing" },
      { label: "Wire Format", route: "/protocol/wire-format" },
    ],
  },
  {
    label: "SDKs",
    children: [
      { label: "Python", route: "/sdks/python" },
      { label: "TypeScript", route: "/sdks/typescript" },
      { label: "Rust", route: "/sdks/rust" },
    ],
  },
  { label: "Conformance", route: "/conformance" },
  { label: "Servers", route: "/servers" },
  { label: "Registry", route: "/registry" },
  { label: "Verification", route: "/verification" },
  { label: "Limitations", route: "/limitations" },
  { label: "Governance", route: "/governance" },
  { label: "Versioning", route: "/versioning" },
  { label: "Security", route: "/security" },
  { label: "Contributing", route: "/contributing" },
];
