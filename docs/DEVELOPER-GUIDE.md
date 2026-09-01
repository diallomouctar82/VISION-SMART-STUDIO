# Vision Smart Studio — Developer Guide

## Purpose

This guide is the operational entry point for a developer taking responsibility for Vision Smart Studio. Read it together with `REFERENCE.md`, `CONSTITUTION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `VALIDATION.md`, `SECURITY.md`, and `CONTRIBUTING.md` before changing implementation.

## Product in one sentence

Vision Smart Studio is a visual AI orchestration workspace that takes a user from an idea to a validated, deployed digital result by coordinating domain-specialist agents, AI models, connectors and execution workers.

## Mental model

The user interacts with one coherent Studio. Internally the platform separates concerns into planes:

1. Experience plane — projects, conversation, previews, tasks and progress.
2. Project knowledge plane — requirements, decisions, architecture, roadmap and persistent context.
3. Orchestration plane — mission decomposition, assignment, handoffs, peer review and validation gates.
4. AI/model plane — external providers plus internally hosted open-source models.
5. Connector plane — normalized access to repositories, deployment platforms, databases, APIs and infrastructure.
6. Execution plane — isolated local/cloud/CPU/GPU workers that perform real work.
7. Validation/release plane — evidence, quality, security, documentation, non-regression and production controls.
8. Security/governance plane — identity, authorization, secrets, auditability, isolation and recovery.

These boundaries are intentional. Do not put provider-specific model logic in UI components, deployment-specific logic in the orchestrator, or raw secrets in project state.

## Current implementation

The current Phase 1 implementation is intentionally small:

- Next.js + React + TypeScript application shell;
- `app/` contains the application entry and global styling;
- `components/StudioWorkspace.tsx` owns the current interactive workspace prototype;
- `lib/studio-types.ts` defines Phase 1 project/mission/task domain types;
- `lib/studio-store.ts` provides browser-local persistence and migration from the earliest Phase 1 state;
- `.github/workflows/ci.yml` runs typecheck, lint and production build.

Phase 1 is not the final architecture for persistence, orchestration or execution. Browser localStorage is a temporary development persistence mechanism and must later be replaced behind a repository/service abstraction rather than spread through UI code.

## Domain hierarchy

The core execution hierarchy is:

`Workspace -> Project -> Mission -> Task -> Execution -> Evidence -> Validation`

A Project contains durable context. A Mission represents a bounded outcome. Tasks are execution units. Executions record attempts. Evidence proves results. Validation determines whether the mission may advance or close.

Progress is based on validated work, not time elapsed. A mission cannot reach 100% merely because commands have finished.

## Agent model

Agents are domain specialists rather than vendor specialists. Examples: Product, Architecture, UX, Engineering, Data, Security, QA, AI/Models, Integration & Deployment, Documentation.

The orchestrator is the single coordinator. It must:

- understand the expected outcome;
- create the mission plan and dependencies;
- assign work to appropriate domain agents;
- maintain shared project context;
- coordinate handoffs;
- require peer or specialist checks where appropriate;
- route failures back to correction;
- collect evidence;
- enforce quality/security/documentation gates;
- continue toward delivery until validated or genuinely externally blocked.

An Integration & Deployment agent is not a “GitHub agent” or “Netlify agent”. It uses whichever approved tools are appropriate to deliver the integration/deployment outcome.

## Model architecture

All model use must eventually pass through the Model Gateway. The gateway must support:

- external providers;
- internally hosted open-source models;
- model capability metadata;
- manual selection;
- policy-based routing;
- fallback;
- cost/latency/load/confidentiality decisions;
- internal-only routing for sensitive work;
- usage and health telemetry.

Never encode a product workflow around a single provider's model names or API response shape.

## Connector architecture

Connectors normalize external capabilities. Each connector should declare identity, capabilities, authentication requirements, permissions, environment scope, health and supported operations.

Protocol support may include REST, GraphQL, Webhooks, MCP, SDKs, OAuth, SSH and future standards. Adding or removing one connector must not require rewriting unrelated modules.

## Execution architecture

Execution workers perform actual commands and compute. Future workers may be local, VPS/cloud CPU, GPU, containerized or specialized. Every execution must be attributable to project, mission, task, worker, actor/agent, environment and result. Production actions require stronger gates than development actions.

## Security expectations

Assume every connector, worker and model boundary is a trust boundary. Use least privilege. Never commit credentials. Separate dev/staging/prod. Sensitive operations require auditable authorization. Consult `SECURITY.md` before adding authentication, secrets, remote execution, model hosting or production connectors.

## How to implement a feature

Before coding, locate the feature in the roadmap and confirm its architecture and acceptance criteria. If missing, update the canonical documentation first. Keep the change bounded. Implement through the correct module boundary. Add or update tests/checks. Correct failures rather than documenting them as finished. Update affected documentation. Run validation. Commit with an explicit message. Do not close a phase until the consolidation pass in `REFERENCE.md` succeeds.

## Phase 1 developer workflow

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev` for local development.
4. Run `npm run typecheck`.
5. Run `npm run lint`.
6. Run `npm run build`.
7. Verify project creation, project switching, mission/task progression and refresh persistence manually until automated UI tests are added.

No external AI credential should be required for Phase 1.

## Naming and boundaries

Use domain names rather than provider names for core abstractions. Prefer `ModelGateway`, `Connector`, `ExecutionWorker`, `Mission`, `ValidationResult` over abstractions tied to one vendor. Vendor names belong in adapters.

Keep UI state separate from durable project state. Keep execution events append-friendly and auditable. Keep validation evidence immutable or versioned where practical.

## What not to do

- Do not bypass the orchestrator for product-level agent coordination.
- Do not call provider APIs directly from arbitrary UI components.
- Do not store secrets in Git, browser localStorage or project documents.
- Do not make production deployment a side effect of ordinary development actions.
- Do not mark tasks complete without applicable validation.
- Do not create duplicate architecture definitions when a canonical document already owns the concept.
- Do not make the user perform technical steps the platform is authorized and capable of executing itself.

## Taking over the project

A new developer should be able to answer these questions before making structural changes:

- What user outcome is the current phase delivering?
- Which canonical module owns the change?
- What data/entity boundaries are affected?
- Which trust boundaries are crossed?
- What is the validation gate?
- What evidence will prove completion?
- What can regress?
- Which documentation becomes stale if the change is merged?

If any answer is unclear, resolve that ambiguity in the repository before implementation.