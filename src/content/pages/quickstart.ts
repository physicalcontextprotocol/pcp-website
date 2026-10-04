import type { PageDef, Block } from "../types";

/* ── Python tab ─────────────────────────────────────────────────────────── */
const py: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "pip install pmcp",
  },
  {
    kind: "p",
    text: "Python 3.9 or newer. The package publishes to PyPI from the [`pmcp-python`](https://github.com/physicalcontextprotocol/pmcp-python) repository on every `v*.*.*` tag.",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "p",
    text: "Create a client against a PMCP server, run the JSON-RPC `initialize` handshake, then treat the zone you intend to act in as a leased resource. Acquire before you act; release when you are done — including on the denial path, so the zone is never left ambiguous.",
  },
  {
    kind: "code",
    lang: "python",
    title: "lease.py",
    content: `from pmcp import PMCPClient

client = PMCPClient("http://127.0.0.1:7000/mcp")
client.initialize()   # JSON-RPC handshake, protocolVersion "0.5"

# 1. acquire the zone you intend to act in
lease = client.leases_acquire(
    zone_id="cell-north",
    duration_ms=30_000,
)

if not lease.granted:
    # denial carries the current holder and its expiry — back off
    # and retry after the lease lapses, never around it
    print(f"denied: zone held until {lease.expires_ms}")
else:
    try:
        result = client.actuations_execute("move_to", x=0.4, y=0.0, z=0.2)
        print(result.success, result.final_pose)
    finally:
        # 2. always release, including on error paths
        client.leases_release(lease.lease_id)`,
  },

  { kind: "h3", text: "Register an E-Stop handler" },
  {
    kind: "p",
    text: "E-Stop notifications arrive as `pmcp/estop` messages whenever any participant engages the latch. Register a handler before your first actuation so the callback is live from the start:",
  },
  {
    kind: "code",
    lang: "python",
    title: "estop.py",
    content: `def on_estop(reason: str, source: str) -> None:
    # drop to a safe state immediately; the latch stays engaged
    # until an explicit safety/estop/disengage — do not resume here
    client.abort_motion()
    print(f"E-STOP from {source}: {reason}")

client.on_estop(on_estop)`,
  },
  {
    kind: "p",
    text: "Full API reference: [Python SDK](/sdks/python). Runnable examples: [`pmcp-servers/examples`](https://github.com/physicalcontextprotocol/pmcp-servers) in the `pmcp-servers` repository.",
  },
];

/* ── TypeScript tab ─────────────────────────────────────────────────────── */
const ts: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "npm install @physicalcontextprotocol/pmcp",
  },
  {
    kind: "p",
    text: "Node 20 or newer. Source lives in the [`pmcp-typescript`](https://github.com/physicalcontextprotocol/pmcp-typescript) repository. The SDK is currently build-verified with its test suite still being filled in — see [Conformance](/conformance) for the current status matrix.",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "code",
    lang: "typescript",
    title: "lease.ts",
    content: `import { PMCPClient } from "@physicalcontextprotocol/pmcp";

const client = new PMCPClient("http://127.0.0.1:7000/mcp");
await client.initialize();   // JSON-RPC handshake, protocolVersion "0.5"

// 1. acquire the zone you intend to act in
const lease = await client.leasesAcquire({
  zoneId: "cell-north",
  durationMs: 30_000,
});

if (!lease.granted) {
  // denial carries the current holder and its expiry — back off
  // and retry after the lease lapses, never around it
  console.log(\`denied: zone held until \${lease.expiresMs}\`);
} else {
  try {
    const result = await client.actuationsExecute("move_to", {
      x: 0.4, y: 0.0, z: 0.2,
    });
    console.log(result.success, result.finalPose);
  } finally {
    // 2. always release, including on error paths
    await client.leasesRelease(lease.leaseId);
  }
}`,
  },

  { kind: "h3", text: "Register an E-Stop handler" },
  {
    kind: "p",
    text: "E-Stop notifications arrive as `pmcp/estop` messages whenever any participant engages the latch. Register a handler before your first actuation so the callback is live from the start:",
  },
  {
    kind: "code",
    lang: "typescript",
    title: "estop.ts",
    content: `client.onEstop((event) => {
  // drop to a safe state immediately; the latch stays engaged
  // until an explicit safety/estop/disengage — do not resume here
  awaitSafeStop();
  console.log(\`E-STOP from \${event.source}: \${event.reason}\`);
});`,
  },
  {
    kind: "p",
    text: "Full API reference: [TypeScript SDK](/sdks/typescript). Runnable examples: [`pmcp-servers/examples`](https://github.com/physicalcontextprotocol/pmcp-servers) in the `pmcp-servers` repository.",
  },
];

