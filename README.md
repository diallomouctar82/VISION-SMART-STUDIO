# VISION SMART STUDIO

Vision Smart Studio is an AI orchestration platform for turning ideas into validated, production-ready digital solutions through one visual workspace and a coordinated team of domain-specialist agents.

## Source of truth

This GitHub repository is the official source of truth. Architecture, roadmap, governance, validation, implementation guidance and production decisions are versioned here. Conversation is used only for validation, clarification and concise progress reporting.

## Product principles

- One unified visual control interface: projects left, dialogue/workspace center, execution/progress right.
- Natural text and voice journey from idea discovery to delivered result.
- Architecture, documentation, roadmap and validation criteria before implementation.
- Agents are transversal domain experts coordinated as one team by a single orchestrator.
- Agents own outcomes end to end; handoffs, mutual control and correction loops are explicit.
- Quality, security and documentation validation are mandatory before completion.
- Manual or intelligent model selection with final user control.
- Hybrid AI: external APIs, internally hosted open-source models, or both.
- Universal, replaceable connector architecture supporting multiple protocols and vendors.
- Local/cloud CPU/GPU execution workers behind a simple visual experience.
- Security by Design, least privilege, traceability, isolation, backup and recovery.
- Errors/regressions are corrected before continuation when within execution authority.
- Progress reflects validated work, not elapsed time.
- GitHub remains authoritative and documentation divergence blocks phase closure.

## Current implementation

Phase 1 currently provides a Next.js/React/TypeScript visual workspace, project creation/switching, Project -> Mission -> Task state, browser persistence with migration, task progression and CI for typecheck/lint/build. This is a product foundation, not the final persistence or orchestration implementation.

## Repository map

- `app/` — Next.js application entry and global presentation.
- `components/` — interactive product UI.
- `lib/` — current Phase 1 domain types and persistence helpers.
- `.github/workflows/` — automated validation.
- `docs/` — canonical product/engineering knowledge.

## Canonical documentation

Start with these files in order when taking over the project:

1. `docs/REFERENCE.md` — canonical map and consolidation rules.
2. `docs/CONSTITUTION.md` — permanent governance and execution rules.
3. `docs/ARCHITECTURE.md` — system planes, modules and boundaries.
4. `docs/DEVELOPER-GUIDE.md` — developer mental model, workflow and takeover guide.
5. `docs/AGENTS.md` — agent team topology, mission lifecycle, handoffs and control loops.
6. `docs/DATA-MODEL.md` — canonical durable domain concepts and invariants.
7. `docs/CONNECTORS-AND-MODELS.md` — universal connectors and hybrid model contracts.
8. `docs/ROADMAP.md` — phased delivery plan and exit criteria.
9. `docs/VALIDATION.md` — definition of done, evidence and production gates.
10. `SECURITY.md` — security requirements and reporting expectations.
11. `CONTRIBUTING.md` — contribution discipline.

## Developer quick start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Before considering a change ready:

```bash
npm run typecheck
npm run lint
npm run build
```

Phase 1 requires no external AI credentials. Do not commit secrets or place credentials in browser persistence.

## Current delivery status

Phase 0 governance/architecture is established and continuously consolidated. Phase 1 implementation is active. It is not complete until its functional, persistence, build, type, lint, documentation and consolidation criteria are verified.