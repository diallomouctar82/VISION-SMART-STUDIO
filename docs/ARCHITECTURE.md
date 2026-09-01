# Vision Smart Studio — Initial Architecture

## Architectural goal

Provide one visual workspace that lets a user define an idea, refine it with AI, select or route models, execute bounded development missions, observe task progress, connect infrastructure, and move validated work toward production.

## Top-level system

### 1. Workspace UI

Three persistent zones:

- Left: projects, folders, files, environments, project history.
- Center: text/voice dialogue, project discovery, previews, code/diff view, execution results.
- Right: task tree, mission status, dependencies, percentage progress, validation gates.

### 2. Project Service

Owns project identity and persistent project state:

- project metadata;
- architecture documents;
- roadmap;
- environments;
- repository bindings;
- model preferences;
- connector configuration references;
- decisions and mission history.

### 3. Conversation & Discovery Service

Transforms an initial idea into executable project definition:

- text and voice input;
- clarification questions;
- missing-information detection;
- structured requirements;
- architecture proposal;
- acceptance criteria;
- user validation before implementation begins.

### 4. Orchestrator

Single user-facing agent coordinating specialized capabilities:

- product/requirements;
- architecture;
- frontend;
- backend;
- database;
- UX/UI;
- QA/non-regression;
- security;
- DevOps/deployment;
- documentation.

The orchestrator must support manual model choice and policy-based intelligent routing.

### 5. Model Gateway

Provider-neutral interface with adapters for supported providers. Responsibilities:

- model catalog;
- provider authentication references;
- capability metadata;
- cost/latency/context policies;
- manual model switching;
- automatic task-to-model routing;
- fallback policy;
- usage telemetry.

No provider secret may be stored in source code.

### 6. Mission & Task Engine

A mission is the unit of execution. Each mission contains:

- scope;
- ordered tasks/subtasks;
- status;
- dependency graph;
- progress percentage;
- validation criteria;
- execution logs/events;
- evidence;
- commit/deployment references.

The engine must emit progress events so the right-side task panel can update during execution.

### 7. Execution Plane

Remote workers execute code and infrastructure operations away from the user's local machine when configured.

Initial abstraction:

- local worker;
- cloud/VPS worker;
- isolated workspace per project/mission;
- Git checkout;
- command execution;
- build/test process;
- artifact/result collection;
- controlled deployment actions.

The UI must hide terminal complexity for normal flows while retaining an advanced console when necessary.

### 8. Connector Framework

Connector adapters expose normalized actions for external systems, initially targeting:

- GitHub;
- Supabase;
- Netlify;
- Docker;
- Nginx;
- generic VPS/cloud via controlled execution;
- databases and storage;
- CI/CD providers.

Connectors must declare capabilities, permissions, health state, and environment scope.

### 9. Validation & Release Engine

Controls movement between implementation and production:

- acceptance criteria;
- build/test gates;
- integration checks;
- migration checks;
- non-regression checks;
- security gates when relevant;
- deployment evidence;
- final release decision.

## Initial domain entities

- User
- Workspace
- Project
- ProjectEnvironment
- ProjectDocument
- Connector
- ConnectorBinding
- AIProvider
- AIModel
- ModelRoutingPolicy
- Conversation
- Message
- Mission
- Task
- TaskDependency
- Execution
- ProgressEvent
- ValidationCriterion
- ValidationResult
- Evidence
- RepositoryBinding
- Deployment
- Decision

## Initial technical direction

The implementation stack is not considered permanently fixed until Phase 1 validates it. The first implementation should favor a TypeScript web stack with clear server/client separation, a relational persistence layer, asynchronous execution workers, and event-driven task progress.

## Non-negotiable boundaries

- UI must not contain provider-specific orchestration logic.
- Provider/model logic must go through the Model Gateway.
- Connector secrets must not enter project documents or Git history.
- Mission execution must be auditable.
- Production deployments must pass the validation engine.
- Project state must be resumable without depending on chat history alone.