/* ── Rust tab ───────────────────────────────────────────────────────────── */
const rs: Block[] = [
  { kind: "h3", text: "Install" },
  {
    kind: "code",
    lang: "bash",
    title: "install",
    content: "cargo add pmcp-core",
  },
  {
    kind: "p",
    text: "Source lives in the [`pmcp-rust`](https://github.com/physicalcontextprotocol/pmcp-rust) repository (`pmcp-core` crate). Rust's async client is `Clone` — the correct concurrency pattern is documented in [Rust SDK notes](/sdks/rust).",
  },

  { kind: "h3", text: "Request a lease, handle denial, release" },
  {
    kind: "code",
    lang: "rust",
    title: "lease.rs",
    content: `use pmcp_core::PMCPClient;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // PMCPClient is Clone — each clone is a cheap handle over the
    // same connection; spawn tasks with clones, not references
    let client = PMCPClient::connect("http://127.0.0.1:7000/mcp").await?;
    client.initialize().await?;   // protocolVersion "0.5"

    // 1. acquire the zone you intend to act in
    let lease = client
        .leases_acquire("cell-north", 30_000)
        .await?;

    if !lease.granted {
        // denial carries the current holder and its expiry
        println!("denied: zone held until {}", lease.expires_ms);
    } else {
        let result = client
            .actuations_execute("move_to", json!({ "x": 0.4, "y": 0.0, "z": 0.2 }))
            .await;
        // 2. always release, including on error paths
        client.leases_release(&lease.lease_id).await?;
        println!("{}", result?.success);
    }
    Ok(())
}`,
  },

  { kind: "h3", text: "Register an E-Stop handler" },
  {
    kind: "p",
    text: "E-Stop notifications arrive as `pmcp/estop` messages whenever any participant engages the latch. Register a handler before your first actuation so the callback is live from the start:",
  },
  {
    kind: "code",
    lang: "rust",
    title: "estop.rs",
    content: `// handler runs on the client's notification task —
// it must be fast and must not block: signal your control
// loop through an atomic or a channel
static LATCHED: AtomicBool = AtomicBool::new(false);

client.on_estop(|event| {
    LATCHED.store(true, Ordering::SeqCst);
    eprintln!("E-STOP from {}: {}", event.source, event.reason);
});`,
  },
  {
    kind: "p",
    text: "Full API reference: [Rust SDK](/sdks/rust). Runnable examples: [`pmcp-servers/examples`](https://github.com/physicalcontextprotocol/pmcp-servers) in the `pmcp-servers` repository.",
  },
];

export const quickstartPage: PageDef = {
  route: "/quickstart",
  title: "Quickstart",
  blocks: [
    { kind: "h1", text: "Quickstart" },
    {
      kind: "p",
      text: "Working code in under five minutes, per language. All three tabs do the same thing against the same wire format: connect, request a lease, handle denial honestly, release, and arm an E-Stop handler. A PMCP server must be reachable at an HTTP endpoint — the reference servers in [`pmcp-servers`](/servers) are the fastest way to get one running.",
    },
    {
      kind: "p",
      text: "The three SDKs are kept deliberately comparable: one JSON Schema 2020-12 source of truth, one conformance suite, three languages. If you know one, you should be able to read the others at a glance.",
    },
    {
      kind: "tabs",
      tabs: [
        { id: "python", label: "Python", blocks: py },
        { id: "typescript", label: "TypeScript", blocks: ts },
        { id: "rust", label: "Rust", blocks: rs },
      ],
    },
  ],
};
