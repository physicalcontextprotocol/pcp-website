import type { PageDef } from "../types";

export const conformancePage: PageDef = {
  route: "/conformance",
  title: "Conformance",
  blocks: [
    { kind: "h1", text: "Conformance" },
    {
      kind: "p",
      text: "\"PMCP Conformant\" has exactly one meaning: **the implementation passes the shared conformance suite against the wire-format schema.** Not \"inspired by PMCP\", not \"PMCP-compatible\" in the marketing sense — the suite is a public, versioned artifact in the [`pmcp-conformance`](https://github.com/physicalcontextprotocol/pmcp-conformance) repository, and its verdict is the claim. If a vendor's README says conformant and the suite says otherwise, the suite is right.",
    },
    {
      kind: "p",
      text: "Conformance is claimed per protocol version — currently `0.5`. An implementation that passes for `0.4` is not conformant for `0.5` until it passes that matrix.",
    },

    { kind: "h2", text: "What the suite verifies" },
    {
      kind: "p",
      text: "42 tests in six sections, every one of them a wire-level behavior — the suite speaks raw JSON-RPC and checks what actually comes back:",
    },
    {
      kind: "table",
      codeFirstCol: true,
      headers: ["section", "tests", "what it checks"],
      rows: [
        ["1 — Initialization", "7", "the `initialize` handshake: protocol-version echo, `serverInfo`, capability advertising, JSON-RPC 2.0 well-formedness, unknown-method error path, parse-error path, `GET /health`"],
        ["2 — Actuations", "8", "`actuations/list`, `actuations/execute`, batch atomicity, unknown-actuation error path"],
        ["3 — Sensors", "7", "`sensors/list`, `sensors/read`, response schema, unknown-sensor error path"],
        ["4 — Leases", "6", "acquire / release / re-acquire, double-acquire protection, expiry semantics"],
        ["5 — Metrics + Ping", "7", "required fields on `pmcp/metrics` and `pmcp/ping`, E-Stop engage / disengage semantics"],
        ["6 — Error codes", "7", "the P-MCP range (−33999…−33000), JSON-RPC 2.0 standard codes, response well-formedness"],
      ],
    },

    { kind: "h2", text: "Running it against your own implementation" },
    {
      kind: "p",
      text: "The suite ships with a self-contained mock robot server (`conftest.py`) that speaks the wire correctly; by default the tests round-trip against that mock. That default verifies the tests and the mock agree — it does **not** verify your implementation. To run it against a real server (your own SDK, a fourth language, a hardware bridge):",
    },
    {
      kind: "code",
      lang: "bash",
      title: "run against a real server",
      content: `# 1. install the suite
git clone https://github.com/physicalcontextprotocol/pmcp-conformance
cd pmcp-conformance
pip install -e .

# 2. launch your implementation on an HTTP endpoint, e.g.
#    http://127.0.0.1:7000/mcp

# 3. point the suite at it — override the base URL via the
#    mock_robot_server fixture or the PMCP_BASE_URL env var
#    (see conftest.py for the exact hook)

# 4. run
pytest --asyncio-mode=auto -v`,
    },
    {
      kind: "p",
      text: "A pluggable base-URL fixture and a formal driver contract for external implementations are follow-up work tracked in the repository — the manual override above is the supported path today.",
    },

    { kind: "h2", text: "Current status" },
    {
      kind: "table",
      headers: ["SDK", "status"],
      rows: [
        ["Python", "conformant for 0.5 — the suite runs in blocking CI on every PR"],
        ["Rust", "wire coverage exercised by the pmcp-core suite (43/43) and the conformance suite run manually against a Rust server"],
        ["TypeScript", "builds verified in CI; full conformance matrix run pending — the suite points at it the same way as any external implementation"],
      ],
    },

    {
      kind: "placeholder",
      title: "\"PMCP Conformant\" badge",
      body: "A badge program — the right to display a mark, backed by a CI-verifiable conformance run against a tagged protocol version — is planned but not live. There is nothing to apply for yet, and self-asserting the mark before the program exists is explicitly not permitted.",
      willCover: [
        "who issues the badge and against which tagged suite version",
        "the re-certification cadence when the protocol version-bumps",
        "the revocation path when an implementation regresses",
      ],
    },
  ],
};

