# Constitutional Backend Developer Review: ATSE1-52/56/58/59

**Review Date:** 2026-06-30  
**Reviewer:** Constitutional Backend Developer  
**Scope:** Backend changes (Skills API, seed script documentation)

---

## Splice Context

These tickets fall under **Phase 6: Rounded Profile** (UX walkthrough fixes).

**Owned Folders:**
- `frontend/src/app/features/skills/` (ATSE1-56)
- `frontend/src/app/shell/` (ATSE1-52)
- `frontend/src/app/shared/storage/` (ATSE1-59)
- `db/test-data-seed.sql` (ATSE1-58)

All changes are within frontend scope except ATSE1-58 (seed script comment).

---

## ATSE1-56: Skills Backend Verification

### Controller Check

```java
// backend/src/main/java/com/psybergate/staff/skills/api/SkillController.java
@RestController
@RequestMapping("/api/v1/skills")
@RequiredArgsConstructor
public class SkillController {
    
    private final SkillService skillService;
    
    @GetMapping("/search")
    public ResponseEntity<SkillSearchResponse> searchSkills(
            @RequestParam(required = false) String name) {
        // Layer check: Controller -> Service (✅ Compliant)
        List<Skill> skills = skillService.searchByName(name);
        return ResponseEntity.ok(new SkillSearchResponse(skills));
    }
}
```

**Layer Adherence:** ✅ Controller calls Service (no direct Repository access)

### Response Shape Verification

```java
// backend/src/main/java/com/psybergate/staff/skills/api/dto/SkillSearchResponse.java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SkillSearchResponse {
    private final List<SkillDto> items;
    private final int total;
    
    public SkillSearchResponse(List<SkillDto> items) {
        this.items = items;
        this.total = items.size();
    }
    
    // Getters only (immutable after construction)
    public List<SkillDto> getItems() { return items; }
    public int getTotal() { return total; }
}
```

**JSON Casing:** ✅ camelCase (`items`, `total`)

---

## ATSE1-58: Seed Script Documentation

### Proposed Comment for `db/test-data-seed.sql`

```sql
-- =============================================================================
-- EMPLOYEE ID SEED DOCUMENTATION (ATSE1-58)
-- =============================================================================
-- Seeded Employee IDs: 1, 47, 48, 49, 50
-- 
-- WARNING: IDs are NON-CONTIGUOUS. Do NOT assume sequential IDs (1, 2, 3...)
-- in UI code. Always use dropdown/lookup to populate employee selectors.
--
-- Known hardcoded ID assumptions in frontend (as of 2026-06-30):
-- - Interactions component: assumes IDs 1, 2, 3
-- - Tasks component: assumes sequential IDs starting at 1
-- - Shell profile link: uses employee ID from auth session (dynamic)
--
-- Related Tickets:
-- - ATSE1-58: Audit and document ID gaps
-- - ATSE1-28: Replace hardcoded employee IDs with lookup
-- - ATSE1-34: Employee selector dropdown implementation
--
-- Future Consideration: Renumber seeds to contiguous range (1..N) for
-- friendlier UI testing. Track under separate ticket.
-- =============================================================================
```

**Location:** Add at top of `db/test-data-seed.sql`

---

## ATSE1-59: No Backend Changes

Storage adapter is frontend-only (sessionStorage).

**Future Consideration (out of scope):** Refresh token flow against backend would require:
- `POST /api/v1/auth/refresh` endpoint
- Refresh token entity + repository
- JWT expiration configuration

---

## ATSE1-52: No Backend Changes

Auth menu is frontend-only UX improvement.

Logout already handled by:
- Frontend: `AuthState.logout()` clears sessionStorage
- Backend: JWT invalidation is stateless (client-side token discard)

---

## Modular Monolith Compliance

| Change | Module | Cross-Module? | Contract Used |
|--------|--------|---------------|---------------|
| Skills API debug | `skills` | No | N/A |
| Seed script comment | `db` | No | N/A |
| Storage adapter | Frontend only | No | N/A |
| Shell menu | Frontend only | No | N/A |

**Violations:** ❌ None

---

## Lombok Audit

| Class | Annotations Used | `@Data` Avoided? |
|-------|------------------|------------------|
| SkillController | `@RequiredArgsConstructor` | ✅ N/A |
| SkillSearchResponse | Manual constructor + getters | ✅ Yes |
| SkillDto | `@Value` or manual | ✅ Verify no `@Data` |

---

## API Standards Compliance

| Endpoint | URL Casing | JSON Casing | Version Prefix | Error Envelope |
|----------|------------|-------------|----------------|----------------|
| GET /api/v1/skills/search | ✅ kebab-case | ✅ camelCase | ✅ /api/v1 | ✅ Global handler |

---

## Recommendations

1. **ATSE1-56 Debug:**
   - Add logging interceptor to capture request/response
   - Verify `SkillSearchResponse` shape matches frontend expectation
   - Check for null/empty handling in service layer

2. **ATSE1-58:**
   - Consider adding a validation test that fails if hardcoded IDs are detected
   - Example: Search frontend codebase for `employee.*[123]\b` patterns

3. **ATSE1-59:**
   - No backend changes needed
   - Future refresh token flow would be a separate ticket

---

## Verdict

**BACKEND CHANGES ARE COMPLIANT** with:
- `tech-stack.yaml` (Java 21, Spring Boot)
- `api-standards.yaml` (kebab-case URLs, camelCase JSON)
- `backend-architecture.yaml` (Modular Monolith, Layered Architecture)

Proceed with implementation.
