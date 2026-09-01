# VISION SMART STUDIO

Vision Smart Studio is the official orchestration platform project for turning ideas into production-ready digital solutions through a single AI-powered workspace.

## Source of truth

This GitHub repository is the official source of truth for the project. Architecture, roadmap, governance, validation criteria, implementation notes, and production decisions must be versioned here.

## Product principles

- One unified, modern, visual interface.
- Left zone: projects, folders, files, environments, history.
- Center zone: text/voice conversation, previews, code, and contextual workspace.
- Right zone: tasks, subtasks, status, dependencies, and visible percentage progress.
- No feature starts without architecture, documentation, roadmap, and validation criteria.
- Detected errors must be corrected before continuation when correction is under the agent's control.
- No component may be declared production-ready without verifiable evidence.
- Work is executed in bounded missions: prepare, execute, test, correct, validate, then continue.
- GitHub is authoritative; conversation is used only for follow-up and decisions.

## Core capabilities

1. Multi-project workspace with persistent project context.
2. Text and voice product discovery assistant.
3. AI model/provider selection: manual or intelligent routing.
4. Multi-agent orchestration behind one user-facing interlocutor.
5. Task engine with live progress and validation gates.
6. Extensible connectors for GitHub, Supabase, Netlify, Docker, Nginx, VPS/cloud, databases, storage, and CI/CD.
7. Remote execution architecture so a cloud machine can perform heavy work while the local computer remains the control surface.
8. Production workflow with tests, non-regression controls, evidence, and explicit release gates.

## Documentation

- `docs/CONSTITUTION.md` — permanent governance rules.
- `docs/ARCHITECTURE.md` — system architecture and module boundaries.
- `docs/ROADMAP.md` — phased delivery plan.
- `docs/VALIDATION.md` — validation gates and definition of done.

## Current status

Foundation phase started. No production implementation is considered started until the foundation documents and Phase 1 acceptance criteria are committed and validated.