# Project Guidelines: Staff-Engagement-POC

## 🏛️ Project Constitution
This project is governed by a strict constitution located in the `.claude/constitution/` directory. 

- **Authority**: All files in `.claude/constitution/` are the **absolute primary source of truth** for tech stack, architectural decisions, API contracts, and project standards.
- **Adherence**: Agents MUST validate every implementation choice, file structure, and code pattern against these specifications before writing code.

### Constitution Map
Agents should reference the following files for specific constraints:
- `MISSION.md`: Why the project exists, the domain model (Employee, Interaction, Task, Portfolio, Skills register), scope, and success criteria.
- `ROADMAP.md`: How the mission is delivered — parallel-safe splices/phases, ownership boundaries, frozen contracts, and the conflict-avoidance rules for multi-dev work.
- `tech-stack.yaml`: Core languages, frameworks, and versions (Java 21, Spring Boot, Angular 22, Postgres).
- `api-standards.yaml`: REST contracts, versioning, casing, and error handling.
- `testing-strategy.yaml`: Unit testing requirements, mutation testing (PITest/Stryker), and coverage thresholds.
- `backend-architecture.yaml`: Modular Monolith structure, ArchUnit boundaries, and Layered Architecture.
- `frontend-state.yaml`: Angular Signals, unidirectional data flow, and state service patterns.

## 🎨 Frontend Development
All frontend work must strictly adhere to the [Angular Style Guide](.claude/angular-style-guide.md).

- **Compliance**: Cross-reference the style guide for naming conventions (kebab-case), component structure, and DI patterns (`inject()`).
- **State**: Follow the rules defined in `frontend-state.yaml`.

## 🛠️ Development Workflow
- **Roadmap & splices**: Before starting feature work, consult `ROADMAP.md` for the phase/splice you're in, your owned folders, and the conflict-avoidance contract. Work only within your splice's files; cross-module access is via the frozen Service-interface contracts in `shared/api/`.
- **Modular Monolith**: Respect package-based module boundaries. No illegal cross-module imports.
- **Testing First**: Implement unit tests (BDD style) for all business logic. Note: Integration testing is explicitly disabled.
- **Casing**: Strict adherence to `kebab-case` for URLs and `camelCase` for JSON/Java.
## 🤖 Subagents
- **Constitution Guard**: (Defined in `.claude/personas/constitution-guard.md`) The absolute authority auditor. Used to "Red Team" plans and code against the Constitution YAMLs.
- **BDD Test Engineer**: (Defined in `.claude/personas/bdd-test-engineer.md`) Specialist in Gherkin-style tests and mutation-driven quality.
- **Angular State Architect**: (Defined in `.claude/personas/angular-state-architect.md`) Specialist in Signals and unidirectional data flow.

## 🚀 Custom Skills
- `/constitution-audit`: Runs `.claude/skills/constitution-audit.sh` to gather the project constitution and current diff, then audits the changes for compliance.
  - **Checklist**:
    - Tech Stack (Java 21, Angular 22)
    - API Standards (kebab-case URLs, camelCase JSON, /api/v1)
    - Testing Strategy (BDD, JUnit 5, Mutation testing)
    - Backend Arch (Modular Monolith, Layered Architecture, ArchUnit)
    - Frontend State (Signals, toSignal, computed, State Services)
  - **Output**: Compliant ✅, Warnings ⚠️, Violations ❌, and Remediation 🛠️.

- `/api-check`: Runs `.claude/skills/api-check.sh` to audit REST controllers and DTOs against `api-standards.yaml`.
  - **Checklist**:
    - URL Casing (kebab-case)
    - JSON Casing (camelCase)
    - Versioning (/api/v1 prefix)
    - Error Envelopes (timestamp, status, error, message, path)
    - Pagination (offset, limit) & Sorting (sort=field,direction)
    - Security (@PreAuthorize, Bearer JWT)
  - **Output**: Compliant ✅, Warnings ⚠️, Violations ❌, and Remediation 🛠️.

- `/arch-verify`: Runs `.claude/skills/arch-verify.sh` to enforce Modular Monolith boundaries and Layered Architecture.
  - **Checklist**:
    - Module Boundaries (No illegal cross-module imports)
    - Layer Adherence (Web -> Service -> Persistence)
    - Dependency Rules (No circular dependencies)
    - Service Interfaces (Cross-module comms via interfaces only)
  - **Output**: Compliant ✅, Warnings ⚠️, Violations ❌, and Remediation 🛠️.

- `/mutation-report`: Runs `.claude/skills/mutation-report.sh` to check test fidelity and coverage thresholds.
  - **Checklist**:
    - Backend Mutation Score (PITest >= 80%)
    - Backend Coverage (JaCoCo >= 80%)
    - Frontend Mutation Score (Stryker >= 80%)
    - Frontend Coverage (Jest/Istanbul >= 80%)
    - Testing Scope (Unit Tests Only, no Integration tests)
  - **Output**: Compliant ✅, Warnings ⚠️, Violations ❌, and Remediation 🛠️.

- `/docker-sync`: Runs `.claude/skills/docker-sync.sh` to verify and sync the containerized infrastructure.
  - **Checklist**:
    - Presence of `docker-compose.yml`
    - Service Health (Checking `docker compose ps`)
    - Image Alignment (Ensuring containers match current config)
  - **Output**: Status Report ✅/⚠️/❌ and suggested sync commands.

