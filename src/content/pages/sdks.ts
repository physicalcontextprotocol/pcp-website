import type { PageDef, Block } from "../types";

/* Each SDK page shows every language as tabs — one URL per language in
   the sitemap, same comparable structure inside every tab. */

/* ── Python ──────────────────────────────────────────────────────────────── */
const py: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "pip install physicalcontextprotocol",
  },
  { kind: "p", text: "Python 3.9–3.12. Async throughout — the client is built on `asyncio`, and the test suites run with `pytest --asyncio-mode=auto`." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "python",
    title: "client.py",
    content: `from pcp import PCPClient

client = PCPClient()                 # name/version only — no URL
await client.connect_http("http://arm-01.local:8080")
await client.connect_http("http://127.0.0.1:7000/mcp")  # runs the handshake`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "python",
    title: "leases",
    content: `grant = await client.request_lease(
    zone_id="cell-north",
    duration_ms=30_000,
    bid_energy_j=120.0,
)
lease = grant["lease"]
# Check the state string; there is no LeaseDeniedError. A denial comes
# back as a normal grant with state != "ACTIVE".
if lease["state"] == "ACTIVE":
    await client.call_actuation("move_to", {"x": 0.4, "y": 0.0, "z": 0.2},
                                lease_token=lease["lease_id"])
    await client.release_lease(lease["lease_id"])`,
  },

  { kind: "h3", text: "Gate hooks (server side)" },
  {
    kind: "p",
    text: "The server-side classes are where the gates are wired. A deployment declares its constitution rules and shadow preview hook when constructing the server, and the gate sequence runs them in spec order for every `actuations/execute`:",
  },
  {
    kind: "code",
    lang: "python",
    title: "server.py",
    content: `from v05.pcp_v5_server import PCPServer
from v05.pcp_safety_v5 import SafetyConstitution, SafetyMiddleware, SpeedLimitRule

# constitution: rule semantics normative, thresholds are yours
constitution = SafetyConstitution(
    robot_id="arm-01",
    rules=[
        # m/s, non-normative default
        SpeedLimitRule(max_speed_m_s=1.0),
    ],
)

# every actuation runs constitution -> shadow -> execute
server = PCPServer(
    "arm-01",
    robot_class="arm",
    model="UR5e",
    safety=SafetyMiddleware(constitution),
)`,
  },

  { kind: "h3", text: "Triggering E-Stop" },
  {
    kind: "code",
    lang: "python",
    content: `# There is no handler to register. estop() is a first-class call
# that bypasses the lease/constitution/shadow gates entirely.
# source: "hardware_button" | "software_watchdog"
#         | "operator_console" | "gate_failure_escalation"
await client.estop(source="operator_console")`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "p",
    text: "Two exception classes carry the whole error surface: `PCPError` is the base, and `PCPClientError` is what the client raises. Both carry a `PCPErrorCode`, and the code — not the class — is what tells you what happened. Catch `PCPError` and branch on `.code`.",
  },
  {
    kind: "table",
    codeFirstCol: true,
    headers: ["code", "raised when"],
    rows: [
      ["`SHADOW_BLOCKED` (-33001)", "the shadow monitor predicted an unsafe trajectory — `data` carries the violations"],
      ["`CONSTITUTION_BLOCKED` (-33002)", "a constitution rule rejected the command"],
      ["`LEASE_REQUIRED` (-33003)", "zone lease denied or not held — `data` carries `deny_reason`"],
      ["`LEASE_EXPIRED` (-33004)", "the held lease expired before actuation"],
      ["`ESTOP_ACTIVE` (-33005)", "actuation attempted while the E-Stop latch is engaged"],
      ["`SPEED_LIMIT` (-33007)", "command exceeded the declared speed limit"],
      ["`ENERGY_BUDGET` (-33008)", "command exceeded the declared energy budget"],
      ["`PARSE_ERROR` … `INTERNAL_ERROR` (-32700…-32603)", "standard JSON-RPC transport and framing failures"],
    ],
  },

  { kind: "h3", text: "Language notes" },
  {
    kind: "p",
    text: "The package currently ships parallel implementations under `pcp/`, `sdk/`, and `v05/` — an inheritance of the pre-split monorepo, [flagged in the org's migration map](https://github.com/physicalcontextprotocol/pmcp-spec/blob/main/MIGRATION_MAP.md) with consolidation as the top-priority cleanup. Until the canonical implementation is chosen, target the `v05` namespaces in new code: they speak the current wire version, and they are what CI's smoke-import step pins.",
  },

  { kind: "h3", text: "Tests and conformance" },
  {
    kind: "p",
    text: "**159/160 tests passing** across the Python matrix (3.9–3.12) — 160 collected, 1 skip, and every collected test asserts on real SDK behaviour. To run the suite locally and against the conformance suite:",
  },
  {
    kind: "code",
    lang: "bash",
    title: "run the suite",
    content: `cd pmcp-python
pip install -e ".[dev,numerics]"
pytest --asyncio-mode=auto

cd ../pmcp-conformance
pip install -e .
pytest --asyncio-mode=auto -v`,
  },
  {
    kind: "p",
    text: "Both suites must pass on every PR — they are the two blocking CI checks. See [Conformance](/conformance) for what the suite covers.",
  },
];

