import type { PageDef, Block } from "../types";

/* ── Python tab ─────────────────────────────────────────────────────────── */
const py: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "pip install physicalcontextprotocol",
  },
  {
    kind: "p",
    text: "Python 3.9 or newer. The package publishes to PyPI from the [`pcp-python`](https://github.com/physicalcontextprotocol/pcp-python) repository on every `v*.*.*` tag.",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "p",
    text: "Create a client against a PCP server, run the JSON-RPC `initialize` handshake, then treat the zone you intend to act in as a leased resource. Acquire before you act; release when you are done — including on the denial path, so the zone is never left ambiguous.",
  },
  {
    kind: "code",
    lang: "python",
    title: "lease.py",
    content: `from pcp import PCPClient

client = PCPClient()                 # name/version only — no URL
await client.connect_http("http://arm-01.local:8080")
# connect_http performs the JSON-RPC handshake itself;
# protocolVersion is negotiated to "0.5"

# 1. acquire the zone you intend to act in
grant = await client.request_lease(
    zone_id="cell-north",
    duration_ms=30_000,
    bid_energy_j=120.0,
)
lease = grant["lease"]

if lease["state"] != "ACTIVE":
    # a denial is a normal response, not an exception — back off
    # and retry after the lease lapses, never around it
    print(f"denied: zone held until {lease['expires_at']}")
else:
    try:
        result = await client.call_actuation(
            "move_to",
            {"x": 0.4, "y": 0.0, "z": 0.2},
            lease_token=lease["lease_id"],
        )
        print(result)
    finally:
        # 2. always release, including on error paths
        await client.release_lease(lease["lease_id"])`,
  },

  { kind: "h3", text: "Engage E-Stop" },
  {
    kind: "p",
    text: "There is no handler to register. The latch lives in the server's safety state, so it holds even against a client that ignores it, and `estop()` is a first-class call that bypasses the lease, constitution, and shadow gates entirely:",
  },
  {
    kind: "code",
    lang: "python",
    title: "estop.py",
    content: `# source: "hardware_button" | "software_watchdog"
#         | "operator_console" | "gate_failure_escalation"
await client.estop(source="operator_console")

# The latch stays engaged until an explicit disengage. Never resume
# from inside an error handler - drop to a safe state and wait.`,
  },
  {
    kind: "p",
    text: "Full API reference: [Python SDK](/sdks/python). Runnable examples: [`pcp-servers/examples`](https://github.com/physicalcontextprotocol/pcp-servers) in the `pcp-servers` repository.",
  },
];

/* ── TypeScript tab ─────────────────────────────────────────────────────── */
const ts: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "npm install @physicalcontextprotocol/sdk",
  },
  {
    kind: "p",
    text: "Node 20 or newer. Published to npm as [`@physicalcontextprotocol/sdk`](https://www.npmjs.com/package/@physicalcontextprotocol/sdk); source lives in the [`pcp-typescript`](https://github.com/physicalcontextprotocol/pcp-typescript) repository. The SDK is currently build-verified with its test suite still being filled in — see [Conformance](/conformance) for the current status matrix.",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "code",
    lang: "typescript",
    title: "lease.ts",
    content: `import { PCPServerClient } from "@physicalcontextprotocol/sdk";

const client = new PCPServerClient({
  transport: "http",        // "stdio" | "websocket" | "http"
  serverUrl: "http://127.0.0.1:7000/mcp",
});
await client.connect();   // transport + initialize handshake

// 1. acquire the zone you intend to act in
const lease = await client.requestLease(
  "arm-01",       // robotId
  "cell-north",   // zoneId
  30_000,         // durationMs
  120,            // bidEnergyJ
);

if (lease.state !== "GRANTED") {
  // a denial is a normal return, not a thrown error - back off and
  // retry after the lease lapses, never around it
  console.log("denied: zone held until " + lease.expires_at);
} else {
  try {
    const result = await client.callTool("move_to",
      { x: 0.4, y: 0.0, z: 0.2 },
      { lease_token: lease.lease_id });
    console.log(result);
  } finally {
    // 2. always release, including on error paths
    await client.releaseLease(lease.lease_id);
  }
}`,
  },

  { kind: "h3", text: "Engage E-Stop" },
  {
    kind: "p",
    text: "Same shape as the Python and Rust SDKs: `setEstop` is a request, not a subscription. It needs no registration, and it bypasses the lease, constitution, and shadow gates:",
  },
  {
    kind: "code",
    lang: "typescript",
    title: "estop.ts",
    content: `await client.setEstop(true);   // latch
// drop to a safe state now; the latch stays engaged until an
// explicit disengage - do not resume from a catch block
await client.setEstop(false);  // release`,
  },
  {
    kind: "p",
    text: "Full API reference: [TypeScript SDK](/sdks/typescript). Runnable examples: [`pcp-servers/examples`](https://github.com/physicalcontextprotocol/pcp-servers) in the `pcp-servers` repository.",
  },
];

