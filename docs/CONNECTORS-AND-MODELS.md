# Vision Smart Studio — Connectors and Hybrid Model Architecture

## Objective

Make integrations and AI providers replaceable implementation details rather than structural dependencies.

## Connector contract

Every connector adapter should expose normalized metadata and operations. Minimum metadata: connector id/type, display name, capabilities, authentication method, required scopes, environment binding, health, version and configuration schema.

Operations should be capability-oriented. Examples include repository.read, repository.commit, deployment.create, deployment.status, database.query, database.migrate, storage.put, compute.execute, webhook.manage and identity.oauth.

The orchestrator asks for a capability. Connector selection resolves the appropriate adapter. Vendor-specific payload conversion remains inside the adapter.

## Protocol adapters

The framework must accommodate REST, GraphQL, Webhooks, MCP, SDK-based integrations, OAuth/OIDC, SSH and future standards. Protocol is not the same as product connector: multiple connectors can share a protocol implementation.

## Secret handling

Connector definitions store references to secrets, never raw credentials in Git or project documents. Future production design must support a secret vault, rotation, scoped access, audit events and environment separation.

## Connector lifecycle

Discover/register -> configure -> authorize -> health-check -> activate -> execute -> monitor -> rotate/update -> disable -> remove.

Removal must leave auditable history while revoking active access.

## Model Gateway contract

The Model Gateway presents a provider-neutral interface. Model records should describe provider, model identifier, hosting mode (external/internal), modalities, context limits, tool capabilities, cost metadata, latency/health observations, confidentiality eligibility and resource requirements.

## Hybrid operating modes

Vision Smart Studio must support:

- External mode — tasks use approved hosted provider APIs.
- Internal mode — tasks use self-hosted/open-source models only.
- Hybrid mode — routing can choose either according to policy.

No core workflow may require one specific provider.

## Internal model manager

The internal model manager is responsible for model discovery/import, installation, artifact verification, runtime configuration, activation/deactivation, upgrades, rollback, deletion, GPU/CPU/RAM/VRAM/storage telemetry, health checks and maintenance state.

Model binaries and large artifacts should live in appropriate model/object storage, not the application Git repository.

## Routing policy

Routing inputs include task capability requirements, user-selected model/provider, confidentiality classification, cost budget, latency target, model health, context size, server capacity/load, data residency and fallback policy.

Explicit user selection wins unless it violates a mandatory security/policy constraint. Sensitive missions can declare `internal_only`, preventing external API transmission.

## Fallback

Fallback must be explicit and auditable. The system should not silently send confidential content to a different external provider because the preferred model failed. Policies define whether fallback is allowed, to which trust class, and whether user confirmation is required.

## Usage governance

Record enough telemetry to explain model selection and manage cost without unnecessarily retaining sensitive prompt content. Desired metrics include request count, token/compute usage where available, latency, failures, model health and estimated/actual cost.

## Separation of concerns

UI selects preferences and displays state. Orchestrator defines task requirements. Model Gateway resolves models. Provider adapters translate requests. Internal runtime manager operates self-hosted inference infrastructure. Connector framework handles non-model external systems. These responsibilities must not collapse into one vendor-specific service.