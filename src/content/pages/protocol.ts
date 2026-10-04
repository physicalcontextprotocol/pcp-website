import type { PageDef } from "../types";

export const protocolOverviewPage: PageDef = {
  route: "/protocol/overview",
  title: "Protocol Overview",
  blocks: [
    { kind: "h1", text: "Protocol Overview" },

    {
      kind: "p",
      text: 'A "protocol" here means two things together: a **wire format** — exact JSON-RPC 2.0 messages with a JSON Schema 2020-12 definition — and a set of **required behaviors** — what a conforming implementation must do when those messages arrive. It is not a specific implementation, not a library, and not a framework. Anything that speaks the wire format and honors the required behaviors is a PMCP implementation, whether it is written in Python, Rust, or something that does not exist yet.',
    },
    {
      kind: "p",
      text: "The wire format lives in the [`pmcp-spec`](https://github.com/physicalcontextprotocol/pmcp-spec) repository. The three official SDKs — [Python](/sdks/python), [TypeScript](/sdks/typescript), [Rust](/sdks/rust) — are not the protocol; they are conforming clients for it, all validated against the same schema source of truth. A fourth SDK is not a fork of the protocol, it is another client. See [Conformance](/conformance) for what that claim has to mean before you make it.",
    },

    { kind: "h2", text: "The gate sequence" },
    {
      kind: "p",
      text: "Every actuation request passes three gates in a fixed order: **Lease → Constitution → Shadow**. The order is part of the specification. An implementation cannot reorder the gates, skip one, or make the sequence configurable and still claim conformance — [Gates](/protocol/gates) explains what each one checks and why the sequence is fixed.",
    },
    {
      kind: "p",
      text: "Briefly: the order follows from what each gate needs to be true before it can do its job. The Constitution check is only meaningful for an agent that already holds the lease for the space it is about to act in — otherwise the rule evaluation would be racing against other agents' claims. The Shadow monitor is only worth running on a command that has already passed both, because shadow validation is the most expensive stage and the last line before hardware. Checking in any other order wastes the expensive checks on requests that cheap ones would have rejected, and more importantly, creates windows where a command is validated against a constitution for space the agent no longer holds.",
    },

    { kind: "h2", text: "E-Stop is not gate four" },
    {
      kind: "p",
      text: "E-Stop is deliberately outside the sequence. It is a separate path that cuts across all three gates, engages as a latch, and stays engaged until it is explicitly reset. It never queues behind anything, and it never depends on the state of the gate pipeline. See [E-Stop](/protocol/estop).",
    },

    { kind: "h2", text: "Where to go next" },
    {
      kind: "list",
      items: [
        "[Gates](/protocol/gates) — Lease, Constitution, and Shadow in detail",
        "[Leases & Fencing](/protocol/leases-fencing) — the full lease model and fencing tokens",
        "[E-Stop](/protocol/estop) — latch semantics",
        "[Wire Format](/protocol/wire-format) — every message, every error code",
      ],
    },
  ],
};

