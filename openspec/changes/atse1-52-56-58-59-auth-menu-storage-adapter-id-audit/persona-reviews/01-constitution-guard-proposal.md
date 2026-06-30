# Constitution Guard Review: ATSE1-52/56/58/59 Proposal

**Review Date:** 2026-06-30  
**Reviewer:** Constitution Guard  
**Scope:** Proposal compliance against `.claude/constitution/*.yaml`

---

## Audit Dimensions

### 1. Tech Stack ✅

**Reference:** `tech-stack.yaml`

| Requirement | Proposal | Status |
|-------------|----------|--------|
| Java 21 | Backend changes (SkillController, seed script) | ✅ Compliant |
| Spring Boot | Existing backend architecture | ✅ Compliant |
| Angular 22.0.2 | All frontend changes | ✅ Compliant |
| PostgreSQL | No schema changes proposed | ✅ Compliant |

### 2. API Standards ✅

**Reference:** `api-standards.yaml`

| Requirement | Proposal | Status |
|-------------|----------|--------|
| `/api/v1` prefix | Skills debug references `/api/v1/skills/search` | ✅ Compliant |
| `kebab-case` URLs | No new endpoints proposed | ✅ Compliant |
| `camelCase` JSON | No new DTOs proposed | ✅ Compliant |
| Uniform Error Envelope | No new error handling changes | ✅ Compliant |

### 3. Testing Strategy ✅

**Reference:** `testing-strategy.yaml`

| Requirement | Proposal | Status |
|-------------|----------|--------|
| BDD Style | Tests planned for StorageAdapter | ✅ Compliant (pending implementation) |
| JUnit 5 / Jest | Frontend tests specified | ✅ Compliant |
| Unit Tests Only | No integration tests mentioned | ✅ Compliant |
| Mutation Testing | Not explicitly mentioned | ⚠️ Warning: Should specify mutation targets |

### 4. Backend Architecture ✅

**Reference:** `backend-architecture.yaml`

| Requirement | Proposal | Status |
|-------------|----------|--------|
| Modular Monolith | No cross-module changes | ✅ Compliant |
| Layered Architecture | No layer violations | ✅ Compliant |
| ArchUnit Boundaries | No boundary changes | ✅ Compliant |

### 5. Frontend State ✅

**Reference:** `frontend-state.yaml`

| Requirement | Proposal | Status |
|-------------|----------|--------|
| Angular Signals | AuthState uses signals | ✅ Compliant |
| Unidirectional Flow | State service pattern maintained | ✅ Compliant |
| `toSignal()` for async | No changes to RxJS pipeline | ✅ Compliant |
| `computed()` for derived | No derived state changes | ✅ Compliant |
| **sessionStorage carve-out** | ATSE1-59 explicitly uses sessionStorage for auth | ✅ Compliant (per frontend-state.yaml line 35-40) |

---

## Findings Summary

### Compliant ✅
- Tech stack alignment (Java 21, Angular 22)
- API standards maintained
- Frontend state pattern correct
- sessionStorage usage aligns with explicit carve-out in `frontend-state.yaml`

### Warnings ⚠️
1. **Mutation Testing**: Proposal should specify which mutation operators the StorageAdapter tests will target (e.g., key generation, null handling)
2. **Skills Debug Documentation**: ATSE1-56 should produce a written diagnosis document, not just a fix

### Violations ❌
**None identified.**

---

## Remediation Guidance

### For Warning 1 (Mutation Testing)
Add to proposal:
```markdown
**Mutation Targets for StorageAdapter:**
- Key namespace prefix injection (mutate prefix, verify key breaks)
- Null/undefined value handling (mutate input, verify error thrown)
- get/set symmetry (mutate set path, verify get returns mutated value)
```

### For Warning 2 (Skills Debug)
Add to proposal:
```markdown
**ATSE1-56 Deliverable:**
- `openspec/changes/atse1-56-skills-debug/diagnosis.md` documenting:
  - Network trace (request/response)
  - Signal binding chain
  - Root cause and fix
```

---

## Verdict

**PROPOSAL IS COMPLIANT** with the Project Constitution.

Proceed with implementation after addressing warnings.
