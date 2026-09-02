# VISIION Smart Studio — Administration Operations Guide

## Purpose

Operate the administrative control plane defined by `ADMIN-CONTROL-PLANE.md`. This guide describes the implemented interface, deployment configuration, identity bootstrap, normal operations and failure handling. It does not redefine the canonical connector or model contracts.

## Implemented surface

The dedicated route is `/admin`. It is separate from the browser-local project workspace at `/` and uses Supabase for authenticated, workspace-scoped control metadata.

| Area | Implemented operations |
| --- | --- |
| Overview | Inventory, pending actions, degraded health, operating mode, production approval, confidential-routing and budget settings |
| Connections | Connector and vault-reference declaration, desired enable/disable state, health-check request |
| Infrastructure | Hosting/VPS declaration, CPU/GPU worker enrolment metadata, heartbeat request, maintenance/resume request |
| Models | Provider/runtime registration, open-source model catalog, hardware requirements, model/worker deployment, install/verify/activate requests |
| Routing | External/internal/hybrid policy, modalities, preferred/fallback models, confidentiality, cost, latency and VRAM constraints |
| Security | Authenticated workspace bootstrap, role membership, e-mail invitation, global policy and least-privilege controls |
| Audit | Pending/completed action requests, adapter-supplied connection checks and append-oriented audit events |

The interface deliberately distinguishes a declared or desired value from an adapter-observed value. A button can persist a validated transition and queue an action; it cannot claim remote success before a trusted adapter writes the corresponding result.

## Runtime configuration

The static Next.js build needs exactly two browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Only the modern publishable key is accepted by the client bootstrap. A service-role key, secret key, connector credential, SSH key or raw provider token must never use a `NEXT_PUBLIC_` variable or enter the repository.

Netlify must expose both variables to the build scope. `netlify.toml` permits network connections only to the exact project HTTPS and WSS origins. Adding another backend requires an explicit CSP review and test update.

## First administrator

1. Open `/admin` and create or sign in to a Supabase Auth account.
2. Confirm the e-mail address when the Auth policy requires it.
3. Create the first workspace. The authenticated creator becomes its first administrator in one database transaction.
4. Configure global operating/security settings.
5. Invite additional users by e-mail and assign the minimum required role.

Workspace creation is limited and protected by RLS, invoker permissions and a last-administrator invariant. The UI is not the authorization boundary.

## Recommended enrolment order

1. Create a reference to a credential already stored in an approved vault; never paste the credential itself.
2. Declare the connector and its least-privilege scopes.
3. Declare its hosting target when applicable.
4. Enrol a CPU/GPU worker and declare capacity separately from observed usage.
5. Register a provider/runtime and the model catalog.
6. Bind an internal model to a compatible worker.
7. Define routing policies; internal-only confidentiality rejects external models and fallback.
8. Request health/verification actions and inspect the audit view for adapter evidence.

## Action lifecycle

Consequential controls use the following path:

1. the browser sends an authenticated request with the current resource version;
2. a security-invoker database function changes desired state and inserts the action request atomically;
3. target existence, workspace ownership and allowed action/target combinations are verified;
4. a trusted connector or runtime adapter claims and executes the request;
5. the adapter records a bounded result, connection check and observed health;
6. the audit view exposes the correlation trail.

Until step 4 has a reachable target, vault credential and compatible adapter, the action remains pending or is explicitly blocked. This is an external execution prerequisite, not a successful deployment.

## Roles

- `admin`: settings, inventory, operations, invitations and audit.
- `operator`: inventory and allowed operational/configuration requests, without access management.
- `auditor`: read-only inventory and audit.
- `viewer`: read-only inventory without the audit journal.

Supabase RLS and grants enforce the roles. The dashboard also hides or disables inapplicable controls for clarity.

## Database and Edge Function

The control plane is defined by versioned SQL under `supabase/migrations/`. It contains fourteen public tables with forced RLS, explicit grants, tenant-safe foreign keys, concurrency versions, append-oriented audit rules, action integrity triggers and routing-policy integrity triggers.

`supabase/functions/admin-invite-member` is the only privileged member-management adapter in this delivery. It requires a valid JWT, re-checks the administrator membership with a service-side client, restricts CORS to approved origins and never returns credential material.

After every schema change:

```bash
npm run validate
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
```

Then apply the new migration through the authorized Supabase deployment path, regenerate `lib/supabase-database.types.ts`, run both Supabase advisors and verify the deployed function configuration.

## Failure handling

| Symptom | Meaning | Operator action |
| --- | --- | --- |
| Configuration required | Public URL/key missing or invalid | Correct the Netlify build variables and redeploy |
| Unauthorized/forbidden | Session absent or role insufficient | Sign in again or ask an administrator for the minimum role |
| Conflict | Resource version changed in another session | Refresh, review the new state and retry intentionally |
| Unknown/unverified health | No trusted observation exists yet | Enrol the compatible adapter, then request a health check |
| Pending action | Request is durable but unclaimed | Check adapter availability and the audit correlation id |
| Blocked/failed action | Adapter rejected or could not execute | Inspect the bounded result code, correct the prerequisite, retry with a new request |

Never repair a failed action by directly changing observed health from the browser. Ordinary authenticated users have no database grant for those fields.

## Recovery and rollback

- Application rollback: redeploy the previous verified Git/Netlify artifact.
- Schema rollback: use a new forward migration that preserves evidence; do not rewrite applied migration history.
- Member recovery: another administrator can restore a role; the last administrator cannot be removed or demoted.
- Compromised credential: rotate it in the owning vault, update only the reference/status metadata, then reauthorize and verify the connector.
- Adapter incident: disable the desired resource, stop the trusted adapter, retain action/audit evidence and resume only after validation.

## External execution prerequisites

This control-plane delivery is operational for identity, settings, inventories, policies, invitations, durable actions and audit. Actual provisioning of an arbitrary VPS, SSH execution, model binary installation or provider call remains owned by the adapter phases. Each such capability requires a dedicated allowlisted adapter, vault integration, replay/SSRF/command controls, reachable target and environment approval. A generic browser-supplied endpoint is never sufficient authority to execute a remote command.

