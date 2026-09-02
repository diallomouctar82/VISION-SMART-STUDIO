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

### 4. Orchestrator and Agent Team

The user interacts with one orchestrator that coordinates a transversal team of domain experts. Agents are organized by competence rather than vendor or platform.

Core domains include:

- product/requirements;
- architecture;
- UX/UI;
- frontend and application engineering;
- backend and data;
- AI/model engineering;
- QA/non-regression;
- security;
- integration/DevOps/deployment;
- documentation and knowledge continuity.

The orchestrator is responsible for the full mission lifecycle:

1. understand the expected outcome;
2. decompose the mission into explicit stages and tasks;
3. select the required domain agents and models;
4. assign work and dependencies;
5. maintain shared mission context;
6. track progress and evidence;
7. coordinate handoffs between agents;
8. trigger peer review and cross-checks;
9. require correction of detected deviations;
10. enforce quality, security and documentation gates;
11. validate integration and deployment evidence;
12. close the mission only when the expected outcome is delivered and validated or a genuine external blocker exists.

Agents collaborate through structured handoffs rather than isolated conversations. Every handoff must preserve the relevant objective, decisions, constraints, artifacts, evidence and unresolved risks. Receiving agents must be able to challenge previous work and request or perform corrections when necessary.

Mutual control is part of normal execution. Development output is reviewed by QA and relevant architectural/security roles. Deployment work is checked against validated artifacts and environment rules. Documentation is updated as part of delivery rather than afterthought work.

No deliverable is considered complete until the applicable quality, security and documentation validations pass.

The orchestrator must support manual model choice and policy-based intelligent routing while preserving final user authority.

### 5. Model Gateway

Provider-neutral interface with adapters for supported providers and internal models. Responsibilities:

- model catalog;
- external and internal model registration;
- provider authentication references;
- capability metadata;
- cost/latency/context/confidentiality policies;
- manual model switching;
- automatic task-to-model routing;
- fallback policy;
- health and resource telemetry;
- usage telemetry.

Vision Smart Studio must support external-only, internal/open-source-only, and hybrid execution modes. Sensitive tasks must be routable exclusively to approved internal models when policy requires it.

No provider secret may be stored in source code.

### 6. Mission & Task Engine

A mission is the outcome-oriented unit of execution. Each mission contains:

- expected outcome and scope;
- ordered stages, tasks and subtasks;
- assigned domain agent(s);
- model selection or routing policy;
- status;
- dependency graph;
- progress percentage;
- shared context and handoff records;
- validation criteria;
- quality/security/documentation gates;
- execution logs/events;
- evidence;
- commit/deployment references.

The engine must emit progress events so the right-side task panel can update during execution. Progress must derive from actual task state and validation gates, not simulated time.

### 7. Execution Plane

Remote workers execute code and infrastructure operations away from the user's local machine when configured.

Initial abstraction:

- local worker;
- CPU cloud/VPS worker;
- GPU worker;
- isolated workspace per project/mission;
- Git checkout;
- command execution;
- build/test process;
- artifact/result collection;
- controlled deployment actions.

Workers must be replaceable and independently scalable. The UI must hide terminal complexity for normal flows while retaining an advanced console when necessary.

### 8. Connector Framework

Connector adapters expose normalized actions for external systems. The framework must allow integrations to be added, replaced, disabled or removed without global architectural impact.

Initial targets include:

- GitHub;
- Supabase;
- Netlify;
- Vercel;
- Docker;
- Nginx;
- generic VPS/cloud via controlled execution;
- databases and storage;
- CI/CD providers.

Supported integration patterns must be extensible across REST, GraphQL, Webhooks, MCP, SDKs, OAuth, SSH and future standards.

Connectors must declare capabilities, permissions, health state, environment scope and audit metadata.

### 9. Validation & Release Engine

Controls movement between implementation and production:

- acceptance criteria;
- architecture conformance;
- build/test gates;
- functional and integration checks;
- migration checks;
- non-regression checks;
- security gates;
- documentation completeness;
- deployment evidence;
- rollback readiness where relevant;
- final release decision.

A failed gate reopens the relevant task and routes it back for correction. A report never substitutes for a passing gate.

### 10. Security & Governance Plane

Security by Design is transversal to every module. The platform architecture must support:

- identities, organizations, roles and permissions;
- least-privilege connector access;
- secure secret storage and rotation;
- encryption where appropriate;
- immutable/auditable action trails;
- environment isolation;
- project and tenant isolation;
- backup and recovery;
- security policy enforcement for agents, models and workers;
- traceability of important decisions and actions.

### 11. Administrative Control Plane

A dedicated administrator experience projects normalized state from the project, model, connector, execution and security planes without collapsing those planes into UI code. It owns no provider-specific execution logic.

Responsibilities:

- workspace/platform settings and operating mode;
- connector and environment inventory;
- hosting targets and local/cloud/VPS CPU/GPU worker inventory;
- external and internal/open-source model catalog, deployment and lifecycle views;
- routing and fallback policy configuration;
- role-aware secret-reference, health, maintenance and audit views;
- authenticated action requests routed to service/adaptor boundaries.

The browser may manage non-secret configuration through Supabase Auth/RLS. Privileged connector actions, SSH/remote commands, vault access and runtime/model lifecycle operations execute only in trusted backend workers or functions. `docs/ADMIN-CONTROL-PLANE.md` owns the detailed administrative contract.

## Initial domain entities

