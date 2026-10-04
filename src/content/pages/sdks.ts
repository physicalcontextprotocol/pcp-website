import type { PageDef, Block } from "../types";

/* Each SDK page shows all three languages as tabs — one URL per language in
   the sitemap, same comparable structure inside every tab. */

/* ── Python ──────────────────────────────────────────────────────────────── */
const py: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "pip install pmcp",
  },
  { kind: "p", text: "Python 3.9–3.12. Async throughout — the client is built on `asyncio`, and the test suites run with `pytest --asyncio-mode=auto`." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "python",
    title: "client.py",
    content: `from pmcp import PMCPClient

client = PMCPClient("http://127.0.0.1:7000/mcp")
client.initialize()  # handshake; raises on version mismatch`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "python",
    title: "leases",
    content: `lease = client.leases_acquire(
    zone_id="cell-north",
    duration_ms=30_000,
)
# LeaseDeniedError carries holder + expires_ms for backing off

client.leases_release(lease.lease_id)  # returns bool: was it held`,
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
    content: `from v05.pmcp_v5_server import PMCPServer

server = PMCPServer(robot_id="arm-01", endpoint="/mcp")

# constitution: rule semantics normative, thresholds are yours
server.add_constitution_rules([
    {"id": "CONST-01", "semantics": "velocity_cap",
     "threshold": 1.0},                 # m/s, non-normative default
    {"id": "CONST-03", "semantics": "energy_budget",
     "threshold": 50_000},              # J
])

# shadow preview: validate the plan immediately before execution
server.set_shadow_preview(shadow.predict_and_approve)

server.serve(port=7000)`,
  },

  { kind: "h3", text: "E-Stop handler registration" },
  {
    kind: "code",
    lang: "python",
    content: `def on_estop(reason: str, source: str) -> None:
    client.abort_motion()

client.on_estop(on_estop)`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "table",
    codeFirstCol: true,
    headers: ["exception", "raised when"],
    rows: [
      ["PMCPError", "base class for every protocol-defined failure"],
      ["PMCPConnectionError", "transport failure or handshake rejection"],
      ["LeaseDeniedError", "zone conflict — carries holder and expires_ms"],
      ["ConstitutionViolationError", "a rule rejected the command — carries the rule id (e.g. CONST-01)"],
      ["ShadowRejectedError", "the shadow monitor predicted an unsafe outcome"],
      ["EStopLatchedError", "actuation attempted while the latch is engaged"],
    ],
  },

  { kind: "h3", text: "Language notes" },
  {
    kind: "p",
    text: "The package currently ships parallel implementations under `pmcp/`, `sdk/`, and `v05/` — an inheritance of the pre-split monorepo, [flagged in the org's migration map](https://github.com/physicalcontextprotocol/pmcp-org/blob/main/MIGRATION_MAP.md) with consolidation as the top-priority cleanup. Until the canonical implementation is chosen, target the `v05` namespaces in new code: they speak the current wire version, and they are what CI's smoke-import step pins.",
  },

  { kind: "h3", text: "Tests and conformance" },
  {
    kind: "p",
    text: "**213/213 tests passing** across the Python matrix (3.9–3.12). To run the suite locally and against the conformance suite:",
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
    content: "npm install @physicalcontextprotocol/pmcp",
  },
  { kind: "p", text: "Node 20 or newer, ESM. Types are generated from the same wire types the Python and Rust SDKs use — the schema is the source, the SDK is a projection." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "typescript",
    title: "client.ts",
    content: `import { PMCPClient } from "@physicalcontextprotocol/pmcp";

const client = new PMCPClient("http://127.0.0.1:7000/mcp");
await client.initialize();  // handshake; throws on version mismatch`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "typescript",
    title: "leases",
    content: `const lease = await client.leasesAcquire({
  zoneId: "cell-north",
  durationMs: 30_000,
});
// LeaseDeniedError carries holder + expiresMs for backing off

await client.leasesRelease(lease.leaseId);  // returns was-held`,
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
    content: `import { PMCPServer } from "@physicalcontextprotocol/pmcp";

const server = new PMCPServer({ robotId: "arm-01", endpoint: "/mcp" });

// constitution: rule semantics normative, thresholds are yours
server.addConstitutionRules([
  { id: "CONST-01", semantics: "velocity_cap", threshold: 1.0 },
  { id: "CONST-03", semantics: "energy_budget", threshold: 50_000 },
]);

// shadow preview: validate the plan immediately before execution
server.setShadowPreview(shadow.predictAndApprove);

await server.serve(7000);`,
  },

  { kind: "h3", text: "E-Stop handler registration" },
  {
    kind: "code",
    lang: "typescript",
    content: `client.onEstop((event) => {
  // keep it fast — signal the control loop, don't do work here
  safeStop.flag();
});`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "table",
    codeFirstCol: true,
    headers: ["error", "thrown when"],
    rows: [
      ["PMCPError", "base class for every protocol-defined failure"],
      ["PMCPConnectionError", "transport failure or handshake rejection"],
      ["LeaseDeniedError", "zone conflict — carries holder and expiresMs"],
      ["ConstitutionViolationError", "a rule rejected the command — carries the rule id"],
      ["ShadowRejectedError", "the shadow monitor predicted an unsafe outcome"],
      ["EStopLatchedError", "actuation attempted while the latch is engaged"],
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
    content: "cargo add pmcp-core",
  },
  { kind: "p", text: "The `pmcp-core` crate from the [`pmcp-rust`](https://github.com/physicalcontextprotocol/pmcp-rust) repository. Tokio-based async runtime." },

  { kind: "h3", text: "Client construction" },
  {
    kind: "code",
    lang: "rust",
    title: "client.rs",
    content: `let client = PMCPClient::connect("http://127.0.0.1:7000/mcp").await?;
client.initialize().await?;  // handshake; errors on version mismatch`,
  },

  { kind: "h3", text: "Lease methods" },
  {
    kind: "code",
    lang: "rust",
    title: "leases",
    content: `let lease = client
    .leases_acquire("cell-north", 30_000)
    .await?;
// Error::LeaseDenied { holder, expires_ms } — back off and retry later

client.leases_release(&lease.lease_id).await?;  // bool: was it held`,
  },

  { kind: "h3", text: "Gate hooks (server side)" },
  {
    kind: "code",
    lang: "rust",
    title: "server.rs",
    content: `let server = PMCPServerBuilder::new("arm-01")
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
    content: `// handler runs on the notification task — keep it fast;
// signal your control loop through an atomic or channel
static LATCHED: AtomicBool = AtomicBool::new(false);

client.on_estop(|event| {
    LATCHED.store(true, Ordering::SeqCst);
});`,
  },

  { kind: "h3", text: "Error handling" },
  {
    kind: "p",
    text: "One error enum, pattern-matched — every protocol failure is a variant with the data you need to react:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "error",
    content: `match client.actuations_execute("move_to", params).await {
    Ok(result)                  => { /* success, final_pose, energy */ }
    Err(Error::LeaseDenied { holder, expires_ms }) => { /* back off */ }
    Err(Error::ConstitutionViolation { rule })     => { /* rule id, e.g. CONST-01 */ }
    Err(Error::ShadowRejected { reason })          => { /* monitor veto */ }
    Err(Error::EStopLatched)                       => { /* latch is set */ }
    Err(Error::Transport(e))                       => { /* connection */ }
}`,
  },

  { kind: "h3", text: "Language notes — async Clone" },
  {
    kind: "p",
    text: "The client handle is `Clone`, and this is worth documenting explicitly because it was a real bug: earlier revisions of `pmcp-core` held the connection as a borrowed field, which made the client unusable across `await` points in spawned tasks — the borrow checker rejected every natural concurrency pattern. The fix landed and is covered by regression tests, but the **correct pattern** is worth stating once so it is not re-discovered the hard way:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "the correct pattern",
    content: `// PMCPClient is Clone — a clone is a cheap handle (Arc) over
// the SAME connection. Clone into tasks; never hold &mut across await.

let handle = client.clone();
tokio::spawn(async move {
    // this task owns its handle — no borrows of the original
    let lease = handle.leases_acquire("cell-north", 30_000).await?;
    handle.leases_release(&lease.lease_id).await?;
    Ok::<_, Error>(())
});

// the original client remains usable on the main task`,
  },
  {
    kind: "p",
    text: "One build quirk to know about: `pmcp-core`'s optional `python` feature gates the pyo3 bindings, and plain `cargo build` needs the extension-module environment only when that feature is enabled. The pure-Rust path — `cargo build` with default features — is the supported one for SDK use.",
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
    content: `cd pmcp-rust/pmcp-core
cargo test`,
  },
  {
    kind: "p",
    text: "The shared [conformance suite](/conformance) is Python-based; to run it against a Rust server, launch the server on an HTTP port and override the suite's base-URL fixture — see [Conformance](/conformance).",
  },
];

const tabsBlock = (defaultTab: string): Block => ({
  kind: "tabs",
  defaultTab,
  tabs: [
    { id: "python", label: "Python", blocks: py },
    { id: "typescript", label: "TypeScript", blocks: ts },
    { id: "rust", label: "Rust", blocks: rs },
  ],
});

const intro: Block[] = [
  {
    kind: "p",
    text: "All three SDKs implement the same wire format against the same schema, so their APIs mirror each other deliberately: same client construction, same lease methods, same gate hooks, same exception taxonomy with language-appropriate shapes. They are documented side by side — switch tabs to compare directly.",
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
