# Vision Smart Studio — Delivery Roadmap

## Global phase rule

Every phase follows the same lifecycle: architecture → implementation → tests → correction → quality/security/documentation validation → consolidation → commit → phase verdict. A later phase does not begin merely because work exists for it. The current phase must satisfy its exit criteria first, unless a blocking architectural dependency must be resolved earlier.

Before any phase is closed, perform a repository-wide consolidation pass using `docs/REFERENCE.md` to ensure no approved requirement is missing, duplicated inconsistently, obsolete or contradictory.

## Phase 0 — Foundation

Goal: establish the project source of truth and governance before product implementation.

Deliverables:

- repository governance and GitHub source-of-truth rule;
- constitution;
- canonical architecture;
- delivery roadmap;
- validation framework;
- canonical reference map;
- coding and contribution conventions;
- Security by Design baseline;
- provider/model independence baseline;
- transversal agent outcome-ownership baseline.

Exit criteria:

- canonical documents committed to GitHub;
- architecture boundaries internally consistent;
- strategic requirements represented without known gaps;
- Phase 1 scope and acceptance criteria explicit;
- no secrets in repository;
- consolidation pass complete.

## Phase 1 — Visual Workspace Foundation

Goal: deliver the first runnable product foundation without live external AI or in-product deployment automation.

Scope:

- web application shell;
- three-zone interface: projects/files, central dialogue/preview, tasks/progress;
- project list, guided creation, switching and local settings;
- project identity, description, expected outcome, lifecycle status, target environment and optional repository reference;
- initial mission definition and user-defined activities represented by canonical tasks;
- local creation of additional missions and activities after project creation;
- explicit declaration and resolution of task blockers;
- central conversation workspace placeholder;
- right-side mission/task panel;
- task states and real progress percentage semantics;
- persistent local/development state;
- basic project resume flow;
- foundational domain types;
- automated build/lint/type checks.

Explicitly excluded from Phase 1:

- live AI provider calls;
- voice processing;
- remote code execution;
- application-driven production deployments;
- third-party connector writes.

Phase 1 acceptance criteria:

1. Application starts cleanly from documented commands.
2. A project can be created, selected and reopened.
3. The three zones are visible and usable on a desktop viewport.
4. A mission/task set can represent progress from 0–100% from actual state.
5. Refreshing the page preserves project and task state.
6. Build, lint and type checks pass.
7. No secret or provider credential is required to run Phase 1.
8. Phase 1 implementation matches canonical architecture for its scope.
9. Consolidation pass finds no known Phase 1 documentation divergence.

### Phase 1 scope reopening — complete local project setup (2026-09-01)

An explicit user instruction reopens Phase 1 before final closure so project creation is no longer limited to a name plus an opaque generic template. The approved extension remains browser-local and does not activate later-phase providers or connectors.

The delivered flow must:

1. collect and validate the project name, description, expected outcome, lifecycle status, target environment and optional HTTPS repository reference;
2. collect a first mission title/outcome and at least one initial activity before creation;
3. create the project, mission, activities, checkpoints and mandatory quality/security/documentation gates as one validated immutable service transition;
4. prevent duplicate submissions and confusing duplicate project, mission or activity labels;
5. allow project settings to be updated and additional missions/activities to be added through the visual interface;
6. expose both declaration and resolution of structured blockers;
7. preserve prior v1/v2/v3 browser snapshots through a versioned, backed-up migration;
8. persist and resume the resulting state after refresh without requiring a credential;
9. provide accessible desktop, tablet and mobile behavior plus clear validation and storage-failure states;
10. pass typecheck, lint, automated tests, dependency audit, production build, real-browser functional checks and Netlify preview verification.

This extension does **not** create a Supabase schema, synchronize accounts, write to a repository, invoke an AI model, send dialogue, process voice or perform remote execution. Those trust-boundary capabilities remain governed by their later roadmap phases. The earlier closure candidate is retained as historical evidence, but it is no longer the final Phase 1 implementation after this scope reopening.

### Historical Phase 1 closure candidate — superseded on 2026-09-01