export const serversPage: PageDef = {
  route: "/servers",
  title: "Servers",
  blocks: [
    { kind: "h1", text: "Servers" },
    {
      kind: "p",
      text: "A \"PMCP server\" is the side that owns the robot: it holds the lease store, runs the gates, speaks the wire format, and refuses anything the constitution or the latch says to refuse. In practice it is a process you run next to (or on) the robot controller, exposing a single JSON-RPC endpoint. Every SDK client — Python, TypeScript, Rust, or third-party — speaks to it the same way.",
    },
    {
      kind: "p",
      text: "Reference servers live in the [`pmcp-servers`](https://github.com/physicalcontextprotocol/pmcp-servers) repository. They are working code, not specifications: read them to see the gate sequence wired up end to end, or run them as the backend for your first client experiments.",
    },

    { kind: "h2", text: "Reference servers" },
    {
      kind: "table",
      codeFirstCol: true,
      headers: ["server", "what it is"],
      rows: [
        ["robot_servers/", "per-robot adapters — the pattern to copy when porting PMCP to your own hardware"],
        ["reference_impl/", "the canonical in-repository server; the conformance suite's mock mirrors its behavior"],
        ["simulator/", "a simulated robot with honest physics timing — the fastest way to get an endpoint running locally"],
        ["examples/", "runnable end-to-end examples matching the [Quickstart](/quickstart)"],
        ["gateway/", "protocol gateway for bridging non-PMCP controllers"],
        ["ros2-bridge/", "ROS 2 integration — map ROS topics/services onto PMCP actuations and sensors"],
      ],
    },

    { kind: "h2", text: "Pointing a client at a server" },
    {
      kind: "p",
      text: "Every server announces itself the same way: an HTTP endpoint (conventionally `/mcp`), a `GET /health` for liveness, and the `initialize` handshake for everything else. Pointing a client at a server is therefore one URL — the client derives capabilities from the handshake rather than from configuration:",
    },
    {
      kind: "code",
      lang: "python",
      title: "any SDK, any server",
      content: `client = PMCPClient("http://127.0.0.1:7000/mcp")
client.initialize()

# the response told you: robotId, what actuations exist,
# what sensors exist, and which features (shadow,
# constitution, leases) this server actually enforces`,
    },
    {
      kind: "note",
      label: "capability honesty",
      text: "Servers declare their enforcement posture in the handshake's `features` object — a server that skips the Constitution gate says `constitution: false` there, and the conformance suite verifies the flags match observed behavior. Clients should check the posture before trusting the gates. See [Wire Format](/protocol/wire-format).",
    },
  ],
};

