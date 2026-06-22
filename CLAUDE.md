# Project Guidelines: Staff-Engagement-POC

## 🏛️ Project Constitution
This project is governed by a strict constitution located in the `.claude/constitution/` directory. 

- **Authority**: All files in `.claude/constitution/` are the **absolute primary source of truth** for tech stack, architectural decisions, API contracts, and project standards.
- **Adherence**: Agents MUST validate every implementation choice, file structure, and code pattern against these specifications before writing code.

### Constitution Map
Agents should reference the following files for specific constraints:
- `tech-stack.yaml`: Core languages, frameworks, and versions (Java 21, Spring Boot, Angular 22, Postgres).
- `api-standards.yaml`: REST contracts, versioning, casing, and error handling.
- `testing-strategy.yaml`: Unit testing requirements, mutation testing (PITest/Stryker), and coverage thresholds.
- `backend-architecture.yaml`: Modular Monolith structure, ArchUnit boundaries, and Layered Architecture.
- `frontend-state.yaml`: Angular Signals, unidirectional data flow, and state service patterns.

## 🛠️ Development Workflow
- **Modular Monolith**: Respect package-based module boundaries. No illegal cross-module imports.
- **Testing First**: Implement unit tests (BDD style) for all business logic. Note: Integration testing is explicitly disabled.
- **Casing**: Strict adherence to `kebab-case` for URLs and `camelCase` for JSON/Java.
- **Infrastructure**: All components must be orchestratable via Docker Compose.
