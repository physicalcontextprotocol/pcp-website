import type { PageDef } from "../types";

export const governancePage: PageDef = {
  route: "/governance",
  title: "Governance",
  blocks: [
    { kind: "h1", text: "Governance" },
    {
      kind: "p",
      text: "How decisions get made in the PCP organization — who decides, by what process, and what changes that. An engineering lead evaluating PCP for internal adoption will read this page before the protocol pages; it is given first-class navigation weight on purpose.",
    },
    {
      kind: "placeholder",
      title: "Governance model — content not yet drafted",
      body: "The governance document has not been written yet, and this page will not paper over that with vague reassurance. What is drafted is the structure below; the full text is the next content pass.",
      willCover: [
        "the current decision-making model, stated plainly — today PCP is maintainer-led: one maintainer decides, with the spec and conformance suite as the constraint on what can be decided unilaterally",
        "the stated plan for transitioning to a broader governance model, and the trigger condition for that transition — for example, N active contributors from M distinct organizations, or the first third-party conformance claim, whichever comes first",
        "what is reserved to governance vs. what any contributor can do without asking: wire-format changes and gate semantics are reserved; SDK fixes, docs, and server adapters are not",
        "the RFC process for protocol changes, cross-referenced from [Contributing](/contributing)",
      ],
    },
    {
      kind: "p",
      text: "What exists today and can be verified rather than promised: decisions are recorded in the open — the org [CHANGELOG](https://github.com/physicalcontextprotocol/.github/blob/main/CHANGELOG.md) and [MIGRATION_MAP](https://github.com/physicalcontextprotocol/pmcp-spec/blob/main/MIGRATION_MAP.md) document what changed and why, including the migration sequencing decisions that shaped the current repo layout. Until a formal governance document replaces this page, those artifacts plus the repository history are the authoritative record of how decisions were actually made.",
    },
  ],
};

export const versioningPage: PageDef = {
  route: "/versioning",
  title: "Versioning",
  blocks: [
    { kind: "h1", text: "Versioning" },
    {
      kind: "p",
      text: "PCP versions three different things, and conflating them is how protocols rot: the **wire format** (what goes over the network), the **SDK APIs** (what you call in each language), and the **specification** (what behavior is required). Each has its own version, its own compatibility rules, and its own communication channel.",
    },

    { kind: "h2", text: "What is pinned today" },
    {
      kind: "table",
      headers: ["artifact", "current", "where it lives"],
      rows: [
        ["Wire protocol version", "`0.5` — negotiated in the `initialize` handshake, echoed in the `X-PCP-Version` response header", "[Wire Format](/protocol/wire-format)"],
        ["SDK versions", "per-repo SemVer — Python `1.0.0`, TypeScript `1.0.1`, Rust `1.0.0`, C++ `1.0.1`, each released independently", "each repository's releases"],
        ["Spec version", "the `pmcp-spec` schema is `0.6.0`; the wire version it describes is `0.5`, and conformance is claimed per wire version", "[pmcp-spec](https://github.com/physicalcontextprotocol/pmcp-spec)"],
      ],
    },
    {
      kind: "p",
      text: "The org-level rule already in force: semantic versioning applies **per sub-project, not to the org as a whole** — there is no version of \"PCP the organization\", there are versions of `pmcp-python`, `pmcp-typescript`, `pcp-core`, and the shared wire format they conform to. This is the same pattern the MCP organization uses, deliberately.",
    },

    {
      kind: "placeholder",
      title: "Full versioning policy — content not yet drafted",
      body: "The complete policy document is the next content pass. The categories it must answer for are known; the commitments are not yet made, and this page will not fake them.",
      willCover: [
        "the SemVer commitment for the wire format, and what counts as a breaking change at the wire layer vs. the SDK layer — the two categories are versioned and communicated differently, and the page will define the boundary precisely",
        "how additive wire evolution works within a major version: new optional fields, new methods, new feature flags in the `initialize` capabilities object",
        "the deprecation notice period — how long a wire feature is marked deprecated before removal, and where the notice is published so clients can act on it",
        "how SDK majors relate to wire versions — the compat matrix rule that lets a client speak to older servers during a migration window",
      ],
    },
    {
      kind: "p",
      text: "Interim rule of thumb, observable in the current artifacts rather than promised: the wire version only moves when the conformance suite moves with it — a protocol version is a tagged suite state, which is what makes a conformance claim ([Conformance](/conformance)) meaningful per version rather than in general.",
    },
  ],
};