export const registryPage: PageDef = {
  route: "/registry",
  title: "Registry",
  blocks: [
    { kind: "h1", text: "Registry" },
    {
      kind: "p",
      text: "The registry is a public index of PMCP servers: who runs them, what robots they front, what protocol versions they speak, and where to reach them. It exists for the same reason package registries exist — so an agent (or an operator) can discover endpoints without a side channel. It indexes servers; it does not vouch for them. A listing means \"this endpoint claims to exist\", not \"this endpoint is safe\" — conformance claims go through the [suite](/conformance), not the registry.",
    },

    { kind: "h2", text: "Listing your server" },
    {
      kind: "p",
      text: "The registry itself is a small service (`api_server.py`) in the [`pmcp-registry`](https://github.com/physicalcontextprotocol/pmcp-registry) repository. Listing is an HTTP call to its `register/*` endpoints with your server's descriptor: endpoint URL, robot id, robot class, protocol version, and a contact. Re-registration refreshes the entry; entries are keyed by endpoint.",
    },
    {
      kind: "code",
      lang: "bash",
      title: "list a server",
      content: `curl -X POST http://registry.example.org/register/server \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpoint": "http://10.0.0.4:7000/mcp",
    "robot_id": "arm-01",
    "robot_class": "CollaborativeArm",
    "protocol_version": "0.5",
    "contact": "ops@example.org"
  }'`,
    },

    {
      kind: "note",
      label: "honest state — do not expose the public API yet",
      text: "The registry currently has **no authentication, no request-size limits, CORS `*` on POST/DELETE, and no host/port allowlist on `register/*`** — it is written up in the org's known-limitations list, and it must not be exposed to untrusted networks in this state. Run it inside your own perimeter until the auth and validation work lands; track it in the [`pmcp-registry`](https://github.com/physicalcontextprotocol/pmcp-registry) repository.",
    },

    { kind: "h2", text: "Scope" },
    {
      kind: "p",
      text: "The registry is for PMCP servers — endpoints speaking the protocol. It is not a general robot marketplace, and it deliberately carries no trust semantics: no conformance verdicts, no ratings, no reputation. The [conformance suite](/conformance) is the trust mechanism; the registry is the phone book.",
    },
  ],
};