/* ── Rust tab ───────────────────────────────────────────────────────────── */
const rs: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "cargo add physicalcontextprotocol",
  },
  {
    kind: "p",
    text: "Source lives in the [`pcp-rust`](https://github.com/physicalcontextprotocol/pcp-rust) repository (`physicalcontextprotocol` crate). Rust's async client is `Clone` — the correct concurrency pattern is documented in [Rust SDK notes](/sdks/rust).",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "code",
    lang: "rust",
    title: "lease.rs",
    content: `use physicalcontextprotocol::{TcpClientTransport, Transport};
use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // The crate exposes transports, not a high-level client, so you drive
    // JSON-RPC over the channels that connect() returns.
    let addr: SocketAddr = "127.0.0.1:7000".parse()?;
    let (tx, mut rx) = TcpClientTransport::new(addr).connect().await?;

    // 1. acquire the zone you intend to act in. The wire field is "state",
    //    not a boolean: GRANTED / DENIED / EXPIRED / RELEASED.
    tx.send(json!({
        "jsonrpc": "2.0", "id": 1, "method": "lease/request",
        "params": { "zone_id": "cell-north", "duration_ms": 30_000,
                    "bid_energy_j": 120 }
    })).await?;
    let grant = rx.recv().await.unwrap();
    let result = &grant["result"];

    if result["state"] != "GRANTED" {
        println!("denied: zone held until {}", result["expires_at"]);
        return Ok(());
    }
    let lease_id = result["lease_id"].as_str().unwrap().to_owned();

    // 2. actuate
    tx.send(json!({
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": { "name": "move_to",
                    "arguments": { "x": 0.4, "y": 0.0, "z": 0.2 } }
    })).await?;
    println!("{}", rx.recv().await.unwrap());

    // 3. always release, including on error paths
    tx.send(json!({
        "jsonrpc": "2.0", "id": 3, "method": "lease/release",
        "params": { "lease_id": lease_id }
    })).await?;
    let _ = rx.recv().await;
    Ok(())
}`,
  },

  { kind: "h3", text: "Register an E-Stop handler" },
  {
    kind: "p",
    text: "E-Stop is enforced by the server, not by client cooperation. To surface it in your own control loop, watch the same inbound channel every other message arrives on:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "estop.rs",
    content: `// E-Stop is enforced by the server, not by client cooperation. The
// latch lives in the server's safety state, so a client that ignores it
// still cannot actuate. The client observes it on the same inbound
// channel every other message arrives on:
static LATCHED: AtomicBool = AtomicBool::new(false);

while let Some(message) = rx.recv().await {
    // \`pcp/estop\` arrives as a JSON-RPC notification (no "id").
    if message["method"] == "pcp/estop" {
        let active = message["params"]["active"].as_bool().unwrap_or(true);
        LATCHED.store(active, Ordering::SeqCst);
        eprintln!("E-STOP {}", if active { "ENGAGED" } else { "released" });
    }
}`,
  },
  {
    kind: "p",
    text: "Full API reference: [Rust SDK](/sdks/rust). Runnable examples: [`pcp-servers/examples`](https://github.com/physicalcontextprotocol/pcp-servers) in the `pcp-servers` repository.",
  },
];