Technical candidate `4158fe61fbc01c4906948ea48b794931023367ef` completes the bounded implementation and passes the local automated gates: strict types, lint, 73 tests, production build, standalone artifact check, production-dependency audit and full dependency audit. The detailed, non-normative evidence matrix is in `docs/reports/PHASE-1-CLOSURE.md`.

The published closure tree `726e338b81484c25e4853c1c14f1fc53ebfc38f1` passed every declared step in GitHub Actions run `33563346403` on draft PR #1. The final phase verdict remains **🟡 deferred**, not closed, because criterion 3 still lacks real-browser desktop visual/usability evidence: the authorized browser environment blocks all local application URLs and explicitly forbids alternate browser workarounds. Any later CI or visual failure reopens the relevant implementation work. Phase 2 has not started.

This record predates and is superseded by the complete-project-setup extension above. Its measurements remain historical evidence only. A manually operated static Netlify preview may validate the exported UI without activating the later release plane or making a production-readiness claim. Current delivery evidence belongs in `docs/reports/PROJECT-SETUP-DELIVERY.md`.

## Priority Track A — Administrative Control Plane

An explicit user instruction on 2026-09-01 prioritizes the administration environment defined in the initial architecture. This cross-phase track delivers the management surface and secure control contracts required by Phases 3, 4, 6, 7 and 9 without declaring every vendor adapter or remote runtime complete.

Scope:

- dedicated administrator dashboard and role-aware navigation;
- workspace/platform settings and external/internal/hybrid mode;
- connector definitions/bindings across the canonical protocols and initial integration categories;
- hosting targets plus local/cloud/VPS CPU/GPU worker inventory, telemetry and lifecycle;
- external providers and internal/open-source model catalog, deployment and lifecycle;
- model routing, confidentiality, cost, latency, capacity and explicit fallback policies;
- Supabase-backed durable control metadata with RLS, memberships, secret references and append-oriented audit;
- trusted action/adaptor boundary that refuses to claim remote success without real evidence.

Track exit criteria:

1. The schema, roles, RLS, grants, indexes, concurrency and audit rules pass security/database validation.
2. The dashboard supports overview, connections, infrastructure, models, routing, security and audit on desktop/tablet/mobile.
3. Administrator/operator/auditor/viewer permissions are enforced at service/data boundaries.
4. All inventory/configuration actions persist, resume, validate and reject stale/double/invalid operations.
5. Open-source model records support resource requirements, runtime/worker binding, lifecycle and verified health.
6. No browser or public database record contains raw secrets or privileged commands.
7. Remote actions remain prerequisite-gated until a reachable enrolled target, vault credential and compatible adapter are present; no simulation is accepted.
8. Automated tests, audits, production build, CI, deployment smoke and real-browser evidence pass.

`docs/ADMIN-CONTROL-PLANE.md` is the owning specification. Existing numbered phases remain the owners of full provider adapters, inference runtime execution, remote worker execution and complete security enforcement beyond this control-plane track.

Implementation status on 2026-09-02: the dashboard, durable schema, role enforcement, inventory/settings flows, routing guards, atomic action requests, audit views and member invitation adapter are implemented and locally validated. Track closure still requires the current GitHub CI result, deployed Netlify smoke checks and real browser screenshots. Capability-specific remote adapters remain in their owning numbered phases and are not represented as completed.

## Phase 2 — Product Discovery & Project Definition

Goal: transform natural conversation into a validated executable project definition.

Scope:

- persistent text conversation;
- requirement capture and structured notes;
- missing-information detection;
- relevant clarification questions;
- reformulation and project brief generation;
- architecture proposal;
- roadmap and acceptance criteria generation;
- explicit user validation gate before development.

### Delivered slice — persistent local text conversation

The first bounded Phase 2 slice activates text entry for the active project. A valid message is
appended atomically to that project's local conversation and followed by a persisted
`delivery_status` from Studio stating that the message was recorded and that no AI model is
connected. This status is not a generated answer. Submission is available by the Send button or
Enter, is idempotent for one client submission identifier, rejects empty/oversized input, blocks
double submission while saving and preserves the draft on failure.

