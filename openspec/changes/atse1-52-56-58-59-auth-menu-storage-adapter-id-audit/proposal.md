# Proposal: ATSE1-52/56/58/59 — Auth Menu, Storage Adapter, ID Audit, Skills Debug

**Date:** 2026-06-30  
**Author:** Claude Code  
**Tickets:** ATSE1-52, ATSE1-56, ATSE1-58, ATSE1-59

---

## Executive Summary

This proposal addresses four critical tickets from the UX walkthrough (2026-06-25):

1. **ATSE1-52**: Rework shell auth menu with Profile/Sign out dropdown and clear feedback
2. **ATSE1-56**: Investigate and fix Skills detail view breaking
3. **ATSE1-58**: Audit and document seeded employee ID gaps (1, 47–50)
4. **ATSE1-59**: Introduce namespaced sessionStorage adapter for auth state persistence

---

## Problem Statements

### ATSE1-52: Auth Menu UX
- "Sign out" is the only way to log out with no keyboard shortcut, no confirmation, no visible feedback
- No profile link accessible from shell

### ATSE1-56: Skills Detail View Broken
- User-reported: "it's not working right now"
- Unknown if data layer, routing, or template issue

### ATSE1-58: Employee ID Gaps
- Seeded employee IDs: 1, 47, 48, 49, 50 (non-contiguous)
- UI components hardcode IDs (1, 2, 3) assuming sequential range
- Causes mismatches in Interactions, Tasks, other UIs

### ATSE1-59: Auth State Persistence
- AuthState uses `signal()` as only JWT source
- Hot-reload resets signal, losing auth state
- No sessionStorage adapter for ephemeral persistence

---

## Proposed Solutions

### ATSE1-52: Shell Auth Menu

**Files:** `frontend/src/app/shell/shell.html`, `shell.ts`, `shell.scss`

**Changes:**
1. Convert current button to dropdown trigger
2. Add menu with "Profile" and "Sign out" options
3. On sign out: redirect to `/login?reason=signed_out` with green toast
4. Add `:focus-visible` styles for keyboard navigation

### ATSE1-56: Skills Debug

**Files:** `frontend/src/app/features/skills/skills-state.service.ts`, `skills-page.html`, backend `SkillController`

**Approach:**
1. Verify `GET /api/v1/skills/search?name=Angular` returns 200 + payload
2. Check frontend `search(name)` mapping to card signal
3. Verify detail view binds to correct signal
4. Check console errors and network 4xx/5xx

### ATSE1-58: Employee ID Audit

**Files:** `db/test-data-seed.sql`, `frontend/src/app/features/**/*`

**Changes:**
1. Add comment to `db/test-data-seed.sql` documenting ID range
2. Search for hardcoded employee IDs in frontend
3. Replace with dropdown/lookup where needed
4. Create documentation file with findings

### ATSE1-59: Storage Adapter

**Files:** `frontend/src/app/shared/storage/storage-adapter.ts` (new), `auth-state.ts`

**Changes:**
1. Create `StorageAdapter` class wrapping `sessionStorage`/`localStorage`
2. Namespaced keys: `staff-engagement:{key}`
3. AuthState reads from adapter on construction
4. Unit test adapter

---

## Implementation Order

1. **ATSE1-59** (Storage Adapter) — Foundation for ATSE1-52
2. **ATSE1-52** (Auth Menu) — Depends on storage adapter
3. **ATSE1-56** (Skills Debug) — Independent
4. **ATSE1-58** (ID Audit) — Independent

---

## Acceptance Criteria Mapping

| Ticket | Criterion | Implementation |
|--------|-----------|----------------|
| ATSE1-52 | Real button in dropdown menu | `<button type="button">` in menu |
| ATSE1-52 | Redirect to `/login?reason=signed_out` | Router navigation in logout handler |
| ATSE1-52 | Green toast feedback | Toast service call |
| ATSE1-52 | Focus-visible styles | SCSS `:focus-visible` rules |
| ATSE1-56 | Determine root cause | Debug checklist completed |
| ATSE1-56 | Fix or child ticket | Implementation or follow-up |
| ATSE1-58 | Document ID range in seed script | Comment added |
| ATSE1-58 | Audit UI for hardcoded IDs | Grep results + fixes |
| ATSE1-59 | StorageAdapter with namespaced keys | New file + tests |
| ATSE1-59 | AuthState uses adapter | Read on construction |
| ATSE1-59 | Unit tested | BDD-style tests |

---

## Constitution Compliance

### Tech Stack
- ✅ Java 21, Angular 22.0.2
- ✅ Signals, toSignal(), computed()
- ✅ sessionStorage for auth (per frontend-state.yaml carve-out)

### API Standards
- ✅ kebab-case URLs
- ✅ camelCase JSON
- ✅ /api/v1 prefix

### Testing
- ✅ BDD-style unit tests
- ✅ JUnit 5 (backend), Jest (frontend)

### Architecture
- ✅ Modular Monolith boundaries
- ✅ Service-based state (no component direct updates)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Storage adapter XSS exposure | sessionStorage scoped to tab lifetime; existing XSS risk unchanged |
| Skills fix requires backend change | Keep backend minimal; frontend-first diagnosis |
| ID renumbering breaks existing data | Document first, renumber in future phase if needed |

---

## Files to Create/Modify

### New Files
- `frontend/src/app/shared/storage/storage-adapter.ts`
- `frontend/src/app/shared/storage/storage-adapter.spec.ts`
- `docs/employee-id-seed-audit.md`

### Modified Files
- `frontend/src/app/shell/shell.html`
- `frontend/src/app/shell/shell.ts`
- `frontend/src/app/shell/shell.scss`
- `frontend/src/app/shared/auth/auth-state.ts`
- `frontend/src/app/features/skills/skills-state.service.ts`
- `frontend/src/app/features/skills/skills-page.html`
- `db/test-data-seed.sql`

---

## Persona Reviews Required

- **Constitution Guard**: Verify tech stack, API standards, testing strategy
- **Angular State Architect**: Verify Signals, storage adapter pattern
- **BDD Test Engineer**: Verify test coverage, mutation testing plan
- **Constitutional Backend Developer**: Verify modular monolith boundaries

---

## Persona Reviews Complete

All persona reviews have been completed and are stored in `persona-reviews/`:

| Persona | Status | Key Findings |
|---------|--------|--------------|
| Constitution Guard | ✅ Compliant | Add mutation targets, skills diagnosis doc |
| Angular State Architect | ✅ Compliant | Make StorageAdapter injectable, add error handling |
| BDD Test Engineer | ✅ Compliant | Test plan covers all mutation targets |
| Constitutional Backend Developer | ✅ Compliant | No backend violations |

---

## Next Steps

1. ✅ Persona reviews complete
2. ✅ Apply fixes from persona feedback (see design.md)
3. Implement in order: ATSE1-59 → ATSE1-52 → ATSE1-56 → ATSE1-58
4. Run constitution audit before commit
