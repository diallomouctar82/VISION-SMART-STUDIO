# Vision Smart Studio — Canonical Domain Model

## Purpose

Define the durable concepts developers should preserve as persistence evolves beyond the Phase 1 browser prototype.

## Identity and tenancy

`User` represents a human identity. `Workspace` is an organizational boundary. Future membership and role entities connect users to workspaces and enforce permissions.

## Project knowledge

`Project` is the durable container for an initiative. It references environments, repository bindings, conversations, requirements, architecture documents, decisions, model policies, connector bindings and missions.

`ProjectDocument` represents versioned canonical project knowledge. `Decision` records consequential choices with rationale and status.

## Delivery hierarchy

`Mission` is a bounded requested outcome within a project. It owns scope, state, acceptance criteria, dependencies and validation state.

`Task` is an executable unit assigned to an agent domain. Tasks may depend on other tasks and have weighted validated progress.

`Execution` represents an attempt to perform a task on a worker or external capability. Multiple executions can exist for retries/corrections.

`ProgressEvent` is an append-style event used to explain changes in task/mission progress.

`Evidence` references proof such as test results, commits, deployment identifiers, screenshots/artifacts, API checks or security validation.

`ValidationCriterion` defines what must be true. `ValidationResult` records evaluation, evidence and validator identity/domain.

## Agents and orchestration

`AgentDomain` describes a transversal capability domain. `AgentAssignment` binds a task to an agent domain and selected model/runtime context. `Handoff` records structured transfer of work/context between assignments.

## Models

`AIProvider` describes a provider or internal runtime source. `AIModel` describes an available model and capabilities. `ModelRoutingPolicy` belongs at workspace/project/mission scope and can constrain cost, confidentiality, latency and hosting mode. `ModelInvocation` records auditable execution metadata without requiring storage of sensitive content.

## Connectors

`ConnectorDefinition` describes a connector type/capabilities. `ConnectorBinding` binds configuration and secret references to a workspace/project/environment. `ConnectorExecution` records consequential operations and outcomes.

## Execution infrastructure

`Worker` represents local/cloud/CPU/GPU execution capacity. `WorkerCapability` describes runtime features. `WorkerLease` associates a mission/task execution with isolated worker capacity. `Artifact` represents generated files/build outputs stored outside Git when appropriate.

## Environments and releases

`ProjectEnvironment` represents development, staging, production or custom environments. `Deployment` records a delivery attempt. `Release` groups validated changes promoted to an environment. `RollbackPlan` records recovery instructions/references.

## Security and audit

`SecretReference` identifies a secret stored in an external vault. `AuditEvent` records consequential actions with actor, agent/model when relevant, target, environment, timestamp, result and correlation identifiers. `AuthorizationDecision` can record sensitive permission checks.

## Conversation/discovery

`Conversation` belongs to project context. `Message` represents user/agent exchanges. `Requirement` captures structured product needs independently from raw conversation. `Approval` records explicit user gates such as approval of project definition before autonomous implementation.

## Important invariants

- Project state must be resumable without raw chat history.
- Raw secrets never belong in domain records.
- A Task marked done must satisfy applicable validation semantics.
- Mission progress is derived from validated task progress.
- Executions are attempts; failure does not erase prior attempts.
- Evidence and audit references should remain traceable after connector/model changes.
- Production deployments belong to an explicit environment and validation context.
- Provider-specific identifiers may exist in adapter metadata but must not become primary domain semantics.

## Phase 1 mapping

Current `StudioProject`, `StudioMission` and `StudioTask` are lightweight browser-side representations of Project, Mission and Task. They intentionally omit server identities, users, executions, evidence, connectors and audit records. Future persistence work should migrate these concepts behind repositories/services while maintaining backward migration for development state when practical.