export const securityPage: PageDef = {
  route: "/security",
  title: "Security",
  blocks: [
    { kind: "h1", text: "Security" },
    {
      kind: "note",
      label: "do not open a public issue",
      text: "**Never open a public GitHub issue for a vulnerability.** Public issues give an adversary the timeline and the details before a fix ships. Use the private channels below — they are read by the same people, without the disclosure.",
    },

    { kind: "h2", text: "How to report" },
    {
      kind: "list",
      items: [
        "**GitHub private security advisory** (preferred): on the affected repository — Security tab → \"Report a vulnerability\". This is the fastest path into the response process, and it keeps the report scoped to the repo it affects.",
        "**Email**: security@physicalcontextprotocol.org — use this if the issue spans repositories or you cannot access GitHub's advisory flow.",
        "Include: affected repository, the behavior you observed, how you reproduced it, and — for wire-level issues — the message exchange. A minimal reproducer beats a long description.",
      ],
    },

    { kind: "h2", text: "Response commitments" },
    {
      kind: "table",
      headers: ["stage", "target"],
      rows: [
        ["Acknowledgment of a valid report", "within 72 hours"],
        ["Triage and severity assignment", "within 7 days"],
        ["Fix or documented mitigation for accepted issues", "target the next patch release; critical wire-format issues get an expedited release"],
        ["Coordinated disclosure", "credit to the reporter by default (opt-out), published with the fix in the release notes"],
      ],
    },

    { kind: "h2", text: "Scope" },
    {
      kind: "p",
      text: "In scope: the protocol specification, the four SDKs, the conformance suite, the reference servers, and the registry service — everything in the [organization](https://github.com/physicalcontextprotocol)'s repositories. Wire-format design flaws (ways conforming messages can produce unsafe behavior) are in scope even when every implementation is correct, because the fix lands in the spec.",
    },
    {
      kind: "p",
      text: "Out of scope: deployments and configurations someone built on top of PCP. A robot cell whose operator disabled the constitution gate is a deployment incident, not a protocol vulnerability — the protocol's position is that servers declare their enforcement posture honestly in the `initialize` handshake, and what an operator then runs is theirs. Also out of scope: the known, published limitations — the [registry](/registry)'s missing auth is documented there, and the three [research problems](/limitations) are stated openly; report new findings, not the ones already on the ledger.",
    },

    { kind: "h2", text: "Security posture of the pipeline itself" },
    {
      kind: "p",
      text: "The CI pipeline runs bandit (SAST) and pip-audit on every change with reports uploaded as artifacts — see [Verification](/verification) for the full pipeline description and current blocking posture. Release publishes to PyPI via OIDC trusted publishing: no long-lived token sits in repository secrets to leak.",
    },
  ],
};

