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

The application now contains two integrated product surfaces:

- `/` provides the Next.js 16.3.4/React 18/TypeScript three-zone workspace, complete guided project setup and persistent local text conversation per project. Users can create and edit project settings, define missions and activities, manage structured blockers, validate mandatory gates, record messages, switch projects and reopen persisted browser-local work.
- `/admin` provides a dedicated Supabase-backed control plane for authenticated settings, role membership, connector/vault references, hosting and VPS/CPU/GPU inventory, external and open-source AI models, worker deployments, routing policy, durable action requests, connection checks and audit evidence.

The project workspace progress is derived from verified checkpoints and required validation gates. The administrator surface distinguishes declared/desired state from trusted adapter-observed state and never presents a queued remote action as successful.

State is stored in the current browser profile through a repository boundary. The strict v5 codec validates snapshots, migrates v1/v2/v3/v4 state without inventing validation or AI responses, creates a recovery backup before promotion, serializes same-origin tab writes with Web Locks, detects stale revisions and refuses to overwrite corrupt or future-version data.

Project content remains browser-local in the current Phase 1 repository boundary. Administrative control metadata, identities and roles are durable in Supabase. Vendor-specific provider calls, voice processing and arbitrary remote execution still require the later trusted adapter/runtime phases; their absence is reported as a prerequisite rather than simulated. Current project-setup evidence is recorded in `docs/reports/PROJECT-SETUP-DELIVERY.md`; the administrative implementation and runbook are defined by `docs/ADMIN-CONTROL-PLANE.md` and `docs/ADMIN-OPERATIONS.md`.

## Repository map

- `app/` — Next.js application entry and global presentation.
- `components/` — project workspace plus the dedicated role-aware administration UI.
- `lib/` — Phase 1 local domain services plus typed Supabase administrative repository boundaries.
- `supabase/` — versioned control-plane migrations and authenticated Edge Functions.
- `tests/` — domain, persistence, control-plane integrity, security-boundary and UI tests.
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
8. `docs/ADMIN-CONTROL-PLANE.md` — administrator roles, settings, infrastructure/model inventory and trust boundaries.
9. `docs/ADMIN-OPERATIONS.md` — configuration, identity bootstrap, operations, failures and recovery.
10. `docs/ROADMAP.md` — phased delivery plan and exit criteria.
11. `docs/VALIDATION.md` — definition of done, evidence and production gates.
12. `SECURITY.md` — security requirements and reporting expectations.
13. `CONTRIBUTING.md` — contribution discipline.

## Developer quick start

Requires Node.js 22+.

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

Phase 0 governance/architecture remains the frozen development baseline. The reopened Phase 1 project setup and the administrative control-plane candidate pass the local type, lint, test, dependency and static-build gates with 109 automated tests. Phase 1 project state remains browser-local; the administrative plane uses the provisioned Supabase project for authenticated durable metadata. Vendor/runtime adapters still own real provider calls, VPS commands and model installation. Published commit, CI, Netlify and browser evidence are recorded in the delivery reports after each release gate completes.
