# Vision Smart Studio Constitution

## 1. Authority

This constitution governs Vision Smart Studio. All project instructions, workflows, agents, documentation, code changes, validations, and deployment decisions must align with it.

## 2. Official source

GitHub is the official source of truth. Project knowledge that affects implementation or governance must be committed to this repository. Conversation is not an authoritative storage location.

## 3. Result-first execution rule

Every detected bug, error, inconsistency, regression, failing test, or implementation gap must be corrected before continuing when the correction is within the agent's control. An anomaly must not be merely reported when it can be resolved directly.

The execution cycle is mandatory:

1. Detect.
2. Correct.
3. Re-test.
4. Verify non-regression.
5. Continue only when the current scope is clean.

The user is contacted only when an action, secret, permission, approval, or external dependency is genuinely required from them.

## 4. No useless reporting

Reports exist to document completed actions, evidence, remaining external blockers, and decisions. Reporting must never replace execution.

## 5. Architecture before implementation

No feature starts without:

- documented scope;
- architecture and affected modules;
- data and integration impacts;
- roadmap placement;
- acceptance criteria;
- non-regression expectations;
- security considerations where applicable.

## 6. Bounded missions

Work is executed as small, explicit missions. One mission is completed, tested, corrected, validated, and committed before the next mission begins unless the architecture explicitly requires coordinated parallel work.

## 7. Production rule

A feature cannot be declared production-ready based only on code presence or a written assertion. Production readiness requires verifiable evidence appropriate to the feature: successful build, automated tests, functional tests, integration checks, migration checks, security checks when relevant, deployment confirmation, and non-regression verification.

## 8. Progressive commits

Changes must be committed progressively with explicit messages describing the real action performed. Large undifferentiated commits should be avoided.

## 9. User experience priority

The platform must remain understandable to a non-terminal-centric user. Technical power should be available without forcing the user into low-level tooling for ordinary operations.

## 10. Model independence

Vision Smart Studio must not depend on a single AI provider or model. Provider adapters and model routing must allow manual selection and intelligent orchestration.

## 11. Security

Secrets must never be committed to the repository. Connectors must use environment-based secret management, minimum required permissions, auditable actions, and clear separation between development, staging, and production.

## 12. Change discipline

No unrelated code or configuration may be modified during a bounded mission unless required to fix a directly encountered dependency. Any such dependency change must be documented in the commit and validated for regression.