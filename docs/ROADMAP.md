# Vision Smart Studio — Delivery Roadmap

## Phase 0 — Foundation

Goal: establish the project source of truth before product implementation.

Deliverables:

- repository governance;
- constitution;
- initial architecture;
- delivery roadmap;
- validation framework;
- coding and contribution conventions.

Exit criteria:

- documents committed to GitHub;
- architecture boundaries are internally consistent;
- Phase 1 scope and acceptance criteria are explicit;
- no secrets in repository.

## Phase 1 — Visual Workspace Skeleton

Goal: deliver the first runnable product foundation without external AI or deployment automation.

Scope:

- web application shell;
- three-zone interface;
- project list and project creation;
- central conversation workspace placeholder;
- right-side mission/task panel;
- task states and progress percentage;
- persistent local/development data model;
- basic project resume flow;
- automated build/lint/type checks.

Explicitly excluded from Phase 1:

- live AI provider calls;
- voice;
- remote code execution;
- production deployments;
- third-party connector writes.

Phase 1 acceptance criteria:

1. Application starts cleanly from documented commands.
2. A project can be created and reopened.
3. The three zones are visible and usable on a desktop viewport.
4. A mission with subtasks can be created in development data and progress updates visibly from 0–100%.
5. Refreshing the page preserves project and task state.
6. Build, lint, and type checks pass.
7. No secret or provider credential is required to run Phase 1.

## Phase 2 — Product Discovery Conversation

Goal: turn text conversation into structured project definition.

Scope:

- conversation persistence;
- requirement capture;
- clarification workflow;
- project brief generation;
- architecture/acceptance-gate workflow.

## Phase 3 — Model Gateway

Goal: connect multiple AI providers without coupling the UI to one provider.

Scope:

- provider adapters;
- model catalog;
- manual selector;
- routing policy framework;
- usage/cost/latency telemetry;
- fallback handling.

## Phase 4 — Voice & Multimodal Interaction

Goal: allow voice-led project discovery and interaction.

Scope:

- speech input;
- speech output;
- transcript persistence;
- multimodal attachments where supported.

## Phase 5 — Connector Framework

Goal: connect external project and infrastructure systems safely.

Initial connectors:

- GitHub;
- Supabase;
- Netlify;
- Docker;
- cloud/VPS execution abstraction.

## Phase 6 — Remote Execution Plane

Goal: execute development missions on controlled cloud workers.

Scope:

- worker registration;
- isolated project checkout;
- command execution;
- build/test jobs;
- progress events;
- logs/evidence collection;
- cancellation and failure handling.

## Phase 7 — Specialized Agent Orchestration

Goal: coordinate architecture, frontend, backend, database, QA, security, DevOps, and documentation roles through one user-facing agent.

## Phase 8 — Validation & Controlled Production Delivery

Goal: move completed missions to production only after evidence-based gates.

Scope:

- non-regression gate;
- deployment plans;
- environment protection;
- release evidence;
- rollback preparation;
- explicit production verdict.

## Phase rule

A later phase does not begin merely because work exists for it. The current phase must satisfy its exit criteria first, unless architecture work explicitly identifies a blocking dependency that must be resolved earlier.