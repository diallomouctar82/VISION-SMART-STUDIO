# Vision Smart Studio — Validation Framework

## Purpose

Validation is a release control mechanism, not a reporting exercise. A mission is complete only when its defined outcome works and the evidence is sufficient to verify it.

## Mission definition of done

A mission may be marked complete only when all applicable conditions are satisfied:

- requested behavior and expected outcome are implemented;
- architecture remains conformant or approved architecture updates are committed;
- build succeeds;
- static checks succeed;
- relevant automated tests pass;
- functional behavior is verified;
- existing behavior in the affected area remains operational;
- integrations and migrations are verified where applicable;
- security impact and permissions are checked;
- documentation affected by the change is updated;
- agent handoffs and important decisions are traceable where applicable;
- changes are committed with explicit messages;
- deployment is verified when production is in scope;
- evidence is attached or referenced;
- repository-wide consolidation for the completed phase finds no known requirement gap or contradictory canonical definition.

## Mandatory quality, security and documentation gates

No deliverable is complete until all applicable gates pass:

### Quality gate

- expected behavior works;
- automated and functional checks pass;
- regression risk has been tested;
- failures are corrected rather than merely reported.

### Security gate

- least privilege is preserved;
- secrets are not exposed or committed;
- sensitive data handling matches policy;
- environment boundaries remain intact;
- security-relevant actions are traceable.

### Documentation gate

- architecture and behavior changes are reflected in canonical repository documentation;
- a new developer can understand the delivered scope without guessing undocumented assumptions;
- duplicate or obsolete project definitions are removed or harmonized.

## Agent collaboration validation

For collaborative missions, completion also requires:

- task ownership is explicit;
- shared context and handoffs preserve necessary constraints and decisions;
- relevant work receives cross-check or peer validation;
- detected deviations are returned for correction;
- the orchestrator verifies the final integrated outcome rather than independently accepting isolated agent outputs.

## Progress semantics

Progress percentage represents completed validated work, not elapsed time.

Recommended calculation for a mission:

- each task has a weight;
- a task contributes 0% until started;
- in-progress contribution derives from completed subtasks or verified execution events;
- failed gates reduce or reopen the affected progress state;
- 100% is impossible until all mandatory validation gates pass.

## Mandatory failure behavior

When a test or validation fails:

1. keep the mission open;
2. identify the root cause;
3. correct it when within execution authority;
4. re-run the failed validation;
5. run applicable regression checks;
6. update documentation if the resolution changes architecture or behavior;
7. continue only after the current issue is resolved.

## Consolidation gate

Before closing a roadmap phase:

1. review the repository against `docs/REFERENCE.md`;
2. confirm all approved strategic requirements are represented;
3. identify missing points, duplicated definitions, contradictions and obsolete statements;
4. harmonize terminology, module boundaries, roadmap scope and validation rules;
5. align implementation structure with the architecture for the completed scope;
6. commit all consolidation corrections;
7. record the phase verdict only after this gate passes.

A known documentation inconsistency, forgotten requirement or unresolved duplication blocks phase closure.

## Production gate

A production verdict must be one of:

- `PRODUCTION_VALIDATED` — deployment and required post-deployment checks are verified.
- `READY_FOR_PRODUCTION` — implementation is validated but deployment has not yet occurred.
- `BLOCKED_EXTERNAL_ACTION` — only an explicit external/user-controlled action remains.
- `NOT_READY` — unresolved implementation, test, regression, security, documentation, migration, integration, deployment or consolidation problem remains.

`PRODUCTION_VALIDATED` must never be used solely because code was merged.

## Evidence examples

Depending on the mission:

- commit SHA;
- pull request reference;
- CI run/check result;
- automated or functional test output;
- build result;
- migration result;
- API response;
- UI behavior evidence;
- security validation evidence;
- documentation/consolidation diff;
- agent handoff or validation record;
- deployment identifier;
- production health check;
- regression test result.

## Phase gates

Each roadmap phase must define exit criteria before implementation. A phase is closed only after all exit criteria, mandatory gates and consolidation requirements are verified and the committed project documentation reflects the resulting state.

## Complete local project-setup gate

The reopened Phase 1 project flow cannot close until evidence covers:

- guided creation with all required project, mission and activity fields;
- invalid, duplicate, oversized and credential-bearing URL input rejection;
- double-submit protection and atomic failure without a partial project;
- project setting updates plus creation of additional missions and activities;
- blocker declaration/resolution and preservation of mandatory task gates;
- v1/v2/v3 -> v4 migration, recovery backup, corruption refusal and revision conflict behavior;
- refresh/resume of the created configuration;
- keyboard-accessible validation, mobile/tablet/desktop layouts and inert rendering of untrusted text;
- typecheck, lint, automated tests, production-dependency audit and static production build;
- current Netlify deploy identifier, live URL smoke check, security headers and real screenshots.
