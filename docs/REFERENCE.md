# Vision Smart Studio — Canonical Reference Map

This file is the navigation and consolidation index for the project. GitHub is the authoritative source.

## Governance hierarchy

1. `docs/CONSTITUTION.md` — permanent rules, authority, result-first execution, agent responsibilities, consolidation, security and delivery discipline.
2. `docs/ARCHITECTURE.md` — canonical system architecture, modules, boundaries, orchestration model, execution plane, model gateway, connectors, validation and security planes.
3. `docs/ROADMAP.md` — phased delivery sequence and exit criteria.
4. `docs/VALIDATION.md` — definition of done, evidence rules, validation gates and production verdicts.
5. `SECURITY.md` — repository-level Security by Design baseline and secret/authorization principles.
6. `CONTRIBUTING.md` — implementation, validation and commit conventions.
7. `README.md` — project entry point and operational orientation.

When information appears in more than one document, these documents must remain semantically aligned. Details belong in the most specific document and other documents should reference the concept rather than create conflicting variants.

## Canonical product principles

- one visual control interface centered on projects, dialogue and execution progress;
- natural text and voice interaction from idea discovery through delivery;
- architecture, documentation, roadmap and validation criteria before implementation;
- outcome ownership rather than isolated task assistance;
- domain-based transversal agents coordinated as one team by a single orchestrator;
- structured mission decomposition, assignment, shared context, handoffs, peer control and correction loops;
- mandatory quality, security and documentation validation before completion;
- manual or intelligent model choice with final user control;
- provider-neutral hybrid AI architecture supporting external APIs and internally hosted open-source models;
- model management covering import, install, activation, deactivation, update, removal, resource monitoring and maintenance;
- dynamic routing based on cost, performance, confidentiality, latency, health and server load;
- universal connector framework supporting replaceable integrations and multiple protocols/standards;
- local, cloud/VPS, CPU and GPU execution workers;
- Security by Design, least privilege, secret management, encryption, audit trails, environment isolation, backups and recovery;
- progress percentages based on validated work, not elapsed time;
- errors and regressions are corrected before continuation when within execution authority;
- GitHub remains the complete project source of truth.

## Canonical terminology

- **Orchestrator**: the single user-facing coordinator responsible for mission decomposition, routing, collaboration, validation and final integration.
- **Domain agent**: a transversal expert defined by competence, not by a specific vendor or platform.
- **Mission**: an outcome-oriented unit of work that continues until validated delivery or a genuine external blocker.
- **Task**: an executable part of a mission with explicit state, ownership and validation implications.
- **Handoff**: structured transfer of objective, context, constraints, decisions, evidence and unresolved risks between agents.
- **Connector**: replaceable adapter to an external system, API, protocol, infrastructure service or platform.
- **Worker**: controlled execution environment, local or remote, CPU or GPU.
- **Validation gate**: mandatory evidence-based control that can reopen work when it fails.
- **Consolidation**: repository-wide harmonization required before phase closure.

## Consolidation rule

Before closing any roadmap phase, perform a repository-wide consolidation pass:

1. verify all approved strategic instructions are represented in the canonical documents and implementation where applicable;
2. identify contradictions, obsolete statements, duplicated definitions and missing cross-references;
3. merge or remove duplicates without losing requirements;
4. align terminology and module boundaries;
5. verify roadmap, architecture, validation, security, contribution rules and constitution remain mutually consistent;
6. verify implementation structure matches the current architecture for the completed scope;
7. verify current status statements match actual repository implementation and validation evidence;
8. commit consolidation changes before phase closure.

No phase may be closed with known documentation divergence, an unresolved requirement gap, a duplicated conflicting definition or an obsolete canonical statement.