/* ── TypeScript ──────────────────────────────────────────────────────────── */
const ts: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "npm install @physicalcontextprotocol/sdk",
  },
  { kind: "p", text: "Node 20 or newer, ESM. Published to npm as [`@physicalcontextprotocol/sdk`](https://www.npmjs.com/package/@physicalcontextprotocol/sdk). Types are generated from the same wire types the Python and Rust SDKs use — the schema is the source, the SDK is a projection." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "typescript",
    title: "client.ts",
    content: `import { PCPServerClient } from "@physicalcontextprotocol/sdk";

const client = new PCPServerClient({
  transport: "http",
  serverUrl: "http://127.0.0.1:7000/mcp",
});
await client.connect();       // transport + initialize handshake`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "typescript",
    title: "leases",
    content: `const lease = await client.requestLease(
  "arm-01",        // robotId
  "cell-north",    // zoneId
  30_000,          // durationMs
  120,             // bidEnergyJ
);
// lease.state is "GRANTED" | "DENIED" | ... - check it before acting

await client.callTool("move_to", { x: 0.4, y: 0.0, z: 0.2 },
  { lease_token: lease.lease_id });

const wasHeld = await client.releaseLease(lease.lease_id);`,
  },

  { kind: "h3", text: "Gate hooks (server side)" },
  {
    kind: "p",
    text: "A deployment declares its constitution rules and shadow preview hook when constructing the server; the gate sequence runs them in spec order for every `actuations/execute`:",
  },
  {
    kind: "code",
    lang: "typescript",
    title: "server.ts",
    content: `import { PCPServer, RateLimitMiddleware } from "@physicalcontextprotocol/sdk";

const server = new PCPServer({
  name: "arm-01",
  robotClass: "arm",
  model: "UR5e",
  host: "0.0.0.0",
  port: 7000,
});

// middleware wraps every actuation: constitution -> shadow -> execute
server
  .use(new RateLimitMiddleware(10, 20))
  .actuation(
    {
      name: "move",
      description: "Joint-space move",
      maxSpeedMs: 1.0,        // m/s, non-normative default
    },
    async (params) => ({
      success: true,
      robot_id: "arm-01",
      actuation_name: "move",
      output: params,
    }),
  );

await server.listen();`,
  },

  { kind: "h3", text: "E-Stop handler registration" },
  {
    kind: "code",
    lang: "typescript",
    content: `// No handler registration - estop is a request, and it is
// lease-independent: it bypasses every gate.
await client.setEstop(true);
await client.setEstop(false);`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "p",
    text: "The TypeScript SDK raises a single error class, `PCPClientError`, carrying a numeric `code`. Branch on the code rather than the class. Two getters do the range checks for you: `.isPcpError` is true for any protocol-defined code (-33999…-33000), and `.isSafetyError` is true for the codes that mean a gate stopped the motion.",
  },
  {
    kind: "table",
    codeFirstCol: true,
    headers: ["code", "thrown when"],
    rows: [
      ["`ShadowBlocked` (-33001)", "the shadow monitor predicted an unsafe trajectory"],
      ["`ConstitutionBlocked` (-33002)", "a constitution rule rejected the command"],
      ["`LeaseRequired` (-33003)", "zone lease denied or not held"],
      ["`LeaseExpired` (-33004)", "the held lease expired before actuation"],
      ["`EstopActive` (-33005)", "actuation attempted while the E-Stop latch is engaged"],
      ["`FloorGuard` (-33006)", "the commanded pose violated a floor-guard zone"],
      ["`SpeedLimit` (-33007)", "command exceeded the declared speed limit"],
      ["`EnergyBudget` (-33008)", "command exceeded the declared energy budget"],
      ["`HumanProximity` (-33009)", "a person entered the guarded zone mid-motion"],
      ["`ParseError` … `InternalError` (-32700…-32603)", "standard JSON-RPC transport and framing failures"],
    ],
  },

  { kind: "h3", text: "Language notes" },
  {
    kind: "p",
    text: "The SDK is currently **build-verified with its test suite still being filled in** — CI compiles and builds it on every change, but the language-level test matrix is thinner than Python's. The wire behavior it does exercise is checked by the shared [conformance suite](/conformance), which is the real gate: any TypeScript server that passes the suite speaks the protocol correctly regardless of how much of its own unit-test surface exists. Treat the Python SDK as the reference reading copy when behavior is ambiguous.",
  },

  { kind: "h3", text: "Tests and conformance" },
  {
    kind: "code",
    lang: "bash",
    title: "build and typecheck",
    content: `cd pmcp-typescript
npm install --no-audit --no-fund
npm run build`,
  },
  {
    kind: "p",
    text: "To run the shared conformance suite against a TypeScript server, point the suite's base URL at your process — see [Conformance](/conformance) for the fixture override.",
  },
];

