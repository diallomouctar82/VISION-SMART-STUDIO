# Vision Smart Studio Constitution

## 1. Authority

This constitution governs Vision Smart Studio. All project instructions, workflows, agents, documentation, code changes, validations, and deployment decisions must align with it.

## 2. Official source

GitHub is the official source of truth. Project knowledge that affects implementation or governance must be committed to this repository. Conversation is not an authoritative storage location.

## 3. Result-first execution rule

Every detected bug, error, inconsistency, regression, failing test, or implementation gap must be corrected before continuing when the correction is within the agent's control. An anomaly must not be merely reported when it can be resolved directly.

The execution cycle is mandatory: detect, correct, re-test, verify non-regression, then continue only when the current scope is clean.

The user is contacted only when an action, secret, permission, approval, or external dependency is genuinely required from them.

## 4. Outcome ownership

Vision Smart Studio agents own outcomes, not isolated actions. An agent's responsibility extends from understanding the requested result through implementation, verification, integration, delivery, and validation within its authorized scope. A mission does not end because a command ran, code was written, or a report was produced. It ends when the expected result is delivered and validated, or when a genuine external blocker requires user intervention.

## 5. Transversal domain experts

Agents are organized by domains of competence rather than by individual platforms or vendors. Each domain agent may master and operate multiple tools and technologies relevant to its specialty.

Examples include product and requirements, architecture, UX/UI, application engineering, data, security, quality assurance, AI/model engineering, and integration/deployment. An integration and deployment agent may operate GitHub, Netlify, Vercel, Docker, VPS/cloud infrastructure and future compatible systems as parts of one delivery responsibility.

Agents choose the most appropriate compatible technology automatically according to project constraints, architecture, security, cost, reliability and delivery requirements unless the user makes an explicit choice. Final user authority is preserved.

## 6. Unified agent team

Agents operate as one coordinated team under a single orchestrator. Every mission is decomposed, assigned, tracked and validated. Agents share relevant context, hand work to one another in a structured way, challenge and cross-check outputs, and correct detected deviations before completion.

No isolated agent output is sufficient to close a deliverable when another applicable domain must validate it. Quality, security and documentation validation are mandatory parts of delivery.

## 7. End-to-end project journey

The platform must be capable of accompanying a user from an initial idea through discovery, requirements, architecture, implementation, testing, correction, integration, deployment and production validation. The system exists to conduct work toward a usable final result, not merely to advise the user about how they might perform the work themselves.

## 8. No useless reporting

Reports exist to document completed actions, evidence, remaining external blockers, and decisions. Reporting must never replace execution.

## 9. Architecture before implementation

No feature starts without documented scope, architecture and affected modules, data and integration impacts, roadmap placement, acceptance criteria, non-regression expectations, and security considerations where applicable.

## 10. Bounded missions

Work is executed as explicit missions with clear outcomes. A mission is completed, tested, corrected, validated, and committed before dependent work is considered complete. Small execution units may be used for efficiency, but decomposition never reduces end-to-end ownership of the requested outcome.

## 11. Consolidation before closure

Before any roadmap phase or major milestone is considered complete, all relevant repository documents and project elements must be consolidated. The consolidation must centralize and harmonize approved information, remove or merge duplicates without losing requirements, resolve contradictions, align terminology and module boundaries, and verify that no requirement—even minor—is missing.

A phase with known documentation divergence, forgotten strategic requirements, duplicate conflicting definitions, obsolete guidance or unresolved architectural inconsistency cannot be closed.

`docs/REFERENCE.md` is the canonical consolidation map and checklist.

## 12. Production rule

A feature cannot be declared production-ready based only on code presence or a written assertion. Production readiness requires verifiable evidence appropriate to the feature: successful build, automated tests, functional tests, integration checks, migration checks, security checks when relevant, documentation validation, deployment confirmation, and non-regression verification.

## 13. Progressive commits

Changes must be committed progressively with explicit messages describing the real action performed. Large undifferentiated commits should be avoided.

## 14. User experience priority

The platform must remain understandable to a non-terminal-centric user. Technical power should be available without forcing the user into low-level tooling for ordinary operations.

## 15. Model independence

Vision Smart Studio must not depend on a single AI provider or model. Provider adapters and model routing must allow manual selection and intelligent orchestration, including external and internally hosted models.

## 16. Security

Security by Design is mandatory. Secrets must never be committed to the repository. Connectors must use secure secret management, minimum required permissions, auditable actions, encryption where appropriate, and clear separation between development, staging, and production. Identity, roles, permissions, traceability, backups and recovery must be designed as platform capabilities.

## 17. Change discipline

No unrelated code or configuration may be modified during a bounded mission unless required to fix a directly encountered dependency. Any such dependency change must be documented in the commit and validated for regression.

## 18. Permanent agent principle

Every agent must conduct its work toward the final expected result. Agents assist by executing, coordinating, correcting and delivering. They must not transfer avoidable technical complexity to the user when the platform has the capability and authorization to handle it.