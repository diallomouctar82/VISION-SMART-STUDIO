# Vision Smart Studio Security Baseline

Security is a permanent architectural and delivery requirement. This file defines the repository-level baseline and does not replace the security rules in `docs/CONSTITUTION.md`, architecture boundaries in `docs/ARCHITECTURE.md`, or release gates in `docs/VALIDATION.md`.

## Core rules

- Never commit secrets, API keys, tokens, passwords, private keys or sensitive environment values.
- Use least-privilege permissions for users, agents, connectors, models and execution workers.
- Separate development, test/staging and production environments.
- Treat connector actions, deployment actions, model routing decisions for sensitive workloads and privileged agent operations as auditable events.
- Encrypt sensitive data in transit and at rest where applicable.
- Isolate projects, tenants, execution workspaces and credentials.
- Design backups, restore verification and disaster recovery before production dependence exists.
- Sensitive or confidential workloads must be routable to approved internal models and infrastructure only when policy requires it.
- Security failures block completion and production verdicts until corrected and revalidated.

## Secret handling architecture

Secrets must be referenced by identifier and environment scope, not stored in project documents or source code. Future secret-management implementations must support controlled retrieval, rotation, revocation, auditability and minimal exposure to agents/workers.

## Identity and authorization

The target platform must support users, organizations/workspaces, roles, permissions and policy enforcement. Authorization must be checked at the service/action boundary, not only hidden in the UI.

## Connectors and execution workers

Each connector and worker must declare its capabilities and required permissions. Actions should be deny-by-default outside the authorized project/environment scope. High-impact production operations require explicit policy gates and traceable evidence.

## Reporting vulnerabilities

Until a dedicated private security-reporting channel is configured, do not publish sensitive vulnerability details in public issues. Security reporting procedures must be established before external production release.