export const protocolGatesPage: PageDef = {
  route: "/protocol/gates",
  title: "Gates",
  blocks: [
    { kind: "h1", text: "Gates" },
    {
      kind: "p",
      text: "Three gates stand between an agent's request and physical actuation. Each gate answers one question, in order, and a request that fails any gate never reaches hardware. The gates are specification-level constructs: the questions they ask and the order they ask them in are normative, even where the thresholds they compare against are deliberately not.",
    },

    { kind: "h2", text: "Lease" },
    {
      kind: "p",
      text: "The Lease gate answers: **does this agent currently hold exclusive rights to the space and resources this command will use?** Before the gate evaluates anything, it checks the lease store for the zones the command's motion profile intersects. If another agent holds a lease that overlaps — spatially or temporally — the request is denied, and the denial tells the requester who holds the zone and for how long, so backing off is a decision with real data instead of a guess.",
    },
    {
      kind: "p",
      text: "Spatial overlap detection is not a linear scan. Leases are indexed in an R\\*-tree keyed by occupied volume, so conflict checks stay sub-linear as the number of concurrent agents grows. The full model — lease states, expiry, renewal, fencing tokens — is on [Leases & Fencing](/protocol/leases-fencing).",
    },

    { kind: "h2", text: "Constitution" },
    {
      kind: "p",
      text: "The Constitution gate answers: **does this specific command satisfy the safety rules declared for this deployment?** A constitution is a set of named rules — `CONST-01` through `CONST-08` in the reference deployment — that every command is evaluated against. Rules cover velocity caps, energy budgets, and keep-out distances, among others.",
    },
    {
      kind: "p",
      text: "The specification is deliberately split on what is normative: the **rule semantics** are normative — a conforming deployment must enforce a velocity cap, an energy budget, and a minimum approach distance — but the **numeric thresholds** (2.0 m/s, 50 000 J, 0.5 m, …) are non-normative reference defaults sized for a small collaborative arm. A deployment running heavier or faster hardware is expected to declare its own numbers, not inherit a generic robot's. Where a rule and an actuation's own input schema disagree, the tighter bound applies — `move_to`'s input schema caps speed at 1.0 m/s, which is tighter than the `CONST-01` default of 2.0 m/s, so 1.0 m/s is the enforced ceiling for that actuation.",
    },
    {
      kind: "p",
      text: "How rules are declared: a deployment ships its constitution as data alongside its server configuration — rule identifiers, semantics, and thresholds — and the server evaluates each incoming command against every applicable rule. A command that violates any rule is rejected with the rule's identifier, so failures are attributable rather than a generic denial.",
    },

    { kind: "h2", text: "Shadow" },
    {
      kind: "p",
      text: "The Shadow gate answers: **does a validated monitor agree this plan is safe, immediately before execution?** It is the Simplex pattern — a monitor-controller paired with the command being validated. The proposed command runs in a shadow evaluation: the monitor model advances the robot's state under the proposed command and checks the resulting trajectory against the same safety envelope the Constitution declared. Only if the shadow agrees does the command execute on hardware.",
    },
    {
      kind: "p",
      text: "\"Validated before execution\" means concretely: the shadow's predicted outcome for this exact command, at this point in time, with the current state estimate — not a cached verdict from a similar command, and not a class-level certification of the actuation. The prediction and the approval happen in the same request cycle as the actuation. This is the last gate before hardware, which is also why it is the last in the sequence: it is the most expensive check, and running it on commands that would already have been denied by Lease or Constitution is wasted validation.",
    },

    { kind: "h2", text: "Gate order is fixed" },
    {
      kind: "note",
      label: "normative",
      text: "The sequence **E-Stop → Lease → Constitution → Shadow** is fixed by the specification. An implementation that reorders the gates, makes the order configurable, or executes commands on paths that bypass any gate cannot claim conformance — regardless of what its documentation says. The [conformance suite](/conformance) tests gate ordering as one of its first checks.",
    },
  ],
};

