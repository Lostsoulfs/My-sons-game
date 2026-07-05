# Plans — durable design docs for upcoming / just-shipped work

Finalized implementation plans live here, numbered ADR-style (`NNNN-kebab-name.md`), so a plan is never
lost to a closed chat and never needs re-researching. Distinct from its neighbours:

- [`adr/`](../adr/) — the _decision_ + rationale (often the durable outcome of a plan).
- [`WORKLOG.md`](../WORKLOG.md) — _what shipped_, dated, per PR.
- [`BACKLOG.md`](../BACKLOG.md) / [`ROADMAP.md`](../ROADMAP.md) — _what's next_.

**Convention:** raw external research (e.g. ChatGPT deep-research dumps) is **not** committed — it stays
local with the owner; only the distilled plan lands here. Number sequentially; record anything that
changed during the build in the plan's **As-built** note (and the PR body's `## Deviations`).

| #    | Plan                                                                                         | Status                  |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------- |
| 0001 | [FPS instrumentation + safe dial-backs](0001-fps-instrumentation.md)                         | Shipped — v0.8.16       |
| 0002 | [Weapon & economy redesign (CP1–CP5)](0002-weapon-economy-redesign.md)                       | In flight — PRs #84–#87 |
| 0003 | [UI-first legibility → combat → companion → models → modes](0003-ui-first-legibility-arc.md) | Planned                 |

> The 2026-07-03 **M0–M5 expansion** (controller fix, weapon FX, 1950s weapons, Enforcer boss) shipped
> before this archive existed — it's captured in [`WORKLOG.md`](../WORKLOG.md) and ADRs 0031–0035.
