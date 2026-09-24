# SDEC — Student Digital Election Commission

The app lives in [`sdec-web/`](./sdec-web) — see
[`sdec-web/README.md`](./sdec-web/README.md) for setup, environment
variables, making the first admin, and deployment.

- [`docs/SDEC_PLAN.md`](./docs/SDEC_PLAN.md) — the product spec and build phases.
- [`docs/ELECTION_DAY_RUNBOOK.md`](./docs/ELECTION_DAY_RUNBOOK.md) — running a live election.
- [`CLAUDE.md`](./CLAUDE.md) — implementation notes and gotchas for anyone (human or AI) working on this codebase.

The original Express/MySQL/React prototype that used to live in
`client/`/`server/` was retired once the Next.js + Supabase rebuild in
`sdec-web/` reached parity — see git history if it's ever needed as a
reference.
