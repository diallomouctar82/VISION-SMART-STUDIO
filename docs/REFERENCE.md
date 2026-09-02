# Vision Smart Studio — Frozen Canonical Reference

**Baseline status: FROZEN FOR DEVELOPMENT**

This file is the single navigation authority for the Vision Smart Studio documentary baseline. GitHub is authoritative. The baseline is frozen as the approved foundation for implementation; future strategic changes require an explicit documentation change that identifies affected canonical documents and preserves cross-document consistency.

## Authority and document ownership

1. `docs/CONSTITUTION.md` — permanent governance: source of truth, result-first execution, outcome ownership, transversal agents, production discipline, security and consolidation obligations.
2. `docs/ARCHITECTURE.md` — canonical system architecture: experience, project knowledge, orchestration, model, connector, execution, validation/release and security planes; dependency boundaries and target entities.
3. `docs/DEVELOPER-GUIDE.md` — developer onboarding, mental model, implementation workflow, current Phase 1 mapping and takeover checklist.
4. `docs/AGENTS.md` — agent operating model: team topology, mission lifecycle, shared context, assignment, handoff, peer control, correction, blockers and auditability.
5. `docs/DATA-MODEL.md` — canonical durable domain concepts, relationships and invariants.
6. `docs/CONNECTORS-AND-MODELS.md` — connector contracts, protocols, secret references, hybrid AI modes, internal model management, routing and fallback.
7. `docs/ADMIN-CONTROL-PLANE.md` — administrative roles, interface, inventories, lifecycle controls, trust boundaries and acceptance criteria.
8. `docs/ADMIN-OPERATIONS.md` — subordinate implementation/runbook for the administrative control plane; it does not redefine connector/model contracts.
9. `docs/ROADMAP.md` — delivery phases, scope and exit criteria.
10. `docs/VALIDATION.md` — definition of done, evidence, progress semantics, quality/security/documentation gates and production verdicts.
11. `SECURITY.md` — repository security baseline, trust boundaries, secrets, identity/authorization, workers and connector security.
12. `CONTRIBUTING.md` — engineering workflow, coding boundaries, validation and commit discipline.
13. `README.md` — repository entry point and concise orientation only.

A concept has exactly one primary owning document. Other documents may summarize it for context but must defer to the owner when detail is required.

## Unified product definition

Vision Smart Studio is a visual AI orchestration platform that accompanies a user from an idea to a validated, deployed digital result. The user interacts naturally by text or voice with one coherent Studio. Behind that interlocutor, an orchestrator coordinates transversal domain agents, AI models, connectors and controlled execution workers.

The platform is outcome-driven: agents do not stop at isolated assistance when they are authorized and capable of conducting the work. Missions proceed through discovery, definition, explicit approval where required, planning, execution, handoffs, peer control, correction, validation, delivery and post-delivery verification.

## Non-negotiable architecture principles

- One visual control experience: projects/context left, dialogue/workspace center, execution/tasks/progress right.
- Architecture, documentation, roadmap placement and acceptance/validation criteria precede implementation.
- Agents are organized by competence domains, not by vendors.
- Agent identity is independent from model identity.
- Core workflows are independent from any single AI provider, hosting provider, repository host or deployment platform.
- External API models and internally hosted open-source models are both first-class; external-only, internal-only and hybrid operation are supported by design.
- Explicit user model choice has priority unless a mandatory security policy forbids it.
- Sensitive workloads can be restricted to internal execution/model boundaries.
- Connectors expose normalized capabilities and remain replaceable.
- REST, GraphQL, Webhooks, MCP, SDK, OAuth/OIDC, SSH and future standards are protocol mechanisms, not core domain dependencies.
- Workers may be local, cloud/VPS, CPU or GPU and execute inside controlled project/mission context.
- Security by Design, least privilege, secret references, traceability, environment isolation, backup and recovery are permanent requirements.
- Progress represents validated completion, not elapsed time or cosmetic animation.
- A detected correctable error/regression reopens work and must be corrected/retested before continuation.
- Production readiness and production validation are evidence-based states, never assumptions from code/merge presence.

## Canonical execution hierarchy

`Workspace -> Project -> Mission -> Task -> Execution -> Evidence -> Validation -> Deployment/Release`

Supporting concepts include conversations, structured requirements, decisions, approvals, agent assignments, handoffs, model invocations, connector executions, workers, environments, audit events and secret references.

## Canonical terminology

- **Orchestrator**: single coordinator responsible for decomposition, routing, collaboration, correction and integration.
- **Domain agent**: transversal specialist defined by capability rather than vendor.
- **Mission**: bounded outcome that remains open until validated delivery or genuine external blocker.
- **Task**: executable part of a mission.
- **Execution**: one attempt to perform a task.
- **Handoff**: structured transfer of objective, context, decisions, artifacts, evidence and risks.
- **Model Gateway**: provider-neutral boundary for model catalog, selection, routing and invocation.
- **Connector**: replaceable adapter exposing normalized external capabilities.
- **Worker**: controlled compute environment used for execution.
- **Evidence**: traceable proof supporting a validation result.
- **Validation gate**: mandatory control that can accept or reopen work.
- **External blocker**: missing authority, credential, approval, unavailable external dependency or user-owned decision that genuinely prevents safe continuation.

## Dependency direction

Experience/UI -> application/domain services -> orchestration and domain contracts -> model/connector/execution abstractions -> provider/vendor/runtime adapters.

Vendor adapters may depend on core contracts. Core contracts must not depend on vendor adapters. UI must not own provider orchestration. Raw secrets must not enter source, project documents or browser persistence.

## Frozen baseline completeness check

The consolidation pass confirms the baseline explicitly covers:

- product purpose and user experience;
- project persistence and resumability;
- discovery before autonomous implementation;
- user validation/approval gates;
- roadmap and phased delivery;
- transversal multi-agent team and orchestrator;
- structured handoffs and mutual controls;
- quality, security and documentation gates;
- model/provider independence and user control;
- external and internal/open-source AI operation;
- internal model lifecycle/resource management;
- cost/performance/confidentiality/latency/load-aware routing;
- universal replaceable connectors and protocol extensibility;
- local/cloud CPU/GPU execution;
- identities, roles, permissions and secret management;
- encryption, auditability and traceability;
- environment isolation and controlled production delivery;
- backup, restoration and incident recovery expectations;
- validated task progress and evidence semantics;
- correction/non-regression discipline;
- developer onboarding and contribution rules;
- canonical domain entities and architectural dependency direction.

No known strategic requirement supplied for this foundation remains intentionally outside the canonical baseline.

## Change control after freeze

The freeze does not prohibit evolution. It prevents undocumented drift. Any future requirement that changes architecture, governance, security, domain semantics, validation or roadmap must:

1. identify the owning canonical document(s);
2. update them before or with implementation;
3. update dependent summaries/cross-references only when needed;
4. verify no contradiction is introduced;
5. record the change in an explicit commit;
6. preserve backward/migration implications where applicable.

Ordinary implementation details that do not change canonical contracts do not require reopening the whole baseline.

## Development authorization state

The documentary foundation is **FROZEN AND READY FOR THE DEVELOPMENT TEAM**. Development must use this reference and its owning documents as the baseline. Phase closure still requires a fresh consolidation check so implementation and documentation cannot diverge over time.