/* ── Rust ────────────────────────────────────────────────────────────────── */
const rs: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "cargo add physicalcontextprotocol",
  },
  { kind: "p", text: "The `physicalcontextprotocol` crate from the [`pmcp-rust`](https://github.com/physicalcontextprotocol/pmcp-rust) repository. Tokio-based async runtime." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "p",
    text: "There is no high-level client type. The crate ships transports, and you drive JSON-RPC over the channels `Transport::connect` returns. A runnable two-process example is in [`pcp-core/examples/server_and_client.rs`](https://github.com/physicalcontextprotocol/pmcp-rust/blob/main/pcp-core/examples/server_and_client.rs).",
  },
  {
    kind: "code",
    lang: "rust",
    title: "client.rs",
    content: `use physicalcontextprotocol::{TcpClientTransport, Transport};
use std::net::SocketAddr;

let addr: SocketAddr = "127.0.0.1:7000".parse()?;
let (tx, mut rx) = TcpClientTransport::new(addr).connect().await?;

tx.send(serde_json::json!({
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": { "protocolVersion": "0.5" }
})).await?;

let handshake = rx.recv().await.unwrap();`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "rust",
    title: "leases",
    content: `tx.send(serde_json::json!({
    "jsonrpc": "2.0", "id": 2, "method": "lease/request",
    "params": { "zone_id": "cell-north", "duration_ms": 30_000 }
})).await?;

let grant = &rx.recv().await.unwrap()["result"];
// state is GRANTED / DENIED / EXPIRED / RELEASED — not a boolean
if grant["state"] == "GRANTED" {
    tx.send(serde_json::json!({
        "jsonrpc": "2.0", "id": 3, "method": "lease/release",
        "params": { "lease_id": grant["lease_id"] }
    })).await?;
}`,
  },

  { kind: "h3", text: "Gate hooks (server side)" },
  {
    kind: "code",
    lang: "rust",
    title: "server.rs",
    content: `let server = PCPServerBuilder::new("arm-01")
    .constitution_rule(Rule::VelocityCap(1.0))        // CONST-01
    .constitution_rule(Rule::EnergyBudget(50_000))    // CONST-03
    .shadow_preview(shadow::predict_and_approve)
    .bind("0.0.0.0:7000")
    .build()
    .await?;

server.run().await?;`,
  },

  { kind: "h3", text: "E-Stop handler registration" },
  {
    kind: "code",
    lang: "rust",
    content: `// Estop is a request, not a subscription - there is no
// handler to register and no notification to await.
while let Some(message) = rx.recv().await {
    // \`pcp/estop\` arrives as a JSON-RPC notification (no "id").
    if message["method"] == "pcp/estop" {
        let active = message["params"]["active"].as_bool().unwrap_or(true);
        LATCHED.store(active, Ordering::SeqCst);
    }
}`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "p",
    text: "Failures arrive two ways. A transport or protocol problem is a `PcpError`; a policy refusal — lease denied, constitution rule violated, shadow rejected, E-Stop latched — is a **successful JSON-RPC response** whose payload says so. Both are matched on the same error enum:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "error",
    content: `use physicalcontextprotocol::{PcpError, PcpErrorCode};

// Transport / protocol failures
match transport.connect().await {
    Ok(channels) => {}
    Err(PcpError::Transport(e)) => { /* connection */ }
    Err(PcpError::MethodNotFound { .. }) => { /* server is older */ }
    Err(other) => return Err(other.into()),
}

// Policy refusals are NOT errors — inspect the payload
let reply = send(tools_call).await?;
if reply["error"]["code"] == PcpErrorCode::ConstitutionViolation as i64 {
    // e.g. CONST-01
}`,
  },

  { kind: "h3", text: "Language notes — sharing one connection" },
  {
    kind: "p",
    text: "There is no client handle to clone, because there is no client object. `connect()` hands you a `(mpsc::Sender<Value>, mpsc::Receiver<Value>)` pair, and `Sender` is `Clone` — so the pattern for concurrent work is to clone the **sender** into each task and keep a single reader task that demultiplexes responses by `id`:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "the correct pattern",
    content: `// Clone the Sender, never share the Receiver: mpsc::Receiver has no
// clone impl, so exactly one task may consume inbound messages.

let writer = tx.clone();
tokio::spawn(async move {
    writer.send(serde_json::json!({
        "jsonrpc": "2.0", "id": 2, "method": "lease/request",
        "params": { "zone_id": "cell-north", "duration_ms": 30_000 }
    })).await?;
    Ok::<_, PcpError>(())
});

// one reader owns rx and routes replies to whichever task is waiting
while let Some(message) = rx.recv().await {
    match message["id"].as_u64() {
        Some(1) => { /* handshake reply */ }
        Some(2) => { /* lease grant */ }
        _ => { /* notification, e.g. pcp/estop — no "id" */ }
    }
}`,
  },
  {
    kind: "p",
    text: "One build quirk to know about: `physicalcontextprotocol`'s optional `python` feature gates the pyo3 bindings, and plain `cargo build` needs the extension-module environment only when that feature is enabled. The pure-Rust path — `cargo build` with default features — is the supported one for SDK use.",
  },

  { kind: "h3", text: "Tests and conformance" },
  {
    kind: "p",
    text: "**43/43 tests passing.** To run them locally:",
  },
  {
    kind: "code",
    lang: "bash",
    title: "run the suite",
    content: `cd pmcp-rust/pcp-core
cargo test`,
  },
  {
    kind: "p",
    text: "The shared [conformance suite](/conformance) is Python-based; to run it against a Rust server, launch the server on an HTTP port and override the suite's base-URL fixture — see [Conformance](/conformance).",
  },
];

