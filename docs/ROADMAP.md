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

Goal: deliver the first runnable product foundation without live external AI or deployment automation.

Scope:

- web application shell;
- three-zone interface: projects/files, central dialogue/preview, tasks/progress;
- project list, creation and switching;
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
- production deployments;
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

### Phase 1 closure record — 2026-09-01

Technical candidate `4158fe61fbc01c4906948ea48b794931023367ef` completes the bounded implementation and passes the local automated gates: strict types, lint, 73 tests, production build, standalone artifact check, production-dependency audit and full dependency audit. The detailed, non-normative evidence matrix is in `docs/reports/PHASE-1-CLOSURE.md`.

The published closure tree `726e338b81484c25e4853c1c14f1fc53ebfc38f1` passed every declared step in GitHub Actions run `33563346403` on draft PR #1. The final phase verdict remains **🟡 deferred**, not closed, because criterion 3 still lacks real-browser desktop visual/usability evidence: the authorized browser environment blocks all local application URLs and explicitly forbids alternate browser workarounds. Any later CI or visual failure reopens the relevant implementation work. Phase 2 has not started.

External deployment remains outside Phase 1. This record makes no production-readiness or production-validation claim.

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