export const protocolEstopPage: PageDef = {
  route: "/protocol/estop",
  title: "E-Stop",
  blocks: [
    { kind: "h1", text: "E-Stop" },
    {
      kind: "p",
      text: "E-Stop is the protocol's emergency path: any participant can engage it at any time, for any reason, and it halts gated actuation across the deployment. It is specified as a latch — once engaged, it stays engaged until an explicit reset succeeds. There is no automatic re-arm, no timeout-based clearing, and no way for the participant that triggered it to silently withdraw it later.",
    },

    { kind: "h2", text: "Wire form" },
    {
      kind: "p",
      text: "The RPC pair is `safety/estop/engage` and `safety/estop/disengage` over the same JSON-RPC 2.0 channel as everything else, plus a broadcast notification `pmcp/estop` that fans out to all connected clients the moment the latch engages:",
    },
    {
      kind: "code",
      lang: "json",
      title: "pmcp/estop — notification",
      content: `{
  "jsonrpc": "2.0",
  "method": "pmcp/estop",
  "params": {
    "type": "pmcp/estop",
    "engaged": true,
    "reason": "operator-panic",
    "source": "operator-console-2",
    "timestamp_ms": 1767225600123,
    "zone_ids": ["cell-north", "cell-south"]
  }
}`,
    },
    {
      kind: "code",
      lang: "json",
      title: "safety/estop/engage — request / response",
      content: `// request
{ "jsonrpc": "2.0", "id": 41,
  "method": "safety/estop/engage",
  "params": { "reason": "obstacle-in-cell" } }

// response
{ "jsonrpc": "2.0", "id": 41, "result": { "engaged": true } }`,
    },
    {
      kind: "p",
      text: "`engaged: false` never appears in a notification — disengage is not broadcast as an all-clear. Clients are expected to re-derive safe state through `initialize` and fresh lease acquisition rather than trust a resumption signal, so a missed or spoofed \"all clear\" cannot cause motion.",
    },

    { kind: "h2", text: "Why it bypasses the gate sequence" },
    {
      kind: "p",
      text: "E-Stop is not gate four, and the difference is load-bearing. The gate sequence exists to decide whether a command is **allowed** to run. E-Stop exists to make everything **stop**. A safety path that had to queue behind gate evaluation would inherit the pipeline's failure modes: a stuck shadow evaluation, a lease store deadlock, a slow constitution check — any of them would delay the stop. E-Stop therefore bypasses the sequence entirely, engages the latch directly, and every gate independently refuses to pass any command while the latch is set. The stop does not depend on the pipeline; the pipeline depends on the stop being possible.",
    },

    { kind: "h2", text: "What \"latch\" means precisely" },
    {
      kind: "list",
      items: [
        "**Engaging is asynchronous and unilateral.** Any connected client may engage; the server does not evaluate whether the reason is \"good enough\" — that judgment is the operator's, and the protocol does not second-guess it.",
        "**While latched, all actuation requests are rejected** — not queued, not deferred. Lease acquisition is still permitted so agents can observe zone state, but `actuations/execute` and `actuations/batch` fail immediately.",
        "**Clearing requires an explicit `safety/estop/disengage` call.** There is no expiry on the latch. If the engaging participant disconnects, the latch stays set — the deployment does not infer safety from a dead connection.",
        "**Reset authority is a deployment decision.** Who may call disengage is declared in the server's configuration (typically the same operator class that engaged, or a supervisor), and the wire protocol enforces that the call succeeds only from an authorized client.",
      ],
    },

    { kind: "h2", text: "Triggering and handling" },
    {
      kind: "p",
      text: "Client side, the handler pattern in all three SDKs is the same shape — register before your first actuation, keep the callback fast, and treat the latch as sticky:",
    },
    {
      kind: "code",
      lang: "python",
      title: "trigger and handle — Python",
      content: `# handle: registered up front, before any actuation
def on_estop(reason, source):
    client.abort_motion()          # drop to safe state immediately
    scheduler.halt_pending_plans() # nothing resumes on its own

client.on_estop(on_estop)

# trigger: any client, any time, no gate queue
client.safety_estop_engage(reason="obstacle-in-cell")`,
    },
    {
      kind: "p",
      text: "SDK-specific handler details: [Python](/sdks/python), [TypeScript](/sdks/typescript), [Rust](/sdks/rust).",
    },
  ],
};

