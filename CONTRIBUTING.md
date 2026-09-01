# Contributing to Vision Smart Studio

All contributions must follow `docs/CONSTITUTION.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/VALIDATION.md`, and `docs/REFERENCE.md`.

## Required workflow

1. Identify the bounded mission and expected outcome.
2. Confirm architecture, scope, acceptance criteria, security considerations and roadmap placement exist before implementation.
3. Change only the required scope and directly encountered dependencies.
4. Correct detected errors before continuing when within execution authority.
5. Run applicable type, lint, build, functional, regression and security checks.
6. Update canonical documentation when architecture or behavior changes.
7. Commit progressively with explicit messages describing the real action performed.
8. Do not claim completion until applicable quality, security, documentation and consolidation gates pass.

## Code conventions

- TypeScript strict mode is the default for application code.
- Keep UI, orchestration, model-provider, connector and execution concerns separated by architecture boundaries.
- Do not place provider-specific model logic in UI components.
- Do not hard-code secrets, tokens, credentials, private endpoints or environment-specific sensitive values.
- Prefer small modules with explicit types and responsibilities.
- New abstractions must have a clear current or architectural use; avoid speculative complexity.
- Progress values must represent actual state rather than simulated elapsed time.

## Commits

Use concise conventional-style prefixes where useful, for example:

- `feat:` user-visible capability or domain behavior;
- `fix:` correction;
- `docs:` canonical documentation;
- `refactor:` structural change without intended behavior change;
- `test:` validation coverage;
- `ci:` CI/CD configuration;
- `chore:` tooling or maintenance.

A commit message must describe what actually changed.

## Pull requests and direct commits

The project may use direct progressive commits during early foundation work when authorized. As collaboration expands, protected branches and pull-request review should be enabled. Regardless of mechanism, validation gates remain mandatory.

## Completion

A report, code generation, successful commit or merge is not completion. Completion means the defined outcome has passed all applicable gates in `docs/VALIDATION.md`.