- User
- Workspace
- Project
- ProjectEnvironment
- ProjectDocument
- ConnectorDefinition
- ConnectorBinding
- AIProvider
- AIModel
- ModelRoutingPolicy
- AgentDomain
- AgentAssignment
- Handoff
- Conversation
- Message
- Mission
- MissionStage
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

## Phase 1 realization

Phase 1 realizes only the browser-local development slice of the target architecture, runnable locally and as a static Netlify preview:

- the experience plane is split into a project/file explorer, dialogue/preview workspace and mission/task panel;
- `StudioProject`, `StudioMission` and `StudioTask` provide the lightweight Project -> Mission -> Task hierarchy;
- application services own immutable project selection, checkpoint, gate, blocker and task-completion transitions;
- validated progress is calculated from checkpoint weights and required gates, with 100% reserved for individually completed work;
- a strict codec owns v1/v2/v3/v4 -> v5 migration and snapshot invariants;
- a repository interface isolates browser `localStorage`, recovery backups, stale-revision detection and storage failures from UI/domain code;
- Web Locks serialize mutations between tabs on the same origin before revision validation and persistence; this is not a distributed or server-side concurrency system;
- gate evidence is a bounded Phase 1 text reference, not yet the durable `Evidence` entity or validation service described by the target model.

The model, connector and worker planes remain inactive in this phase. Their controls are disabled rather than simulated. The repository's manually operated Netlify preview validates the static export and security headers only; it does not activate the product release plane or any application-driven deployment command.

### Approved complete-project-setup extension

The reopened Phase 1 project flow extends the local Project -> Mission -> Task slice without crossing a connector or server boundary:

- `StudioProject` owns a bounded expected outcome, lifecycle status, target environment and an optional non-secret HTTPS repository reference in addition to its name and description;
- the guided creation command builds one project, its first mission, its initial user-defined activities, validation checkpoints and mandatory gates atomically at the application-service boundary;
- user-facing “activities” map to canonical `Task` records rather than introducing a duplicate activity entity;
- later mission and activity creation remain explicit application-service transitions and use the same identifier, validation and persistence rules;
- project settings are editable through a service command; UI components never mutate snapshots directly;
- structured blocker declaration and resolution are both available in the UI and retain reason, required action, resume condition and timestamp;
- the strict snapshot codec advances to a new version and migrates prior v1/v2/v3 data through the repository backup/promotion flow;
- mutations remain serialized and revision-checked before browser persistence.

This extension intentionally does not treat a repository URL as an active `RepositoryBinding` or an environment label as a deployed `ProjectEnvironment`. Phase 1 project snapshots remain browser-local. The separately delivered administrative plane uses Supabase for its own authenticated relational control metadata; it does not silently migrate project state or activate connector/runtime execution.

### Approved Phase 2 local text-conversation slice

- each browser-local Project owns one Conversation with bounded ordered Messages;
- one application-service command appends the user text and a linked Studio delivery status atomically;
- the client submission identifier makes an exact replay idempotent and rejects reuse for different content;
- the Studio delivery status only confirms local storage and explicitly says no model is connected;
- the v5 codec validates pairing, roles, message kinds, limits and references, while v4 migration initializes an empty conversation through the existing backup/promotion path;
- the UI enables Send only for valid text on an active writable project, blocks re-entry while saving and preserves the draft on failure.

This slice crosses no provider or server boundary and does not simulate discovery, orchestration or a model answer. Voice and model-backed conversation remain in Phases 5 and 3 respectively.

## Administrative control-plane realization

The prioritized cross-phase administrative track realizes a secure management slice without collapsing vendor execution into the browser:

- `/admin` is the experience boundary for role-aware settings, inventory, routing, actions and audit;
- `SupabaseAdminRepository` owns typed application operations; UI components do not assemble raw PostgREST requests;
- Supabase Auth, forced RLS, explicit grants and workspace membership are the authorization/data boundary;
- desired state and action insertion use a security-invoker transactional RPC with optimistic resource versions;
- database triggers validate polymorphic action targets, action compatibility, same-workspace routing models and internal-only policies;
- ordinary authenticated clients cannot write observed health, connection checks or audit outcomes;
- the invitation Edge Function is a narrowly scoped privileged adapter that re-authorizes the administrator server-side;
- external connector/runtime adapters are still required to claim action requests and write verified results.

## Initial technical direction

Phase 1 validates a TypeScript web stack and explicit UI -> application service -> repository/codec boundaries. `ProjectSetupDialog`, `ProjectExplorer`, `ConversationWorkspace`, `ProjectPreview` and `MissionPanel` compose the experience plane; `studio-service`, `studio-codec` and `studio-repository` own validated transitions and persistence. Its project persistence is intentionally browser-local and scoped to one browser profile/origin; no relational project synchronization or multi-user project state exists yet. The administrative plane is the first approved relational slice and remains isolated behind its own contracts. Next.js exports static assets to `out/`, and `netlify.toml` owns the preview build plus HTTP security headers.

The target architecture still favors clear server/client separation, a relational durable persistence layer, asynchronous execution workers and event-driven task progress in later roadmap phases. The Phase 1 repository/service boundaries are migration seams for that evolution, not claims that those target capabilities already exist.

## Non-negotiable boundaries

- UI must not contain provider-specific orchestration logic.
- Provider/model logic must go through the Model Gateway.
- Agent specialization is domain-based, not vendor-bound.
- Agent handoffs and validations must be auditable.
- Connector secrets must not enter project documents or Git history.
- Mission execution must be auditable and outcome-oriented.
- Production deployments must pass the validation engine.
- Quality, security and documentation gates cannot be bypassed by a completion report.
- Project state must be resumable without depending on chat history alone.