export const contributingPage: PageDef = {
  route: "/contributing",
  title: "Contributing",
  blocks: [
    { kind: "h1", text: "Contributing" },
    {
      kind: "p",
      text: "PCP is an early-stage organization of ten repositories, and a lot of what \"contributing\" means is still shifting. What follows is the current guidance — the operative word being current. The full text lives in [`CONTRIBUTING.md`](https://github.com/physicalcontextprotocol/.github/blob/main/CONTRIBUTING.md) in the organization's community-health repository; this page summarizes it and links the parts that live elsewhere. Each repository also carries its own `CONTRIBUTING.md` with the local constraints.",
    },

    { kind: "h2", text: "Where the work lives" },
    {
      kind: "p",
      text: "Each sub-project (`pmcp-spec/`, `pmcp-python/`, `pmcp-conformance/`, …) is its own repository. **Open your PR against the repository you are changing and keep it scoped to that sub-project.** Cross-cutting changes (spec + Python + conformance, say) are acceptable but must be opened as separate PRs, or called out explicitly in the description when they genuinely have to land together — they are harder to review and harder to revert.",
    },
    {
      kind: "p",
      text: "The sequencing that governs where attention goes: spec and conformance stabilize first, then the SDKs (Python → TypeScript → Rust → C++), then servers, registry, and safety. `pmcp-labs` is quarantine — do not rely on it, and do not add new work there.",
    },

    { kind: "h2", text: "High-value changes right now" },
    {
      kind: "list",
      items: [
        "consolidation of the duplicate `PCPServer` / `PCPClient` / `ShadowPreview` implementations across `pmcp-python`'s internal trees — the org's declared top cleanup priority",
        "populating the per-method JSON Schemas under `pmcp-spec/schema/` (the shared `$defs` exist; the method-level files are the gap)",
        "a real driver for `pmcp-conformance` so it can validate external implementations, not just the in-process mock",
        "authentication and input validation on `pmcp-registry` (see the warning on [Registry](/registry))",
        "replacing the mock TEE backend in `pmcp-safety` with a real SGX / SEV-SNP / TDX verification path",
      ],
    },

    { kind: "h2", text: "Running the checks locally" },
    {
      kind: "code",
      lang: "bash",
      title: "the two blocking suites",
      content: `# Python SDK
cd pmcp-python
pip install -e ".[dev,numerics]"
pytest --asyncio-mode=auto

# conformance suite
cd pmcp-conformance
pip install -e .
pytest --asyncio-mode=auto -v`,
    },
    {
      kind: "p",
      text: "Both suites must pass on every PR — they are the blocking CI checks. Run them before you open the PR; a red main is everyone's problem.",
    },

    { kind: "h2", text: "PR description" },
    {
      kind: "list",
      ordered: true,
      items: [
        "which sub-project(s) you touched",
        "why the change is needed — what claim, bug, or gap it addresses; citing a line in a README or `MIGRATION_MAP.md` is a good pattern",
        "how you verified it — which tests and checks you actually ran",
        "anything you deliberately left for a follow-up",
      ],
    },

    { kind: "h2", text: "Good first issues" },
    {
      kind: "p",
      text: "Issues labeled `good first issue` are scoped so a newcomer can complete one without prior context on the gate model or the spec internals — typically a test, a schema file, or a docs page — and they name the sub-project in the title so you can filter to the codebase you know. Claim an issue by commenting before you start work; if it goes quiet for a week, it reopens for someone else.",
    },

    {
      kind: "placeholder",
      title: "RFC process",
      body: "The RFC process for proposing a new SDK or a protocol change does not exist yet. Until it does, protocol-level proposals go through the issue tracker of `pmcp-spec` with the \"protocol-change\" label, and the bar is the conformance suite: a proposal that cannot say what the suite would test is not ready. This section becomes the RFC document when that lands.",
      willCover: [
        "the RFC template: problem, wire-format impact, conformance impact, migration path",
        "the review cadence and who accepts an RFC (see [Governance](/governance) for the decision model it plugs into)",
        "the rule that an accepted RFC is implemented with its conformance tests in the same change",
      ],
    },

    { kind: "h2", text: "Code of conduct" },
    {
      kind: "p",
      text: "Be kind, be specific, and be honest about what you did and didn't verify. No formal Code of Conduct has been adopted yet — that fact is stated plainly rather than papered over with an unratified document.",
    },

    { kind: "h2", text: "License" },
    {
      kind: "p",
      text: "By contributing, you agree that your contribution is licensed under the Apache License 2.0, matching the repositories. Real-time discussion (Discord or Slack) does not exist yet — it will be linked here when it does.",
    },
  ],
};