/* ── C++ tab ────────────────────────────────────────────────────────────── */
const cpp: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: `git clone https://github.com/physicalcontextprotocol/pcp-cpp
cmake -S pcp-cpp -B pmcp-build -DPMCP_WITH_ROS2=OFF
cmake --install pmcp-build     # installs pmcp::pmcp + a package config`,
  },
  {
    kind: "p",
    text: "C++20, CMake 3.20 or newer. Source lives in the [`pcp-cpp`](https://github.com/physicalcontextprotocol/pcp-cpp) repository. There is no package-manager release yet (a vcpkg port is in review), so consume it with `find_package(pmcp REQUIRED)` and link `pmcp::pmcp`, or vendor it with `FetchContent`.",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "code",
    lang: "cpp",
    title: "lease.cpp",
    content: `#include "pmcp/client.hpp"

pmcp::Client::Config cfg;
cfg.dialect = pmcp::Dialect::kPython;  // kSpec | kPython | kV05 | kConformance
pmcp::Client client(cfg);
client.connect_http("http://127.0.0.1:7000/mcp");

// 1. acquire the zone you intend to act in
auto lease = client.request_lease("cell-north", "arm-01", 30'000);
auto lease_id = lease["lease"]["lease_id"];

// 2. actuate. A gate refusal arrives as a thrown pmcp::Error, not an
//    error-shaped result - catch it and back off, never around the gate.
try {
    auto out = client.call_actuation(
        "move_to", {{"x", 0.4}, {"y", 0.0}, {"z", 0.2}}, lease_id);
} catch (const pmcp::Error& e) {
    // blocked: E-stop, lease, constitution or shadow
}

// 3. always release, including on error paths
client.release_lease(lease_id);`,
  },

  { kind: "h3", text: "Engage E-Stop" },
  {
    kind: "p",
    text: "`estop` is a first-class, lease-independent request — it latches on the server and bypasses the lease, constitution and shadow gates:",
  },
  {
    kind: "code",
    lang: "cpp",
    title: "estop.cpp",
    content: `client.estop(true);    // latch
// drop to a safe state now; the latch holds until an explicit reset,
// so never resume from inside a catch block
client.estop_reset();  // release`,
  },
  {
    kind: "p",
    text: "Full API reference: [C++ SDK](/sdks/cpp). Runnable examples: [`pcp-cpp/examples`](https://github.com/physicalcontextprotocol/pcp-cpp) in the `pcp-cpp` repository.",
  },
];

export const quickstartPage: PageDef = {
  route: "/quickstart",
  title: "Quickstart",
  blocks: [
    { kind: "h1", text: "Quickstart" },
    {
      kind: "p",
      text: "Working code in under five minutes, per language. All four tabs do the same thing against the same wire format: connect, request a lease, handle denial honestly, release, and arm an E-Stop handler. A PCP server must be reachable at an HTTP endpoint — the reference servers in [`pcp-servers`](/servers) are the fastest way to get one running.",
    },
    {
      kind: "p",
      text: "The four SDKs are kept deliberately comparable: one JSON Schema 2020-12 source of truth, one conformance suite, four languages. If you know one, you should be able to read the others at a glance.",
    },
    {
      kind: "tabs",
      tabs: [
        { id: "python", label: "Python", blocks: py },
        { id: "typescript", label: "TypeScript", blocks: ts },
        { id: "rust", label: "Rust", blocks: rs },
        { id: "cpp", label: "C++", blocks: cpp },
      ],
    },
  ],
};
