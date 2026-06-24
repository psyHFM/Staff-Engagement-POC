## Why

Phase 0 stood up the modular-monolith skeleton with frozen cross-module contracts but no domain modules. Phase 1 (ROADMAP §4) delivers the **Employee** module — the central record every later phase (Interaction, Task, Portfolio, Skills) hangs off via the frozen `EmployeeContract`. Without Employee records, those phases have no subject to reference. It is the first parallel-safe splice (splice A) and implements the `EmployeeContract` port so downstream phases can depend on it.

This change also resolves two decisions deferred from Phase 0, both of which require **shared-kernel coordination PRs** (ROADMAP §2.2: "Changing a frozen contract = a coordination PR, not a splice edit"; `shared/**` is "Frozen — no splice edits"):

1. The privileged role is **ADMIN**, not the placeholder `MANAGER` the security stub shipped with.
2. A role is **stored on the Employee record** (Model B) and resolved into the JWT at login, so an admin can promote/demote employees via the API — rather than roles living only on the fixed in-memory stub (which made admin-granting impossible through the API).

All shared-kernel changes are **additive** (new enum, new field, new method, role-resolution wiring) — no existing field/method is removed or renamed, so no roadmap amendment is required. The Constitution Guard audits them.

## What Changes

**Shared-kernel coordination (additive amendments to Phase 0's frozen kernel):**
- `shared/kernel`: add an `EmployeeRole` enum (`EMPLOYEE`, `ADMIN`) so both `shared/security` and the employee module can reference it with no cross-module import.
- `shared/api`: additively amend `EmployeeSummary` to carry `role` (now `(id, fullName, email, role)`), and add `Optional<EmployeeSummary> findByEmail(String email)` to `EmployeeContract` (login arrives as an email, not an `EmployeeId`). `findById`/`exists` are unchanged.
- `shared/security`: rename the stub `MANAGER` role → `ADMIN` (user `manager`→`admin`), make stub usernames email-shaped (`admin@staff.eng`, `employee@staff.eng`), and resolve the JWT role from the employee record at login via `EmployeeContract.findByEmail` (falling back to `ROLE_EMPLOYEE` when no employee record exists yet). **BREAKING** at the stub-auth layer only (the `manager` user/role no longer exists); no public API contract breaks.

**New `employee-management` capability (the splice — backend + frontend):**
- Backend: `Employee` entity (anemic `domain/`, now including `role`), repository, `EmployeeService implements EmployeeContract`, REST controller, and a Liquibase `employee` table.
- REST under `/api/v1`: `POST /api/v1/employees` (self-service create — any authenticated user creates their own profile, email bound to the principal, `role` forced to `EMPLOYEE`), `GET /api/v1/employees` (paginated directory, any authenticated), `GET /api/v1/employees/{id}` (any authenticated), `PUT /api/v1/employees/{id}` (owner-self OR admin, full replace; only an ADMIN may change `role`). No `DELETE` in Phase 1.
- Frontend: `EmployeeList` + `EmployeeDetail` components, `EmployeeStateService` (Signals), one lazy route appended to `routes.ts`. Create form omits email and role; edit gated by RBAC.
- Seed only the `admin` Employee (`role = ADMIN`, email `admin@staff.eng`) via Liquibase; the `employee` stub user self-creates via POST (`role = EMPLOYEE`).

**Employee fields:** `id` (`EmployeeId`, DB Long sequence), `fullName` (required), `email` (required, unique, immutable identity key), `role` (`EmployeeRole`, default `EMPLOYEE`), `jobTitle` (optional), `department` (optional), `level` (optional enum `JUNIOR`/`INTERMEDIATE`/`SENIOR`), `createdAt`/`updatedAt` (server-managed). No `active` flag.

## Capabilities

### New Capabilities
- `employee-management`: The Employee domain module — backend entity/repository/service/controller implementing `EmployeeContract` (including the new `findByEmail`), the Liquibase `employee` table + admin seed, the `/api/v1/employees` REST surface with self-service create (forced `EMPLOYEE` role) and owner-or-admin edit (admin-only role changes), and the frontend `EmployeeList`/`EmployeeDetail`/`EmployeeStateService` feature with its lazy route.

### Modified Capabilities
- `backend-foundation`: Three requirements change, all additively. (a) "Shared kernel value types" gains the `EmployeeRole` enum. (b) "JWT + RBAC security stub" switches roles to `EMPLOYEE`/`ADMIN`, makes stub usernames email-shaped, and resolves the JWT role from the employee record at login via `EmployeeContract.findByEmail` (fallback `EMPLOYEE`). (c) "Frozen cross-module contracts" additively amends `EmployeeSummary` to carry `role` and adds `findByEmail` to `EmployeeContract`.

## Impact

- **Shared kernel (Phase 0, outside the employee splice boundary — delivered as a coordination PR ahead of the splice):** `shared/kernel` (new `EmployeeRole`), `shared/api` (`EmployeeSummary` + `role`; `EmployeeContract` + `findByEmail`), `shared/security` (`StubUserStore` rename + email-shaped usernames; `JwtTokenProvider`/`AuthController` role resolution; their tests). Constitution Guard audits; ArchUnit stays green (shared depends on `shared/api` interfaces only, never an employee impl). No existing `findById`/`exists` signature or `EmployeeSummary` consumer breaks (no producers existed in Phase 0).
- **Backend employee splice:** new `backend/.../employee/**` (entity with `role`, repository, service implementing `EmployeeContract` incl. `findByEmail`, controller, DTOs, mapper, Liquibase changelog under `db/changelog/modules/employee/`).
- **Frontend splice:** new `frontend/.../features/employee/**` (`EmployeeList`, `EmployeeDetail`, `EmployeeStateService`); one line appended to `routes.ts`.
- **APIs:** adds `POST/GET/GET-by-id/PUT /api/v1/employees`; no existing endpoint's contract changes.
- **Data:** new `employee` table (with `role` column) + a single seeded `admin` row (`role = ADMIN`).
- **Tests:** BDD unit tests (JUnit5 + Mockito) for service/controller/security; PITest + JaCoCo ≥80%; ArchUnit green.