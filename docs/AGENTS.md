# Vision Smart Studio — Agent Operating Model

## Goal

Define how the AI team behaves so implementation can evolve without losing the product principle: agents conduct work to validated outcomes rather than merely suggesting isolated actions.

## Team topology

The user sees one Studio interlocutor. The orchestrator coordinates a pool of transversal domain agents. Initial logical domains are Product & Discovery, Architecture, UX/UI, Application Engineering, Data, AI & Models, Security, Quality Engineering, Integration & Deployment, and Documentation & Knowledge.

These are capability domains, not hard-coded vendor identities. A domain may later contain multiple specialist profiles.

## Standard mission lifecycle

1. Intake — capture the expected outcome and constraints.
2. Discovery — identify missing information and ask only necessary questions.
3. Definition — produce scope, architecture impact, acceptance criteria, risks and validation plan.
4. Explicit user gate — when product definition requires user approval, obtain it before implementation.
5. Planning — decompose into tasks, dependencies and agent assignments.
6. Execution — agents perform work using approved models, connectors and workers.
7. Handoff — artifacts and structured context move between agents without relying on chat memory.
8. Peer control — another suitable specialist checks material risks or outputs.
9. Correction loop — detected issues return to the responsible agent and are corrected/retested.
10. Validation — quality, security, documentation and functional criteria are evaluated.
11. Delivery — integrate/deploy when in scope and permitted.
12. Post-delivery verification — confirm the real target environment where applicable.
13. Closure — attach evidence and close only when the expected outcome is validated.

## Shared context contract

Agent handoffs should use structured project records rather than prose-only conversation. A handoff must identify project, mission, task, objective, inputs, decisions, constraints, artifacts produced, validations performed, unresolved dependencies and recommended next owner.

The receiving agent must not have to reconstruct critical state from the entire conversation history.

## Assignment rules

The orchestrator chooses agents according to capability, task risk, dependencies, environment and required validation. The user may override an assignment or model selection. High-risk operations can require additional review or explicit authorization.

## Mutual control

Agents are expected to challenge and verify relevant work, not blindly accept previous outputs. Examples:

- Architecture checks structural changes before broad implementation.
- Security reviews trust-boundary or privilege changes.
- QA verifies acceptance criteria and regressions.
- Documentation verifies canonical project knowledge reflects the delivered behavior.
- Integration & Deployment verifies target-environment delivery and health.

The checking agent should return actionable failures into the correction loop rather than ending with an observation when the system can correct the issue.

## Completion gates

A mission is not complete until all applicable gates pass:

- functional outcome;
- quality and regression;
- security;
- documentation/knowledge;
- integration/deployment;
- evidence and traceability.

A gate may be marked not applicable only with a reason recorded in mission state.

## Blockers

A blocker is legitimate only when execution cannot proceed safely because of missing external authority, credential, approval, unavailable external dependency, or a decision that belongs to the user. The blocker record must say exactly what is needed and what execution resumes afterward.

## Model usage

Agent identity and model identity are separate. The same domain agent can use different models for different tasks. Model routing is based on capability, cost, latency, confidentiality, context requirements, server load and user preference. Sensitive work can be restricted to internal models.

## Tool usage

Agents use connectors through normalized capability contracts. They should request outcomes such as repository commit, deployment, database migration or environment health check rather than embed vendor-specific assumptions in orchestration logic.

## Auditability

Every consequential agent action should eventually be traceable by mission/task, agent domain, selected model, connector/worker, environment, timestamp, result and evidence reference. This is required for trust, debugging and production governance.

## Failure semantics

Failures are first-class execution states. They are not equivalent to completion with a warning. A failed task remains open, enters correction or becomes externally blocked. Retry loops must be bounded and observable to avoid uncontrolled cost or repeated destructive actions.