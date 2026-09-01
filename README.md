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

The Phase 1 candidate provides a Next.js 16.3.4/React 18/TypeScript visual workspace with three explicit zones and a complete guided project-setup workflow. Users can create and edit project settings, define the first mission and activities, add missions and activities later, manage structured blockers, validate mandatory gates, switch projects and reopen persisted work. The central preview reflects the selected project. Progress is derived from verified checkpoints and required validation gates; rounding cannot make an incomplete task, mission or project appear 100% complete.

State is stored in the current browser profile through a repository boundary. The strict v4 codec validates snapshots, migrates v1/v2/v3 state without inventing validation, creates a recovery backup before promotion, serializes same-origin tab writes with Web Locks, detects stale revisions and refuses to overwrite corrupt or future-version data.

This remains a browser-local product foundation. It has no server persistence, account synchronization, live AI/provider call, voice processing, remote execution or connector write. A static Netlify preview validates the exported interface and hosting configuration; it is not a production backend or an in-product deployment capability. Current delivery evidence is recorded in `docs/reports/PROJECT-SETUP-DELIVERY.md`; `docs/reports/PHASE-1-CLOSURE.md` is retained as the historical pre-reopening report.

## Repository map

- `app/` — Next.js application entry and global presentation.
- `components/` — project explorer, conversation/preview workspace, mission panel and accessible progress UI.
- `lib/` — Phase 1 types, codec/migrations, validated progress, application services and local repository.
- `tests/` — domain, persistence, security-boundary and workspace integration tests.
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

Requires Node.js 20.9+.

```bash
npm ci
npm run dev
```

Before considering a change ready:

```bash
npm run validate
npm audit --omit=dev --audit-level=high
```

Phase 1 requires no external AI credentials. Do not commit secrets or place credentials in browser persistence.

## Current delivery status

Phase 0 governance/architecture remains the frozen development baseline. The reopened Phase 1 complete-project-setup implementation passes the local type, lint, test, dependency and static-build gates with 92 automated tests. The exact published commit, GitHub Actions run, Netlify deploy and browser evidence are consolidated in `docs/reports/PROJECT-SETUP-DELIVERY.md`. This delivery validates the bounded browser-local Phase 1 scope and a static preview; it does not assert server persistence, connector execution or production readiness.