export const verificationPage: PageDef = {
  route: "/verification",
  title: "Verification",
  blocks: [
    { kind: "h1", text: "Verification" },
    {
      kind: "p",
      text: "This page is the honest ledger of what is verified, how, and what \"verified\" means in each case. The headline numbers are real and current; the interesting parts are the methodology underneath them — including the places where the verification tooling itself had to be verified.",
    },

    { kind: "h2", text: "Test status" },
    {
      kind: "p",
      text: "[213/213 Python tests passing](https://github.com/physicalcontextprotocol/pmcp-org/actions) · [43/43 Rust tests passing](https://github.com/physicalcontextprotocol/pmcp-org/actions) · [42/42 conformance tests passing](https://github.com/physicalcontextprotocol/pmcp-org/actions) — Python suite across the 3.9–3.12 matrix, conformance suite against the mock server, Rust suite in `pmcp-core`. These run in blocking CI on every PR and every tag; the linked runs are the live state, not a screenshot of a good day. The tagged-release runs are the ones a conformance claim is anchored to.",
    },

    { kind: "h2", text: "TLA+ model checking" },
    {
      kind: "p",
      text: "The gate sequence and the recovery handshake are modeled in TLA+ and checked with TLC. Two specs carry the weight:",
    },
    {
      kind: "table",
      codeFirstCol: true,
      headers: ["spec", "what it models", "what checking proves"],
      rows: [
        ["PMCPCore.tla", "the gate ordering: E-Stop → Lease → Constitution → Shadow, and the invariant that no command reaches actuation while any gate is unsatisfied or the latch is set", "no reachable state in which an ungated command executes — the ordering constraint is a theorem, not a hope"],
        ["PMCPRecovery.tla", "the recovery handshake after E-Stop disengage and lease re-acquisition", "recovery cannot resurrect a stale lease's authority — fencing token monotonicity holds through recovery"],
      ],
    },
    {
      kind: "p",
      text: "Spec files live in the [`pmcp-spec`](https://github.com/physicalcontextprotocol/pmcp-spec) repository. Model checking covers the protocol's control logic — the state machines, the ordering, the recovery. It does not cover physics, hardware, or the numeric honesty of a particular deployment's constitution thresholds; those are the [limitations](/limitations) page's territory.",
    },

    { kind: "h2", text: "Checking the model checker — mutant testing" },
    {
      kind: "p",
      text: "A TLA+ proof is only as good as the model checker that evaluated it and the spec that was actually evaluated — and both of those have failure modes that produce green checkmarks. The methodology section of this page exists because one of those failure modes was found, the hard way.",
    },
    {
      kind: "p",
      text: "The failure mode: `pcal.trans`, the PlusCal translator, **silently overwrites the accompanying `.cfg` file on retranslation**. The `.cfg` file is where a spec's invariant declarations live — which properties TLC is asked to check. Retranslate a spec after editing the PlusCal algorithm, and the rewritten `.cfg` could drop the invariant declarations entirely. TLC then runs happily, checks nothing, and reports success. The checkmark was green; the proof was vacuous. Nothing crashed; nothing warned; the artifact simply stopped being the artifact you thought you had.",
    },
    {
      kind: "p",
      text: "The guard, now applied on every spec change: the `.cfg` and `.tla` files are treated as a checked pair — after any translation, the invariant declarations are re-diffed against the committed expectations before TLC's result is believed, and a translation that silently narrows what is checked fails CI. More generally, spec changes are mutation-tested: deliberately breaking the gate order in the spec must produce a TLC failure. If breaking the spec does not break the check, the check is not checking. That is the loop that keeps the verification layer from rotting — the model checks the protocol, and the mutants check the model.",
    },

    { kind: "h2", text: "Bugs found by execution, not review" },
    {
      kind: "p",
      text: "Five from the org changelog, presented as evidence of method rather than as a confession — each was invisible to reading and obvious to running:",
    },
    {
      kind: "list",
      ordered: true,
      items: [
        "The conformance suite ERRORED at collection — stale imports of a pre-migration package path in five test files, invisible in review, fatal in pytest.",
        "Six `console_scripts` entry points in `pmcp-python` were broken twice over — their target modules had moved during the repo split, and they had been async coroutines that could never run as console scripts.",
        "The built wheel shipped a wrong package set — 19 `packages.find` include patterns, most naming packages that no longer existed; the wheel's contents disagreed with the source tree.",
        "`readme` pointed at `docs/README.md`, a path that does not exist in the split repository — a publish-time failure, not a build-time one.",
        "The protocol spec contradicted itself on gate order — §13.3 still showed the old Shadow → Constitution sequence after the rest of the spec had been corrected to E-Stop → Lease → Constitution → Shadow.",
      ],
    },
    {
      kind: "p",
      text: "The pattern across all five: static review had already passed over each of them. Collection errors, packaging metadata, and internal contradiction are exactly the class of defect that only execution surfaces — which is why the CI pipeline below is all execution, all blocking where it counts.",
    },

    { kind: "h2", text: "CI pipeline" },
    {
      kind: "table",
      headers: ["job", "what runs", "status"],
      rows: [
        ["python-tests", "pytest across Python 3.9–3.12 with coverage, uploaded to Codecov", "blocking"],
        ["conformance-tests", "the 42-test suite against the mock server", "blocking"],
        ["type-check", "mypy over the v05/ and pmcp/ trees", "non-blocking during the duplicate-clients cleanup — failures surface on the PR, they do not gate it"],
        ["lint", "ruff + black over shipping code", "non-blocking during the same cleanup"],
        ["security", "bandit (SAST) + pip-audit, report uploaded as artifact", "non-blocking, informational"],
        ["rust-build", "cargo build + cargo test for pmcp-core, build for ledger", "runs on every change"],
        ["typescript-sdk", "npm install + build", "runs on every change"],
        ["release", "PyPI publish via OIDC trusted publishing on v*.*.* tags, after python-tests and conformance-tests", "tag-gated"],
      ],
    },
    {
      kind: "note",
      label: "no suppressed steps",
      text: "The pipeline contains no `|| true` — that construct was removed deliberately so failures are reportable. The remaining non-blocking jobs are explicit `continue-on-error` markers documented in the workflow file itself, visible on every PR page, with a written reason and an expiry condition (the duplicate-clients consolidation). Suppression that is visible and time-boxed is a migration state; suppression that is silent is rot.",
    },
  ],
};

