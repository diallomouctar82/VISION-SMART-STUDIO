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

The repository currently implements two intentionally separate state boundaries.

The Phase 1 project workspace plus the first bounded Phase 2 text slice provide:

- Next.js 16.3.4 + React 18 + strict TypeScript application shell;
- `app/` contains the application entry and responsive global styling;
- `components/StudioWorkspace.tsx` integrates loading, serialized mutations, setup/settings dialogs and persistence presentation;
- `components/ProjectExplorer.tsx`, `ConversationWorkspace.tsx`, `ProjectPreview.tsx`, `MissionPanel.tsx`, `ProjectSetupDialog.tsx` and `ProgressBar.tsx` own the three visible zones and accessible controls;
- `lib/studio-types.ts` defines the v5 Project/Mission/Task, conversation/message, checkpoint, gate and blocker records;
- `lib/studio-progress.ts` derives weighted progress and reserves 100% for individually completed work;
- `lib/studio-service.ts` owns immutable domain transitions and completion rules;
- `lib/studio-codec.ts` strictly validates v5 and migrates v1/v2/v3/v4 without treating legacy percentages as proof or delivery statuses as model answers;
- `lib/studio-repository.ts` owns browser `localStorage`, Web Locks, revisions, recovery backups and non-destructive failure results;
- `lib/studio-store.ts` is the Phase 1 façade and honest zero-progress seed; it does not access storage directly;
- `tests/` covers codec/migrations, repository failures/conflicts, services, progress, security boundaries/configuration and integrated workspace resume behavior;
- `.github/workflows/ci.yml` installs deterministically and runs typecheck, lint, tests, production-dependency audit and build.

The prioritized administrative control plane provides:

- `app/admin/page.tsx` and `components/admin/` for authenticated overview, connections, infrastructure, models, routing, security and audit;
- `lib/admin-*` for validated input, typed contracts and the application repository boundary;
- `lib/supabase-client.ts` for a browser-only public-key client with no privileged credential path;
- `supabase/migrations/` for fourteen forced-RLS tables, explicit grants, workspace-safe relationships, concurrency, audit, routing/action integrity and atomic transition requests;
- `supabase/functions/admin-invite-member/` for JWT-protected, server-authorized e-mail invitations;
- `lib/supabase-database.types.ts` for generated database/RPC types;
- dedicated tests for input validation, migration/security invariants, Edge Function boundaries and desired/observed state presentation.

Phase 1 project persistence remains local to one browser profile. Administrative control metadata is relational and multi-user in Supabase, but it does not migrate Phase 1 project snapshots or activate provider/VPS/model execution. Those concerns stay behind their canonical adapter/runtime boundaries.

## Domain hierarchy

The core execution hierarchy is:

`Workspace -> Project -> Mission -> Task -> Execution -> Evidence -> Validation`

A Project contains durable context. A Mission represents a bounded outcome. Tasks are execution units. Executions record attempts. Evidence proves results. Validation determines whether the mission may advance or close.

Progress is based on validated work, not time elapsed. A mission cannot reach 100% merely because commands have finished.

Phase 1 implements only the lightweight `Project -> Mission -> Task` slice. Checkpoints, gates and bounded evidence/reason strings make local progression auditable, but they are not the durable `Execution`, `Evidence`, `ValidationResult` or audit entities planned by the canonical data model.

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

1. Install Node.js 22+.
2. Run `npm ci`.
3. Run `npm run dev` for local development.
4. Run `npm run validate` to execute typecheck, lint, all tests and the production build.
5. Run `npm audit --omit=dev --audit-level=high`; use a full `npm audit --audit-level=high` during phase closure.
6. Verify the complete create/edit/reopen flow and the three-zone layout in a real browser. Check desktop presentation plus responsive tablet/mobile behavior and attach available screenshots to the delivery report. A successful build or DOM test is not a substitute for visual-layout evidence.

No external AI credential should be required for Phase 1.

## Administrative control-plane workflow

1. Configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the web build.
2. Apply new SQL through the authorized Supabase migration path; never modify applied migrations.
3. Regenerate `lib/supabase-database.types.ts` after schema/RPC changes.
4. Deploy Edge Functions with JWT verification and exact-origin CORS.
5. Run `npm run validate`, full/production dependency audits and both Supabase advisors.
6. Verify `/admin` authentication, workspace bootstrap, role restrictions, all seven areas, refresh/resume and the deployed CSP.
7. Follow `ADMIN-OPERATIONS.md` for enrolment, action semantics, failures and recovery.

## Validated Phase 1 limits

- Phase 1 project state is device/browser-profile local; it has no account synchronization, collaboration or multi-user conflict resolution. This limit does not describe the separate Supabase-backed administrative metadata plane.
- Web Locks serialize writes between tabs on the same origin before stale-revision validation. This prevents silent same-origin tab overwrites where Web Locks are available, but it is not a distributed concurrency or merge system.
- The file list is a presentation seam and the central project preview is derived from project state; Phase 1 does not persist project files or generated artifacts.
- Text dialogue input is active and browser-local per project. Voice, model selection, provider routing, live AI responses, connectors and remote execution remain deliberately disabled.
- The Model Gateway and provider adapters remain Phase 3 work; provider independence in Phase 1 is preserved by the absence of provider coupling, not by a delivered gateway.
- `output: "export"` emits the static `out/` artifact. The Netlify preview validates static hosting and configured security headers only; it is not a production backend, environment execution or in-product deployment capability.
- Corrupt or unsupported local state is displayed read-only and not overwritten. User-facing repair/export tooling is future work.

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
