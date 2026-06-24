## Context

Phase 0 delivered the modular-monolith skeleton: frozen cross-module contracts in `shared/api`, a typed-ID kernel, a uniform error envelope, a JWT/RBAC security stub, Liquibase wiring, and an ArchUnit boundary baseline — but no domain modules. Phase 1 (ROADMAP §4, splice A) builds the **Employee** module, the central record that Interaction (Phase 2), Task (Phase 3), Portfolio (Phase 4), and Skills (Phase 5) reference via the frozen `EmployeeContract`. The Employee module is the first feature splice and must stay within its owned folders (`backend/.../employee/**`, `db/changelog/modules/employee/**`, `frontend/.../features/employee/**`), depending on other modules only through `shared/api`.

The security stub shipped with placeholder roles `EMPLOYEE`/`MANAGER` (in-memory users `employee`/`manager`), with the role living only on the stub — so admin-ness could not be granted through any API. This change adopts **Model B**: the role is stored on the Employee record and resolved into the JWT at login, so an admin can promote/demote via the API. Because the auth layer (in `shared/security`) must read a role that lives in the employee module, and ArchUnit forbids `shared` from importing any module's `repository/`/`domain/`, the role crosses the boundary through the frozen-contract seam. Those shared-kernel edits are **coordination PRs, not splice edits** (ROADMAP §2.2 line 133: "Changing a frozen contract = a coordination PR, not a splice edit … additive changes only; breaking changes require a roadmap amendment"; line 162: `shared/**` is "Frozen — no splice edits").

Constraints: Java 21 / Spring Boot 3.5.15; ArchUnit enforces `controller/→service/→repository` and forbids cross-module `repository/`/`domain` imports and `shared`→module imports; `api-standards.yaml` (kebab-case URLs, camelCase JSON, unwrapped, uniform `ErrorEnvelope`, offset/limit pagination, Bearer JWT + `@PreAuthorize`); `frontend-state.yaml` (Signals, service-based state, in-memory only); Angular style guide (`inject()`, kebab-case, standalone). Integration tests are disabled — unit tests only (BDD).

## Goals / Non-Goals

**Goals:**
- Store `role` (`EmployeeRole`) on the Employee record and resolve it into the JWT at login, so an admin can promote/demote via the API.
- Implement `EmployeeContract` (including the new additive `findByEmail`) with a real Employee entity, repository, service, and controller.
- Provide `POST/GET/GET-by-id/PUT /api/v1/employees` with self-service create (forced `EMPLOYEE`) and owner-or-admin edit (admin-only role changes).
- Add the `employee` Liquibase table and bootstrap an `admin` Employee (`role = ADMIN`).
- Rename the security stub's `MANAGER` role → `ADMIN` and make stub usernames email-shaped.
- Ship the frontend `EmployeeList`/`EmployeeDetail`/`EmployeeStateService` with a lazy route.
- Keep ArchUnit green; BDD unit tests + PITest + JaCoCo ≥80%.

**Non-Goals:**
- `Employee DELETE`; list filtering; an `active`/soft-delete flag.
- A real auth provider — authentication (password) stays stub-driven; only the *role* is derived from the employee record. Self-registration beyond the fixed stub identities is out of scope (only `admin@` and `employee@` can log in until real auth replaces the stub).
- Email change (email is immutable).
- Any other domain module (Interaction/Task/Portfolio/Skills).
- Breaking changes to any frozen contract (no roadmap amendment); all shared-kernel changes are additive.

## Decisions

**1. Vertical-slice module following frozen layering.** `employee/` is internally layered `domain/` (anemic `Employee` entity + `EmployeeId`) → `repository/` (`EmployeeRepository`) → `service/` (`EmployeeService implements EmployeeContract`) → `controller/` (`EmployeeController` + request/response DTOs). The controller depends on the service only (ArchUnit). `EmployeeService` implements the frozen `EmployeeContract` (including the new `findByEmail`) so Phases 2–5 depend on the port, not the impl. *Alternative:* a single-package module — rejected; the constitution mandates the layered structure and ArchUnit enforces it.

**2. `EmployeeId` generation = DB Long sequence.** The frozen `shared/kernel` type is `EmployeeId(Long value)`, so the underlying column is a Long and the natural generation is a Postgres identity/sequence. Derived from the frozen type, not a fresh choice.

**3. Email as the immutable identity key, bound to the principal.** The JWT carries the stub *username*. `POST` derives `email` from the authenticated principal (`principal.name`) — the body carries no email. `email` is then immutable (never accepted on `PUT`). "Own record" for the owner-edit rule is `employee.email == principal.name`. Stub usernames become email-shaped (`admin@staff.eng`, `employee@staff.eng`) so `principal.name` is a valid email. *Alternative:* a separate `username` column — rejected; duplicates identity and adds a field beyond the agreed set.