export const protocolLeasesPage: PageDef = {
  route: "/protocol/leases-fencing",
  title: "Leases & Fencing",
  blocks: [
    { kind: "h1", text: "Leases & Fencing" },
    {
      kind: "p",
      text: "A lease is a time-bounded, exclusive grant over a spatial zone. It is the protocol's answer to \"who is allowed to act here, right now\" — and its design assumes the honest answer is sometimes \"nobody yet\", \"someone else\", or \"the request that thinks it holds the zone is stale\". This page covers the lease lifecycle, how spatial conflicts are detected, and how fencing tokens reject requests that arrive late and claim authority they no longer have.",
    },

    { kind: "h2", text: "Lease states" },
    {
      kind: "ascii",
      content: [
        "                 acquire (zone free)                expires_ms reached",
        "      ┌──────┐ ────────────────────▶ ┌────────┐ ────────────────────▶ ┌─────────┐",
        "      │ FREE │                       │ ACTIVE │                        │ EXPIRED │",
        "      └──────┘ ◀──────────────────── └────────┘ ◀──────────────────── └─────────┘",
        "        ▲    release / zone reclaimed     ▲  │                          re-acquire",
        "        │                                 │  │ conflict at acquire time",
        "   release                              re- │",
        "        │                             acquire│          ┌────────┐",
        "        └────────────── ──────────────────────┴────────▶│ DENIED │",
        "                (release of a denied request)            └────────┘",
        "",
        "                    PENDING: the in-flight acquire request,",
        "                    between submission and verdict",
      ].join("\n"),
    },
    {
      kind: "list",
      items: [
        "`FREE` — no lease is held on the zone; an acquire can be granted immediately.",
        "`PENDING` — an acquire request is in flight. The state exists so late-arriving duplicates of the same request are detected rather than double-granted.",
        "`ACTIVE` — the lease is held; the holder may act in the zone until `expires_ms`.",
        "`EXPIRED` — the duration elapsed. The zone becomes acquirable, but fencing tokens still identify (and reject) commands that carry the expired lease's token.",
        "`DENIED` — the acquire was refused: the zone conflicts with an active lease. The denial response carries the current holder's expiry so the caller can back off intelligently.",
      ],
    },

    { kind: "h2", text: "Spatial conflict detection" },
    {
      kind: "p",
      text: "Every lease covers a volume, and two leases conflict when their volumes intersect during overlapping time windows. Checking that naively — comparing every new request against every held lease — is quadratic in the number of agents, which is exactly the wrong shape for a safety-critical path that has to stay fast under load. PMCP servers index active leases in an **R\\*-tree**, a spatial index structure that organizes volumes into nested bounding rectangles and prunes whole subtrees that cannot possibly intersect a query volume.",
    },
    {
      kind: "p",
      text: "The practical consequence: conflict detection stays sub-linear as agents and zones multiply, and — equally important — the index answers the *reverse* question efficiently too. When a lease is released or expires, the server must find which pending requests were denied solely because of it; the same tree traversal that found the conflict finds the waiters. The R\\*-tree variant (rather than plain R-tree) is chosen because it reduces overlapping between sibling bounding boxes on insertion, which keeps queries from degenerating into scanning multiple branches — a small difference at rest, a real one when the tree is being mutated constantly by acquire, expire, and release traffic.",
    },

    { kind: "h2", text: "Fencing tokens" },
    {
      kind: "p",
      text: "Leases answer \"who may act\" but not \"is this command still allowed by the time it executes\". A command can pass the Lease gate, sit in a queue, and arrive at the actuation layer after its lease has expired — or after another agent has taken the zone. Worse, a delayed message from an old request can arrive looking perfectly valid. This is the problem fencing tokens solve, following the treatment in Kleppmann, *Designing Data-Intensive Applications* (2017), ch. 8 (originally Gray & Cheriton, 1989).",
    },
    {
      kind: "list",
      items: [
        "**Per-zone monotonic counters.** Every zone carries a counter that only ever increments. Each granted lease receives the counter value current at grant time — its fencing token.",
        "**Tokens travel with commands.** Every gated actuation request carries the token of the lease it was granted under, end to end, to the component that finally executes motion.",
        "**Staleness rejection.** The executing component tracks the highest token it has seen per zone. A command whose token is lower than the high-water mark is stale by definition — a newer lease has superseded the one this command rides on — and is rejected without executing, no matter how valid its other fields look.",
      ],
    },
    {
      kind: "p",
      text: "The property this buys: even in the presence of delayed, duplicated, or reordered message delivery, at most one lease lineage commands a zone at a time. The gate sequence decides admission; fencing tokens enforce that the admission is still true at execution time — the last line of defense against the race between grant and execution.",
    },

    {
      kind: "note",
      label: "see also",
      text: "The wire forms of `leases/acquire` and `leases/release` are on [Wire Format](/protocol/wire-format). The conformance suite's lease tests (double-acquire protection, expiry semantics) are described under [Conformance](/conformance).",
    },
  ],
};

