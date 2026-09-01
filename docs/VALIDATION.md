# Vision Smart Studio — Validation Framework

## Purpose

Validation is a release control mechanism, not a reporting exercise. A mission is complete only when its defined outcome works and the evidence is sufficient to verify it.

## Mission definition of done

A mission may be marked complete only when all applicable conditions are satisfied:

- requested behavior is implemented;
- build succeeds;
- static checks succeed;
- relevant automated tests pass;
- functional behavior is verified;
- existing behavior in the affected area remains operational;
- migrations/configuration changes are verified where applicable;
- security impact is checked where applicable;
- documentation affected by the change is updated;
- changes are committed with an explicit message;
- deployment is verified when production is in scope;
- evidence is attached or referenced.

## Progress semantics

Progress percentage represents completed validated work, not elapsed time.

Recommended calculation for a mission:

- each task has a weight;
- a task contributes 0% until started;
- in-progress contribution may be estimated only from completed subtasks;
- 100% is impossible until validation criteria pass.

## Mandatory failure behavior

When a test or validation fails:

1. keep the mission open;
2. identify the root cause;
3. correct it when within execution authority;
4. re-run the failed validation;
5. run applicable regression checks;
6. continue only after the current issue is resolved.

## Production gate

A production verdict must be one of:

- `PRODUCTION_VALIDATED` — deployment and required post-deployment checks are verified.
- `READY_FOR_PRODUCTION` — implementation is validated but deployment has not yet occurred.
- `BLOCKED_EXTERNAL_ACTION` — only an explicit external/user-controlled action remains.
- `NOT_READY` — unresolved implementation, test, regression, security, migration, or deployment problem remains.

`PRODUCTION_VALIDATED` must never be used solely because code was merged.

## Evidence examples

Depending on the mission:

- commit SHA;
- pull request reference;
- CI run/check result;
- test output;
- build result;
- migration result;
- API response;
- functional UI test evidence;
- deployment identifier;
- production health check;
- regression test result.

## Phase gates

Each roadmap phase must define exit criteria before implementation. A phase is closed only after all exit criteria are verified and committed project documentation reflects the resulting state.