# Contributing to pmcp-org

Thanks for your interest. This is an early-stage monorepo, so a lot of
what "contributing" means is going to shift. What follows is the
current guidance.

## Where the work lives

Each sub-project (`pmcp-spec/`, `pmcp-python/`, `pmcp-conformance/`, …)
is designed to become its own independent GitHub repository. Until
then, all changes go through this monorepo. **Please keep your PR
scoped to a single sub-project when you can.** Cross-cutting changes
(e.g. spec + Python + conformance in one PR) are fine but should be
called out in the description.

## Where the priorities are

The sequencing described in [`MIGRATION_MAP.md`](MIGRATION_MAP.md)
still applies:

1. `pmcp-spec` and `pmcp-conformance` stabilize first.
2. `pmcp-python`, then `pmcp-typescript`, then `pmcp-rust`.
3. `pmcp-servers`, `pmcp-registry`, `pmcp-safety`.
4. `pmcp-labs` is quarantine — please don't rely on it, and please
   don't add new work there.

High-value changes right now:

- Any consolidation of the duplicate `PMCPServer`/`PMCPClient`/
  `ShadowPreview` implementations across `pmcp-python/{pmcp,sdk,v05}/`
  (see the `pmcp-python` README for the deprecation questions).
- Populating the per-JSON-RPC-method schemas under
  `pmcp-spec/schema/` (currently only `$defs` for data types exist).
- Adding a real driver for `pmcp-conformance` so it can validate
  external implementations, not just its own in-process mock.
- Auth + input-validation on `pmcp-registry`.
- Replacing the mock TEE backend in `pmcp-safety/tee-attestator/`
  with a real SGX/SEV-SNP/TDX verification path.

## Running the checks locally

For the Python SDK:

```bash
cd pmcp-python
pip install -e ".[dev,numerics]"
pytest --asyncio-mode=auto
```

For the conformance suite:

```bash
cd pmcp-conformance
pip install -e .
pytest --asyncio-mode=auto -v
```

Both suites must pass on every PR.

## PR description

Please include:

1. Which sub-project(s) you touched.
2. Why the change is needed (what claim, bug, or gap it addresses —
   citing a line in a README or `MIGRATION_MAP.md` is a good pattern).
3. How you verified it (which tests/checks you ran).
4. Anything you deliberately left for a follow-up.

## Code of conduct

Be kind, be specific, be honest about what you did and didn't verify.
No further formal Code of Conduct has been adopted yet.

## License

By contributing, you agree that your contribution is licensed under
the Apache License 2.0, matching this repository.