The v5 strict snapshot adds one conversation per project and migrates v4 snapshots to an empty
conversation through the repository backup/promotion flow. Persistence remains browser-local;
voice, requirement extraction, clarification, briefs, architecture/roadmap generation, approval
workflows and every real model invocation remain in later Phase 2/3 slices. This delivery therefore
does not close Phase 2.

## Phase 3 — Provider-Neutral & Hybrid Model Gateway

Goal: provide fluid access to external and internal AI models without coupling the product to one provider.

Scope:

- external provider adapters such as Anthropic, OpenAI, Gemini and OpenRouter;
- internal/open-source model adapters;
- model catalog and capability metadata;
- manual provider/model selector;
- intelligent routing framework;
- cost, latency, performance, confidentiality, health and server-load policies;
- fallback handling;
- usage/resource telemetry;
- execution modes: external-only, internal-only and hybrid.

Exit criteria include proving that a provider/model can be replaced without UI or orchestrator redesign.

## Phase 4 — Internal Model Manager

Goal: operate open-source models as first-class managed platform resources.

Scope:

- import and registration;
- installation and runtime configuration;
- activate/deactivate;
- update/version management;
- safe removal;
- CPU/GPU resource monitoring;
- model health and maintenance state;
- policy for confidential internal-only processing.

## Phase 5 — Voice & Multimodal Interaction

Goal: allow natural voice-led project discovery and interaction.

Scope:

- speech input;
- speech output;
- transcript persistence;
- conversation continuity between text and voice;
- multimodal attachments where supported.

## Phase 6 — Universal Connector Framework

Goal: connect project, code, data, infrastructure and external services through replaceable adapters.

Initial integrations include:

- GitHub;
- Supabase;
- Netlify;
- Vercel;
- Docker;
- Nginx;
- databases/storage;
- generic cloud/VPS control.

The framework must support extensible REST, GraphQL, Webhook, MCP, SDK, OAuth, SSH and future integration mechanisms. Each connector declares capabilities, permissions, environment scope, health and audit metadata.

## Phase 7 — Remote Execution Plane

Goal: execute development and infrastructure missions on controlled workers rather than depending on the user's local computer.

Scope:

- local worker abstraction;
- CPU cloud/VPS workers;
- GPU workers;
- worker registration and health;
- isolated project checkout/workspaces;
- controlled command execution;
- build/test jobs;
- progress events derived from execution state;
- logs and evidence collection;
- cancellation, retry and failure handling;
- environment separation.

## Phase 8 — Collaborative Agent Orchestration

Goal: operate Vision Smart Studio as one coordinated expert team behind a single user-facing orchestrator.

Scope:

- domain-based agent registry;
- mission decomposition into stages/tasks;
- agent assignment;
- shared mission context;
- structured agent-to-agent handoffs;
- mutual review and cross-checks;
- correction loops;
- model selection per task;
- dependency and progress tracking;
- end-to-end outcome ownership.

No agent role is tied to one vendor. Integration/deployment expertise, for example, spans compatible Git, hosting, container and infrastructure platforms.

## Phase 9 — Security & Governance Enforcement

Goal: enforce platform-wide Security by Design and operational trust controls.

Scope:

- users, organizations, identities, roles and permissions;
- least privilege;
- secure secrets lifecycle;
- encryption policies;
- audit and traceability;
- agent/model/connector action attribution;
- project/tenant/environment isolation;
- backup and disaster recovery;
- policy enforcement for sensitive workloads;
- security validation gates.

Security architecture begins in Phase 0 and is applied throughout earlier phases; Phase 9 completes the full enforcement layer.

## Phase 10 — Validation & Controlled Production Delivery

Goal: conduct a project from validated implementation to functional production delivery.

Scope:

- architecture conformance;
- quality gates;
- functional and non-regression gates;
- security validation;
- documentation validation;
- migrations and integration checks;
- deployment plans and environment protection;
- release evidence;
- post-deployment verification;
- rollback preparation;
- explicit production verdict.

A mission is not complete because code was generated or merged. The expected outcome must be delivered and validated.

## Continuous strategic requirement

All phases must preserve: modular architecture, provider independence, hybrid AI, universal connectivity, user control, natural interaction, end-to-end agent responsibility, traceability, security, correction before continuation, and GitHub as the single official reference.