export const protocolWireFormatPage: PageDef = {
  route: "/protocol/wire-format",
  title: "Wire Format",
  blocks: [
    { kind: "h1", text: "Wire Format" },
    {
      kind: "p",
      text: "PMCP is JSON-RPC 2.0 over HTTP. A server exposes a single POST endpoint (conventionally `/mcp`); every method — from `initialize` to `safety/estop/engage` — is a JSON-RPC request/response pair on that endpoint. Responses set an `X-PMCP-Version` header carrying the negotiated protocol version. There is no second serialization, no binary mode, and no method outside this table.",
    },

    { kind: "h2", text: "Message types" },
    {
      kind: "table",
      codeFirstCol: true,
      headers: ["method", "what it does"],
      rows: [
        ["initialize", "Handshake: negotiate `protocolVersion`, exchange `serverInfo` (name, robotId, robotClass) and `capabilities` (actuations, sensors, features)"],
        ["actuations/list", "List the actuations the robot exposes, with parameter descriptions"],
        ["actuations/execute", "Execute a single named actuation (gated: Lease → Constitution → Shadow)"],
        ["actuations/batch", "Execute a batch of actuations atomically — all or nothing"],
        ["sensors/list", "List sensors with type and unit"],
        ["sensors/read", "Read one sensor: value, unit, timestamp_ms, quality"],
        ["leases/acquire", "Request a lease on a zone: zone_id, duration_ms → lease_id, expires_ms, granted"],
        ["leases/release", "Release a held lease by lease_id"],
        ["pmcp/metrics", "Server counters: actuationCount, sensorReadCount, safetyViolations, uptimeSeconds, energyUsedJ, connectedClients, lastHeartbeatMs"],
        ["pmcp/ping", "Liveness probe → pong + timestamp"],
        ["safety/estop/engage", "Engage the E-Stop latch; gated actuation is refused while latched"],
        ["safety/estop/disengage", "Explicitly reset the latch — the only path that clears it"],
      ],
    },

    { kind: "h2", text: "The initialize handshake" },
    {
      kind: "p",
      text: "Every session begins with `initialize`. The client proposes a protocol version; the server echoes the negotiated version in its response — a server that cannot speak the client's version fails the handshake rather than silently downgrading. The response also carries the full capability declaration, which is how a client learns what it can call before it calls it:",
    },
    {
      kind: "code",
      lang: "json",
      title: "initialize — request / response",
      content: `// request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.5",
    "clientInfo": { "name": "my-agent", "version": "1.0.0" }
  }
}

// response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.5",
    "serverInfo": {
      "name": "mock-robot",
      "robotId": "test_robot_001",
      "robotClass": "TestRobot"
    },
    "capabilities": {
      "actuations": {
        "move_to": {
          "name": "move_to",
          "description": "Move to target position",
          "parameters": [
            { "name": "x", "type": "number", "description": "X", "required": true },
            { "name": "y", "type": "number", "description": "Y", "required": true },
            { "name": "z", "type": "number", "description": "Z", "required": true }
          ]
        },
        "open_gripper":  { "name": "open_gripper",  "description": "Open the gripper", "parameters": [] },
        "close_gripper": { "name": "close_gripper", "description": "Close gripper",
          "parameters": [
            { "name": "force_n", "type": "number", "description": "Grip force (N)", "required": false }
          ] }
      },
      "sensors": {
        "joint_angles":  { "name": "joint_angles",  "description": "Read joint angles", "sensor_type": "joint_state", "unit": "radians" },
        "gripper_force": { "name": "gripper_force", "description": "Gripper force sensor", "sensor_type": "force", "unit": "N" }
      },
      "features": {
        "shadow": true,
        "constitution": false,
        "leases": true,
        "metrics": true,
        "batching": true
      }
    }
  }
}`,
    },
    {
      kind: "note",
      label: "features are honest",
      text: "The `features` object declares what this server actually enforces. A server that does not run the Constitution gate says so here — `constitution: false` — and clients can see the safety posture before they send a command. The conformance suite verifies these flags match observed behavior, so the declaration cannot quietly rot.",
    },

    { kind: "h2", text: "Error codes" },
    {
      kind: "table",
      codeFirstCol: true,
      headers: ["code", "meaning"],
      rows: [
        ["-32700", "Parse error — the request body is not valid JSON"],
        ["-32601", "Method not found — also used for unknown actuation or sensor names"],
        ["-32602", "Invalid params"],
        ["-32603", "Internal error"],
        ["-33000 … -33999", "The P-MCP application error range — lease denials, gate rejections, latch refusals, and every protocol-defined failure. Reserved for PMCP; implementations must not use this range for their own non-protocol errors"],
      ],
    },

    { kind: "h2", text: "JSON Schema 2020-12" },
    {
      kind: "p",
      text: "The normative definition of every message lives as JSON Schema 2020-12 files in [`pmcp-spec/schema/`](https://github.com/physicalcontextprotocol/pmcp-spec). The shared data types (`$defs`) are published; the per-method request/response schemas are being hand-extracted from the canonical types into per-method files. That extraction is deliberately slow work: schemas are being written once the duplicate client implementations in `pmcp-python` are consolidated, so the schema does not accidentally codify one of four divergent type definitions as the truth. Track the progress in the [`pmcp-spec`](https://github.com/physicalcontextprotocol/pmcp-spec) repository.",
    },
    {
      kind: "note",
      label: "versioning",
      text: "The wire format itself version-bumps independently of any SDK. How that works, and what counts as a breaking change at each layer, is specified under [Versioning](/versioning).",
    },
  ],
};
