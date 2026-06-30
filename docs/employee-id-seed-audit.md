# Employee ID Seed Audit (ATSE1-58)

**Date:** 2026-06-30  
**Auditor:** Claude Code

---

## Seeded ID Range

**Source:** `backend/src/main/resources/db/changelog/modules/zz_seed/seed-001-initial.yaml`

| Employee | Email | ID (auto-generated) |
|----------|-------|---------------------|
| Alice Manager | alice@staff.eng | 1 |
| Bob Developer | bob@staff.eng | 2 |
| Charlie Coder | charlie@staff.eng | 3 |
| Diana Expert | diana@staff.eng | 4 |

**Note:** The current seed uses **contiguous sequential IDs (1-4)**, not the gaps (1, 47-50) mentioned in the original ticket. The ticket description may have been from an older seed version.

---

## Hardcoded ID Locations Found

### 1. Interaction State Service

**File:** `frontend/src/app/features/interaction/interaction-state.service.ts:203`

```typescript
console.warn('defaultFacilitator: no employeeId linked for current user, defaulting to id=1 (admin)');
return { value: 1 };
```

**Impact:** Falls back to employee ID 1 (Alice) when no authenticated user is linked.

**Fix Status:** ⚠️ **Acceptable fallback** - This is a defensive default for edge cases. The warning is logged, and the primary path uses `auth.currentEmployeeId()`.

---

### 2. Portfolio Component

**File:** `frontend/src/app/features/portfolio/portfolio.ts:223, 285`

```typescript
protected readonly employeeId = signal('1');

ngOnInit(): void {
  const defaultId = this.auth.currentEmployeeId();
  this.employeeId.set(defaultId?.toString() ?? '1');
  this.load();
}
```

**Impact:** Falls back to employee ID 1 when no authenticated user.

**Fix Status:** ✅ **Defensive fallback** - Primary value comes from `auth.currentEmployeeId()`. The `'1'` is only a safety net.

---

### 3. Test Files (Mock Data)

**Files:**
- `frontend/src/app/features/skills/skills-page.spec.ts:14`
- `frontend/src/app/features/skills/skills-state.service.spec.ts:14`
- `frontend/src/app/features/portfolio/portfolio-state.service.spec.ts:41, 57, 73, 89, 105`
- `frontend/src/app/features/portfolio/portfolio.spec.ts:94`
- `frontend/src/app/profile/profile-state.service.spec.ts:27`
- `frontend/src/app/features/task/task.spec.ts:19`
- `frontend/src/app/shared/auth/auth-state.spec.ts:73, 88, 159, 199, 239, 242`
- `frontend/src/app/shared/auth/bearer-auth.interceptor.spec.ts:44, 71`

**Impact:** None - these are test mocks using arbitrary IDs.

**Fix Status:** ✅ **No action needed** - Test data is allowed to use arbitrary IDs.

---

## Summary

| Location | Hardcoded ID | Severity | Action |
|----------|--------------|----------|--------|
| interaction-state.service.ts | 1 | ⚠️ Low | Acceptable fallback with warning |
| portfolio.ts | 1 | ✅ Minimal | Defensive fallback only |
| Test files | Various | ✅ None | No action needed |

---

## Recommendations

1. **No immediate fixes required.** The hardcoded IDs found are:
   - Defensive fallbacks (not primary logic)
   - Test mocks (acceptable)

2. **Future consideration:** If the seed IDs ever become non-contiguous, review the fallback values.

3. **Documentation:** The seed file now has a comment documenting the ID range (ATSE1-58 complete).

---

## Related Tickets

- ATSE1-28: Replace hardcoded employee IDs with lookup
- ATSE1-34: Employee selector dropdown implementation

---

## Sign-Off

| Check | Status |
|-------|--------|
| Seed file documented | ✅ |
| Frontend audited | ✅ |
| Hardcoded IDs identified | ✅ |
| Fixes applied (if needed) | ✅ N/A |
| Follow-up tickets created | ✅ N/A |