/* ── C++ ─────────────────────────────────────────────────────────────────── */
const cpp: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: `git clone https://github.com/physicalcontextprotocol/pmcp-cpp
cmake -S pmcp-cpp -B pmcp-build -DPMCP_WITH_ROS2=OFF
cmake --install pmcp-build`,
  },
  { kind: "p", text: "C++20, CMake 3.20 or newer. Headers live under `pmcp/` (`pmcp/client.hpp`, `pmcp/server.hpp`, `pmcp/safety.hpp`, `pmcp/dialect.hpp`). Consume the installed package with `find_package(pmcp REQUIRED)` and `target_link_libraries(... pmcp::pmcp)`, or vendor the source with `FetchContent`. There is no package-manager release yet — a vcpkg port is in review." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "cpp",
    title: "client.cpp",
    content: `#include "pmcp/client.hpp"

pmcp::Client::Config cfg;
cfg.dialect = pmcp::Dialect::kPython;   // kSpec | kPython | kV05 | kConformance
cfg.name = "my-client";
pmcp::Client client(cfg);
client.connect_http("http://127.0.0.1:7000/mcp");`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "cpp",
    title: "leases",
    content: `auto lease = client.request_lease("cell-north", "arm-01", 30'000);
auto lease_id = lease["lease"]["lease_id"];
// call_actuation carries the lease token; a gate refusal throws pmcp::Error
auto out = client.call_actuation("move_to", {{"x", 0.4}, {"y", 0.0}, {"z", 0.2}},
                                 lease_id);
client.release_lease(lease_id);

// safe_actuation runs the whole pipeline in one call:
// shadow preview -> lease -> actuation -> release
client.safe_actuation("move_to", {{"x", 0.4}, {"y", 0.0}, {"z", 0.2}}, "cell-north");`,
  },

  { kind: "h3", text: "Gate hooks (server side)" },
  {
    kind: "p",
    text: "A `pmcp::Server` owns the safety pipeline; actuations are registered with their spec and a handler, and the gate order (E-stop → lease → constitution → shadow → execute) runs on every gated call:",
  },
  {
    kind: "code",
    lang: "cpp",
    title: "server.cpp",
    content: `#include "pmcp/server.hpp"

pmcp::ServerConfig cfg;
cfg.name = "arm-01";
cfg.version = "1.0.0";
cfg.robot_id = "arm-01";
pmcp::Server server(cfg);

pmcp::ActuationSpec move;
move.name = "move_to";
move.description = "Move the tool centre point to an XYZ target";
move.max_speed_m_s = 1.0;             // m/s, non-normative default
move.parameters = {
    {"x", "number", "x target in metres"},
    {"y", "number", "y target in metres"},
    {"z", "number", "z target in metres"},
};
server.register_actuation(move, [](const pmcp::json& args) {
    return pmcp::json{{"ok", true}};
});

server.listen_http(8080);   // serves /pcp, /mcp and / on the same socket`,
  },

  { kind: "h3", text: "Triggering E-Stop" },
  {
    kind: "code",
    lang: "cpp",
    content: `client.estop(true);        // latch; bypasses every gate
client.estop_reset();      // explicit clear - the only path that resets it`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "p",
    text: "A JSON-RPC error is raised as a `pmcp::Error` carrying a `pmcp::Code` — a blocked actuation (E-Stop, constitution, shadow) arrives here as `kEstopActive`, `kConstitutionBlocked`, and so on, not as an error-shaped result. Catch `pmcp::Error` and branch on its code.",
  },
  {
    kind: "table",
    codeFirstCol: true,
    headers: ["code", "raised when"],
    rows: [
      ["`kShadowBlocked` (-33001)", "the shadow preview predicted an unsafe trajectory"],
      ["`kConstitutionBlocked` (-33002)", "a constitution rule rejected the command"],
      ["`kLeaseRequired` (-33003)", "zone lease denied or not held"],
      ["`kLeaseExpired` (-33004)", "the held lease expired before actuation"],
      ["`kEstopActive` (-33005)", "actuation attempted while the E-Stop latch is engaged"],
      ["`kSpeedLimit` (-33007)", "command exceeded the declared speed limit"],
      ["`kEnergyBudget` (-33008)", "command exceeded the declared energy budget"],
    ],
  },

  { kind: "h3", text: "Language notes — four wire dialects, one binary" },
  {
    kind: "p",
    text: "The reference SDKs do not all agree on the wire, and `pmcp-cpp` reconciles every in-flight dialect in a single binary. `Dialect::kAuto` (the default) answers each caller in the spelling it used; the four it understands are `kSpec` (`pmcp-spec` §7 — `actuations/call`, `lease/request`, `pmcp/estop`), `kPython` (`pmcp-python/pcp`), `kV05` (`pmcp-python/v05`, `pmcp-rust`, `pmcp-typescript`), and `kConformance` (`pmcp-conformance` — `actuations/execute`, `leases/acquire`, `safety/estop/engage`).",
  },

  { kind: "h3", text: "Tests and conformance" },
  {
    kind: "p",
    text: "**72 unit tests passing, plus 17 interop checks** driven against the real `pmcp-python` client and server. To run them locally:",
  },
  {
    kind: "code",
    lang: "bash",
    title: "run the suite",
    content: `cd pmcp-cpp
cmake -S . -B build -DPMCP_WITH_ROS2=OFF
cmake --build build -j
ctest --test-dir build --output-on-failure`,
  },
  {
    kind: "p",
    text: "The interop driver **skips** (rather than fails) when the sibling `pmcp-python` repo is absent. The shared [conformance suite](/conformance) run against a C++ server is pending — see [Conformance](/conformance).",
  },
];