export const limitationsPage: PageDef = {
  route: "/limitations",
  title: "Limitations",
  blocks: [
    { kind: "h1", text: "Limitations" },
    {
      kind: "p",
      text: "PMCP's control logic — gate ordering, lease fencing, E-Stop latching, recovery — is model-checked and suite-verified. That is the verified state, and it is stated precisely: the protocol does what the TLA+ specs prove it does, and the SDKs speak the wire the conformance suite checks. Below that verified layer sit three problems that are **open research**, not unfinished engineering. They are listed with the same prominence as the rest of the documentation because an adoption decision made without reading them is a decision made on incomplete information.",
    },

    { kind: "h2", text: "1 — Cross-hardware HNN determinism" },
    {
      kind: "p",
      text: "The Shadow gate's monitor runs a learned dynamics model (a Hamiltonian neural network) to predict where a proposed command takes the robot. The safety argument needs that prediction to be **reproducible**: the same state and command must produce the same prediction, every time, everywhere. HNN inference is deterministic on paper and shaky in practice — floating-point non-associativity across GPU architectures, different BLAS kernels, batch-size-dependent reduction orders. The same shadow check that passes on the development machine can disagree with itself on the deployment machine, and by margins that matter at safety thresholds.",
    },
    {
      kind: "p",
      text: "Where this stands: the current mitigation is operational, not solved — shadow evaluation is pinned to a declared runtime (fixed device class, fixed kernels), and a deployment's verification is only claimed for the hardware it was validated on. What is missing is a cross-hardware determinism guarantee with bounded disagreement, which is an open problem in learned-model inference, not a bug PMCP can fix in its own code.",
    },

    { kind: "h2", text: "2 — Conformal prediction under adversarial input" },
    {
      kind: "p",
      text: "Shadow verdicts are calibrated with conformal prediction: the monitor's uncertainty is turned into a coverage guarantee — \"the true outcome lies in the predicted set with probability 1−α\". That guarantee is distributional: it holds when inputs are drawn from the same distribution the calibration set was. A robot cell is not that world. Sensor noise is not always exchangeable, and an environment that shifts — new obstacles, worn hardware, an unusual load — is precisely the case where the coverage quietly stops holding while the math still claims it.",
    },
    {
      kind: "p",
      text: "Worse, an adversarial input can be crafted to sit in the calibrated set's blind spot. The current posture is honest labeling: conformal coverage is a stated assumption with its conditions documented, not a blanket guarantee. What is missing is coverage that degrades measurably under distribution shift and resists adversarial input — an active research area, tracked here because the Shadow gate's trust story inherits its limits.",
    },

    { kind: "h2", text: "3 — UWB anchor geometry for moving robots" },
    {
      kind: "p",
      text: "Lease conflict detection is only as good as the position estimates it intersects. Ultra-wideband positioning gives centimeter-ish ranging, but the error is **geometry-dependent**: it balloons when the robot's position relative to the anchors becomes ill-conditioned — few visible anchors, poor angular spread, anchors nearly collinear with the robot. A robot moving through a cell passes through exactly such configurations as a matter of course. The lease gate can be holding two leases that appear disjoint while the true volumes overlap, because one position estimate was taken in a bad-geometry moment.",
    },
    {
      kind: "p",
      text: "The current mitigation is conservative: zone volumes are dilated by a geometry-aware error bound, so uncertain positions make zones larger and conflicts more likely to be detected — safe at the cost of availability. What is missing is real-time geometry quality estimation tight enough to shrink the dilation when the constellation is good, without growing it too late when the robot moves into a degenerate patch. That estimator is an open problem, and it bounds how tightly PMCP can pack concurrent agents into a cell.",
    },

    { kind: "h2", text: "What this page is for" },
    {
      kind: "p",
      text: "These three problems bound the protocol's claims, and they are the reason the word \"verified\" is used narrowly on [Verification](/verification): model-checked control logic, suite-verified wire behavior — with the physics-side guarantees stated as assumptions with known limits. If you are evaluating PMCP for adoption, treat this page as input to your risk analysis, not as a footnote to it.",
    },
  ],
};