**4. Model B: role on the Employee record, resolved at login.** `Employee` carries `role` (`EmployeeRole`, default `EMPLOYEE`). `EmployeeRole` lives in `shared/kernel` so both `shared/security` and the employee module reference it with no cross-module import. `JwtTokenProvider`/`AuthController` resolves the role at login via `EmployeeContract.findByEmail(principal.name)` and embeds `ROLE_<role>` in the token; if no employee record exists yet (the user hasn't self-created), it falls back to `ROLE_EMPLOYEE` so they can still POST their own profile. `StubUserStore` keeps **passwords** (still the authenticator); its role list becomes the fallback only. Promotion via `PUT` takes effect on the promoted user's **next login** (token re-minted with the new role). *Alternative:* per-request DB resolution for immediate effect — deferred; one extra query per request isn't justified for a POC. *Alternative rejected earlier (Model A):* role on the stub only — rejected because it makes admin-granting impossible through the API.

**5. Role-crossing is additive, via coordination PR.** The role crosses the module boundary through the frozen seam: `EmployeeSummary` additively gains `role` (now `(id, fullName, email, role)`), and `EmployeeContract` additively gains `findByEmail(String) → Optional<EmployeeSummary>`. Both are additive (no existing field/method removed or renamed) → no roadmap amendment. They are delivered as a **coordination PR ahead of the splice**, not folded into the employee feature PR (ROADMAP §2.2). The Java-record caveat: adding a component changes the canonical constructor signature — *source-breaking for existing producers* — but no code produces `EmployeeSummary` yet (Phase 0 left contracts unimplemented), so it is safe; the Constitution Guard verifies this. Auth needs `findByEmail` (not `findById`) because login yields an email, not an `EmployeeId`.

**6. Self-service create; owner-or-admin edit; admin-only role change.** `POST` is open to any authenticated user but creates only their own profile (email bound to principal) and forces `role = EMPLOYEE` (no self-promotion; `role` is not in the body). `PUT` is allowed for the record's owner (self) or an ADMIN; full replace of `fullName/jobTitle/department/level/role`, but **only an ADMIN may change `role`** — a non-admin's PUT that attempts to change `role` is rejected (400/403). Anyone else's PUT → 403. *Alternative:* admin-only create — rejected by the product owner; contradicts self-service. The "self creates self" circularity is resolved because creation binds identity to the already-authenticated principal.

**7. Bootstrap by seeding only the `admin` Employee (`role = ADMIN`).** A Liquibase changeset seeds one `admin` row (email `admin@staff.eng`, `role = ADMIN`) so a privileged user exists immediately and its first login yields `ROLE_ADMIN`. The `employee` stub user self-creates via `POST` (`role = EMPLOYEE`).

**8. Pagination via the frozen `PageRequest`/`Paged` DTOs.** `GET /api/v1/employees` accepts `offset`/`limit` (default 20, max 100) and `sort=field,direction` (whitelist `fullName`, `email`, `department`, `level`, `createdAt`; default `createdAt,desc`). Returns `Paged<EmployeeResponse>`. No list filters in Phase 1.

**9. Error mapping.** Duplicate email → 409; validation failure → 400; not found → 404; unauthenticated → 401; non-owner-non-admin PUT → 403; a non-admin attempting to change `role` → 403 — all via the uniform `ErrorEnvelope`. Validation: `fullName`/`email` non-blank with max lengths, `email` format-validated, `level` ∈ enum or null, `jobTitle`/`department` free text with max length, `role` ∈ `EmployeeRole` (server-enforced on create). `createdAt`/`updatedAt` server-managed.

**10. `PUT` = full replace, email + role-restricted.** `PUT` replaces `fullName`, `jobTitle`, `department`, `level`, and (for admins) `role`; omitted optional fields → null. `email` is not in the body (immutable; a differing email → 400). `role` is accepted only from an ADMIN; from a non-admin it is rejected.

## Risks / Trade-offs

- **[Shared-kernel expansion crosses the splice boundary]** → Mitigation: delivered as a dedicated coordination PR ahead of the splice (per ROADMAP §2.2); all changes additive; Constitution Guard audits; ArchUnit stays green (shared → `shared/api` interfaces only).
- **[Amending a frozen `record` is borderline source-breaking]** → Mitigation: no existing producer of `EmployeeSummary` exists (Phase 0 had no impls); additive accessor; Constitution Guard verifies. Kept strictly additive (no rename/removal) so no roadmap amendment is needed.
- **[Email immutable, so name changes need a migration]** → Accepted trade-off for identity simplicity in a POC; documented as a non-goal.
- **[Self-service create is only meaningful for the fixed stub identities]** → Accepted: the stub has exactly two users; create is exercised once per stub user. Real registration is a non-goal until real auth replaces the stub.
- **[Promotion takes effect on next login, not immediately]** → Accepted for a POC (login-time resolution); per-request resolution is available if immediate effect is later required.
- **[MANAGER rename is BREAKING at the stub-auth layer]** → Mitigation: MANAGER is enforced nowhere; update the stub test; CI verifies. Any local scripts using the `manager` login switch to `admin`.

## Migration Plan

1. Land the **coordination PR** first: `EmployeeRole` (kernel) + `EmployeeSummary.role` + `EmployeeContract.findByEmail` + security stub rename/email-shaping/role-resolution + updated tests; ArchUnit green.
2. Apply the **splice**: Liquibase `employee` changeset (table with `role` + `admin` seed at `role = ADMIN`), Employee module, frontend feature.
3. Rollback: revert each PR; drop the `employee` table via a Liquibase rollback changeset; restore the `manager` stub user. No external data migration is required (greenfield table).

## Open Questions

None — all product and technical decisions are resolved, including the Model B role model and the additive-amendment-via-coordination-PR approach.