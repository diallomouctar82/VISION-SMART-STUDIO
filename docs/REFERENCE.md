# Vision Smart Studio — Canonical Reference Map

This file is the navigation and consolidation index for the project. GitHub is authoritative.

## Canonical document ownership

- `docs/CONSTITUTION.md` — permanent governance, result-first execution, outcome ownership, agent obligations and phase consolidation rule.
- `docs/ARCHITECTURE.md` — canonical system architecture, planes, module boundaries and dependency direction.
- `docs/DEVELOPER-GUIDE.md` — practical developer mental model, implementation workflow and takeover guidance.
- `docs/AGENTS.md` — agent topology, mission lifecycle, assignments, handoffs, peer control and correction loops.
- `docs/DATA-MODEL.md` — durable domain concepts, relationships and invariants.
- `docs/CONNECTORS-AND-MODELS.md` — universal connector contracts, protocols, hybrid model gateway and routing rules.
- `docs/ROADMAP.md` — phased delivery sequence and exit criteria.
- `docs/VALIDATION.md` — definition of done, evidence rules, validation gates and production verdicts.
- `SECURITY.md` — Security by Design baseline, secret and authorization principles.
- `CONTRIBUTING.md` — implementation, validation and commit conventions.
- `README.md` — repository entry point and quick orientation.

Details belong in the most specific owning document. Other documents may summarize or reference them but must not introduce conflicting variants.

## Canonical product principles

- one visual control interface centered on projects, dialogue and execution progress;
- natural text and voice interaction from idea discovery through delivery;
- architecture, documentation, roadmap and validation criteria before implementation;
- outcome ownership rather than isolated task assistance;
- domain-based transversal agents coordinated as one team by a single orchestrator;
- structured mission decomposition, assignment, shared context, handoffs, peer control and correction loops;
- mandatory quality, security and documentation validation before completion;
- manual or intelligent model choice with final user control;
- provider-neutral hybrid AI supporting external APIs and internally hosted open-source models;
- internal model lifecycle and resource management;
- dynamic routing based on capability, cost, performance, confidentiality, latency, health and server load;
- universal replaceable connectors across APIs, protocols and infrastructure;
- local/cloud/VPS CPU and GPU execution workers;
- Security by Design, least privilege, secure secrets, encryption, audit trails, isolation, backup and recovery;
- progress based on validated work rather than elapsed time;
- errors and regressions corrected before continuation when within execution authority;
- GitHub as the complete project source of truth.

## Canonical terminology

- **Orchestrator** — single user-facing coordinator responsible for mission decomposition, routing, collaboration, validation and final integration.
- **Domain agent** — transversal expert defined by competence, not vendor/platform.
- **Mission** — outcome-oriented unit continuing until validated delivery or genuine external blocker.
- **Task** — executable mission unit with explicit state, ownership and validation implications.
- **Execution** — one attempt to perform a task through a worker or connector capability.
- **Handoff** — structured transfer of objective, context, constraints, decisions, artifacts, evidence and unresolved risks.
- **Connector** — replaceable adapter to an external system/capability.
- **Model Gateway** — provider-neutral model selection and invocation boundary.
- **Worker** — controlled execution environment, local/remote and CPU/GPU.
- **Evidence** — traceable proof supporting validation.
- **Validation gate** — mandatory evidence-based control capable of reopening work.
- **Consolidation** — repository-wide harmonization required before phase closure.

## Dependency direction

Experience/UI -> application/domain services -> orchestration/model/connector/execution abstractions -> vendor/runtime adapters.

Core domain semantics must not depend on a vendor adapter. Secrets must not flow into project documents or browser persistence. Production actions must flow through authorization and validation controls.

## Consolidation checklist

Before closing any roadmap phase:

1. verify every approved strategic instruction is represented in canonical documentation and implementation where applicable;
2. identify contradictions, obsolete statements, duplicated definitions and missing cross-references;
3. merge/remove duplicates without losing requirements;
4. align terminology, entities and module boundaries;
5. verify constitution, architecture, developer guide, agent model, data model, connector/model rules, roadmap, validation, security and contribution rules are mutually consistent;
6. verify implementation structure matches the documented architecture for completed scope;
7. verify status statements match repository implementation and actual validation evidence;
8. verify a new developer can locate the owner document for every major concept without guessing;
9. commit consolidation changes before phase closure.

No phase may close with known documentation divergence, unresolved requirement gaps, conflicting definitions or obsolete canonical statements.