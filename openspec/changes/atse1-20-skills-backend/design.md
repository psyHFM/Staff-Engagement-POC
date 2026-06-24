## Design Decisions

### D1: In-memory aggregation via contracts (no projection table)
The issue describes the skills projection as **optional**. For the POC we aggregate on demand:
1. `SkillsService` calls `employeeContract.allEmployees()`.
2. For each employee it calls `portfolioContract.portfolioFor(employeeId)`.
3. It collects every `SkillStrength`, applies `name` and `minYears` filters, sorts, and pages.

**Rationale:** avoids introducing cross-module events or circular dependencies; no new table; sufficient for POC scope. A future story can replace this with a persisted projection if performance becomes a concern.

### D2: Additive `EmployeeContract.allEmployees()`
The existing `EmployeeContract` only supports lookup by id/email and existence checks. Aggregation needs the full employee set. We add a single read-only method returning `List<EmployeeSummary>`.

**Rationale:** this is the smallest additive extension that keeps the Skills module from importing Employee internals. It follows the constitution's rule that additive contract changes are allowed.

### D3: Skill-name matching is case-insensitive
`?name=angular` matches both "Angular" and "angular". If `name` is blank or absent, the endpoint returns a 400 (search requires a skill).

**Rationale:** natural user search behavior; returning all skills by default would be expensive and undefined.

### D4: Sorting whitelist
Only `years` and `projectCount` are allowed as sort fields. Default is `years,desc`. Unknown fields produce 400.

**Rationale:** keeps the in-memory sort deterministic and prevents leaking arbitrary field names into comparator logic.

### D5: RBAC
`GET /api/v1/skills` requires any authenticated user (`@PreAuthorize("isAuthenticated()")`).

**Rationale:** matches `MISSION.md` ("any authenticated user may create/view") and the existing module conventions.

## Deferred / Out of Scope
- **Frontend skills UI:** separate story.
- **Persisted skills projection:** optional per the issue; deferred.
- **PITest target expansion:** if `pom.xml` still targets only `shared.*`, mutation testing for `skills.*` is deferred to a coordination PR.