const tabsBlock = (defaultTab: string): Block => ({
  kind: "tabs",
  defaultTab,
  tabs: [
    { id: "python", label: "Python", blocks: py },
    { id: "typescript", label: "TypeScript", blocks: ts },
    { id: "rust", label: "Rust", blocks: rs },
    { id: "cpp", label: "C++", blocks: cpp },
  ],
});

const intro: Block[] = [
  {
    kind: "p",
    text: "The Python, TypeScript, and Rust SDKs implement the same wire format against the same schema, so their APIs mirror each other deliberately: same client construction, same lease methods, same gate hooks, same exception taxonomy with language-appropriate shapes. The C++ SDK speaks the same protocol and additionally reconciles every in-flight dialect in one binary. They are all documented side by side — switch tabs to compare directly.",
  },
];

export const sdkPythonPage: PageDef = {
  route: "/sdks/python",
  title: "Python",
  blocks: [
    { kind: "h1", text: "SDKs — Python" },
    ...intro,
    tabsBlock("python"),
  ],
};

export const sdkTypescriptPage: PageDef = {
  route: "/sdks/typescript",
  title: "TypeScript",
  blocks: [
    { kind: "h1", text: "SDKs — TypeScript" },
    ...intro,
    tabsBlock("typescript"),
  ],
};

export const sdkRustPage: PageDef = {
  route: "/sdks/rust",
  title: "Rust",
  blocks: [
    { kind: "h1", text: "SDKs — Rust" },
    ...intro,
    tabsBlock("rust"),
  ],
};

export const sdkCppPage: PageDef = {
  route: "/sdks/cpp",
  title: "C++",
  blocks: [
    { kind: "h1", text: "SDKs — C++" },
    ...intro,
    tabsBlock("cpp"),
  ],
};
