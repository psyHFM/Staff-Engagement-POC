# Design: ATSE1-48/49/50 Shell Fixes

## Constitution Guard Review (Pre-Implementation)

### Compliant ✅

| Requirement | Constitution Source | Implementation |
|-------------|---------------------|----------------|
| Angular 22 | `tech-stack.yaml` → `frontend.framework.version: "22.0.2"` | All changes use Angular 22 features (Signals, standalone components, `inject()`) |
| Signals for state | `frontend-state.yaml` → `primary_mechanism.tool: "Angular Signals"` | `employeeId` signal, `auth.currentEmployeeId` computed signal |
| Unidirectional flow | `frontend-state.yaml` → `primary_mechanism.flow_pattern` | Components read signals, don't mutate global state directly |
| `inject()` DI pattern | `angular-style-guide.md` → `DI Pattern` | Uses `inject(AuthState)`, `inject(Router)`, `inject(ActivatedRoute)` |
| kebab-case URLs | `api-standards.yaml` → `casing.urls: "kebab-case"` | Route `/skills/:name` follows kebab pattern |
| Unit tests only | `testing-strategy.yaml` → `scope: "Unit Tests Only"` | All tests are unit tests (Jest), no integration tests |
| BDD style | `testing-strategy.yaml` → `style.pattern: "BDD"` | Tests follow Given-When-Then structure |

### Warnings ⚠️

| Concern | Constitution Source | Mitigation |
|---------|---------------------|------------|
| Route param handling in `SkillsPage` | `frontend-state.yaml` → Components must not update global state directly | `SkillsPage` calls `state.search(name)` method (service API), doesn't mutate signals directly |
| `employeeId` signal default fallback | `frontend-state.yaml` → persistence.carve_outs only covers auth | Fallback to `'1'` is defensive only; route is protected by auth guard so shouldn't trigger |

### Violations ❌

**None identified.**

### Build Status

- ✅ Frontend build passes
- ⚠️ Style budget warning: `skills-page.scss` is 4.55kB (551 bytes over 4kB budget) — acceptable for new feature styles

---

## State Map (Angular State Architect)

### ATSE1-48: Skills Detail Navigation

| Signal | Location | Type | Purpose |
|--------|----------|------|---------|
| `searchTerm` | `SkillsPage` (local) | `signal<string>` | Transient search input value |
| `state.query()` | `SkillsStateService` (global) | `computed<string>` | Persisted search query |
| `state.results()` | `SkillsStateService` (global) | `computed<PagedResult>` | Search results |
| `state.popular()` | `SkillsStateService` (global) | `computed<SkillSummary[]>` | Popular skills grid |

**Data Flow**:
```
User clicks tile → Router.navigate(['/skills', skill])
                 → ActivatedRoute.params订阅
                 → state.search(skill) called
                 → API call → signal update → UI re-renders
```

### ATSE1-49: Portfolio Employee ID

| Signal | Location | Type | Purpose |
|--------|----------|------|---------|
| `employeeId` | `Portfolio` (local) | `signal<string>` | Current employee being viewed |
| `auth.currentEmployeeId` | `AuthState` (global) | `computed<number|null>` | Logged-in user's employee ID |
| `portfolio()` | `PortfolioStateService` (global) | `computed<Portfolio>` | Portfolio data |
| `isReadOnly()` | `Portfolio` (local) | `computed<boolean>` | RBAC gate for UI |

**Data Flow**:
```
Component init → auth.currentEmployeeId() read
               → employeeId.set(default)
               → state.loadPortfolio(id) called
               → API call → signal update → UI renders
```

### ATSE1-50: Shell Auth Visibility

| Signal | Location | Type | Purpose |
|--------|----------|------|---------|
| `auth.isAuthenticated()` | `AuthState` (global) | `computed<boolean>` | Auth status |
| `auth.currentUser()` | `AuthState` (global) | `computed<string|null>` | Logged-in username |

**Data Flow**:
```
Template renders → @if (auth.isAuthenticated()) evaluated
                 → Signal tracked → auto-updates on auth change
                 → "Sign in" link shown/hidden
```

---

## Test Scenarios (BDD Test Engineer)

### ATSE1-48: Skills Detail Navigation

```gherkin
Scenario: Tile click navigates to detail view
  Given the skills page is displayed with popular tiles
  When the user clicks the "Angular" tile
  Then the URL should be "/skills/Angular"
  And the detail panel should show Angular skill details

Scenario: Direct navigation renders detail
  Given the user navigates directly to "/skills/Angular"
  Then the detail panel should show Angular skill details
  Without requiring a search input
```

### ATSE1-49: Portfolio Employee ID

```gherkin
Scenario: Portfolio defaults to current user's employee ID
  Given the user is logged in as employee 42
  When the portfolio page loads
  Then the employee ID should default to "42"
  And the portfolio data should show employee 42's data

Scenario: Admin can switch employee
  Given an admin is viewing their portfolio
  When they enter "99" in the employee ID field
  And click "Load"
  Then the portfolio should display employee 99's data
```

### ATSE1-50: Shell Auth Visibility

```gherkin
Scenario: Sign in link hidden when authenticated
  Given the user is logged in
  When the shell renders
  Then the "Sign in" link should not be visible
  And only the username and "Sign out" button should show

Scenario: Sign in link shown when unauthenticated
  Given the user is logged out
  When the shell renders
  Then the "Sign in" link should be visible
```
