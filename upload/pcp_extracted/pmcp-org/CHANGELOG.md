# Changelog — pmcp-org

Changes at the **org level** — anything that touches more than one
sub-project, or the root of the monorepo. Sub-project-scoped changes
belong in that project's own history (or PR description).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Semantic versioning is applied per sub-project, not to the org as a whole
— see each sub-project's own metadata for its version.

## [Unreleased]

### Added
- **Root README** describing the actual monorepo layout, the nine
  sub-projects, and their honest maturity levels.
- **Root LICENSE** (Apache 2.0) so the org-level copy stands alone;
  sub-projects continue to carry their own copy.
- **Root `.gitignore`** covering Python, Node, Rust caches and common
  editor/OS files so `.mypy_cache/` etc. don't get re-committed.
- **`pmcp-conformance/pyproject.toml`** declaring dependencies
  (`pytest`, `pytest-asyncio`, `aiohttp`) so the suite is installable
  and runnable out of the box.

### Fixed
- **`pmcp-conformance/`**: stale imports of the pre-migration path
  `tests.conformance.conftest` in `test_02..test_06` caused pytest to
  ERROR at collection. Removed the hyphen-broken package `__init__.py`
  and switched imports to `from conftest import rpc_call`. All 42
  conformance tests now collect and pass.
- **`pmcp-python/pyproject.toml`**: dropped six broken `console_scripts`
  entry points (`pmcp-hub`, `pmcp-marketplace`, `pmcp-depin`,
  `pmcp-multisig`, `pmcp-swarm-coo`, `pmcp-compliance`) whose target
  modules moved to `pmcp-labs/` or `pmcp-safety/` during the split
  (they are no longer importable from this package) and whose target
  functions were async coroutines that could not run as
  `console_scripts` even in the pre-split layout.
- **`pmcp-python/pyproject.toml`**: shrank `[tool.setuptools.packages.find]`
  `include` from 19 patterns (most of which no longer exist in
  `pmcp-python/`) to only `v05*`, `pmcp*`, `sdk*` — the packages that
  actually ship. The built wheel now contains exactly those three
  top-level packages and nothing else.
- **`pmcp-python/pyproject.toml`**: `readme = "docs/README.md"` pointed
  at a directory that does not exist in the split repo. Corrected to
  `README.md`.
- **`pmcp-python/tests/`**: added `__init__.py` to the tests directory
  and each subdirectory (`unit/`, `v05/`, `integration/`, …) so pytest
  can import test modules as packages. Full suite: **213 passed, 1
  skipped**.
- **`pmcp-spec/docs/PROTOCOL_SPEC.md`**: fixed gate-order inconsistency
  in §13.3 (LLM Safety Invariant), which still showed the old
  Shadow → Constitution order that the rest of the spec had already
  corrected to E-Stop → Lease → Constitution → Shadow.
- **`pmcp-spec/docs/PROTOCOL_SPEC.md`**: reclassified CONST-01 through
  CONST-08 so the **rule semantics** are normative but the **numeric
  thresholds** (2.0 m/s, 50 000 J, 0.5 m, …) are labeled non-normative
  reference defaults sized for a small collaborative arm. Also
  reconciled CONST-01 (2.0 m/s cap) with the tighter `move_to`
  inputSchema (1.0 m/s cap) so readers know both apply.
- Deleted committed dev caches (`.mypy_cache/`, `.ruff_cache/`,
  `.pytest_cache/`, `__pycache__/`) that had been included in the
  migration.

### Known limitations documented (not yet fixed)
- Duplicate `PMCPServer`/`PMCPClient`/`ShadowPreview` implementations
  in `pmcp-python/{pmcp,sdk,v05}/` — flagged in `MIGRATION_MAP.md` and
  the sub-project's own README, decision deferred.
- `pmcp-servers/robot_servers/*` and half of `pmcp-servers/examples/`
  hard-import `from v05...` or `from pmcp_grand_unified`; they only
  work when `pmcp-python` (and `pmcp-labs`, for the grand-unified path)
  is on `PYTHONPATH`.
- `pmcp-rust/pmcp-core/Cargo.toml` declares `pyo3` with
  `features = ["extension-module"]` but the `python` feature that gates
  `pub mod python` is never declared; plain `cargo build` needs the
  extension-module environment to succeed.
- `pmcp-registry/` has no auth, no request-size limit, CORS-`*` on
  POST/DELETE in `api_server.py`, and no host/port allowlist on
  `register/*` — do not expose to untrusted networks.
- `pmcp-safety/tee-attestator/` and `pmcp-safety/safety-loop/` default
  to mock-backed operation; the interface is real, the enclave and
  simulator backends are placeholders.
- `pmcp-labs/infra/**` Dockerfiles and `docker-compose.yml` files still
  reference pre-split paths (`v05/`, `rust/pmcp-core/`, `registry.*`)
  and do not build against the current layout.

## Pre-split history

For versions **0.1.0 through 0.5.0** of the Python SDK (the pre-split
`pmcp` package's own release history), see
[`pmcp-python/`](pmcp-python/)'s own changelog when one is written, or
`pmcp-labs/legacy/` for the historical snapshots.

The migration from a single monorepo to the current nine-repo layout is
documented in [`MIGRATION_MAP.md`](MIGRATION_MAP.md).
