# VISION SMART STUDIO

Vision Smart Studio is the official orchestration platform project for turning ideas into production-ready digital solutions through a single AI-powered workspace.

## Source of truth

This GitHub repository is the official source of truth for the project. Architecture, roadmap, governance, validation criteria, implementation notes, and production decisions must be versioned here. Conversation is used only for validation, clarification and concise progress reporting.

## Product principles

- One unified, modern, visual interface.
- Left zone: projects, folders, files, environments and history.
- Center zone: text/voice conversation, previews, code and contextual workspace.
- Right zone: tasks, subtasks, status, dependencies, validation gates and visible percentage progress.
- No feature starts without architecture, documentation, roadmap and validation criteria.
- Detected errors must be corrected before continuation when correction is under execution authority.
- No component may be declared production-ready without verifiable evidence.
- GitHub is authoritative; documentation divergence blocks phase closure.
- Agents are transversal domain experts, not platform-specific assistants.
- Agents own outcomes end to end and are coordinated as one team by a single orchestrator.
- Agent work includes structured handoffs, mutual control and correction of deviations.
- Quality, security and documentation validation are mandatory before completion.
- User control is final even when intelligent routing or automatic technology selection is enabled.
- Architecture must remain modular, provider-neutral and replaceable by design.

## Core capabilities

1. Multi-project workspace with persistent project context.
2. Natural text and voice product discovery assistant from initial idea through validated project definition.
3. Provider-neutral hybrid AI model gateway supporting external APIs and internally hosted open-source models.
4. Model manager for import, installation, activation, update, resource monitoring, maintenance and removal of internal models.
5. Manual or intelligent model selection according to cost, performance, confidentiality, latency, health and server load.
6. Multi-agent orchestration behind one user-facing interlocutor with domain-based specialists and outcome ownership.
7. Mission/task engine with real progress, assignments, dependencies, handoffs, evidence and validation gates.
8. Universal connector framework for GitHub, Supabase, Netlify, Vercel, Docker, Nginx, VPS/cloud, databases, storage, CI/CD and future integrations through REST, GraphQL, Webhooks, MCP, SDKs, OAuth, SSH and compatible standards.
9. Remote execution plane supporting local, CPU cloud/VPS and GPU workers while the user's computer remains primarily the control surface.
10. Security by Design with identity, roles, permissions, secure secrets, encryption, auditability, environment isolation, backups and disaster recovery.
11. Controlled production workflow with quality, security, documentation, non-regression, deployment and post-deployment evidence.

## Documentation

- `docs/REFERENCE.md` — canonical map and consolidation checklist.
- `docs/CONSTITUTION.md` — permanent governance and execution rules.
- `docs/ARCHITECTURE.md` — canonical system architecture and module boundaries.
- `docs/ROADMAP.md` — phased delivery plan.
- `docs/VALIDATION.md` — validation gates and definition of done.

## Current status

Phase 0 governance and architecture foundation are established and being continuously consolidated. Phase 1 implementation has started with a Next.js/TypeScript visual workspace foundation, project/task domain types, browser persistence and an interactive three-zone workspace. Phase 1 is not considered complete until build, type, functional, persistence and consolidation criteria are all verified.