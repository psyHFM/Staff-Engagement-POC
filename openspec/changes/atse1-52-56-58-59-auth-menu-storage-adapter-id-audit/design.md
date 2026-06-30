# Design: ATSE1-52/56/58/59 — Auth Menu, ID Audit, Skills Debug

**Date:** 2026-06-30  
**Status:** Approved (Persona Reviews Complete)  
**Tickets:** ATSE1-52, ATSE1-56, ATSE1-58, ATSE1-59

---

## Design Overview

This design document incorporates feedback from all persona reviews and provides implementation-ready specifications.

**Note on ATSE1-59:** The storage adapter pattern is **already implemented** in `frontend/src/app/shared/auth/auth-storage.ts`:
- `AuthStorage` interface with `read/write/remove` methods
- `browserAuthStorage` implementation using `sessionStorage`
- Namespaced keys: `staff-engagement:token`, `staff-engagement:username`, `staff-engagement:employee-id`
- `auth-state.ts` already rehydrates from storage on construction (line 49: `this.rehydrate()`)

ATSE1-59 is therefore **COMPLETE** — no implementation needed.

---

## ATSE1-59: Storage Adapter ✅ COMPLETE

The existing implementation satisfies all requirements:

```typescript
// frontend/src/app/shared/auth/auth-storage.ts
export interface AuthStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export const AUTH_STORAGE_KEY = 'staff-engagement:token';
export const AUTH_USERNAME_KEY = 'staff-engagement:username';
export const AUTH_EMPLOYEE_ID_KEY = 'staff-engagement:employee-id';
```

```typescript
// frontend/src/app/shared/auth/auth-state.ts - line 48-50
constructor() {
  this.rehydrate();  // ✅ Reads from sessionStorage on construction
}
```

---

## ATSE1-52: Shell Auth Menu

### Current State

The shell has a basic "Sign out" button and user display, but no dropdown menu:

```html
<!-- Current shell.html -->
<div class="shell__auth">
  @if (auth.isAuthenticated()) {
    @if (profileLink()) {
      <a class="shell__user" [routerLink]="profileLink()">
        {{ auth.currentUser() }}
      </a>
    } @else {
      <span class="shell__user">{{ auth.currentUser() }}</span>
    }
    <button type="button" class="shell__logout" (click)="logout()">Sign out</button>
  }
</div>
```

### Required Changes

#### 1. HTML: Add Dropdown Menu

```html
<!-- frontend/src/app/shell/shell.html -->
<div class="shell__auth">
  @if (auth.isAuthenticated()) {
    <div class="auth-menu" [class.open]="isMenuOpen()">
      <button 
        type="button" 
        class="auth-menu-trigger"
        (click)="toggleMenu()"
        [attr.aria-expanded]="isMenuOpen()"
        [attr.aria-haspopup]="true">
        
        <span class="user-greeting">{{ auth.currentUser() }}</span>
        <i class="pi" [class.pi-chevron-down]="!isMenuOpen()" [class.pi-chevron-up]="isMenuOpen()"></i>
      </button>
      
      @if (isMenuOpen()) {
        <div class="auth-menu-dropdown" (clickOutside)="closeMenu()">
          <ul class="auth-menu-items">
            <li>
              <a [routerLink]="profileLink()" (click)="closeMenu()" *ngIf="profileLink()">
                <i class="pi pi-user"></i>
                Profile
              </a>
            </li>
            <li>
              <button type="button" (click)="onLogout()">
                <i class="pi pi-sign-out"></i>
                Sign out
              </button>
            </li>
          </ul>
        </div>
      }
    </div>
  } @else {
    <a routerLink="/login" class="shell__login">Sign in</a>
  }
</div>
```

#### 2. Component: Add Menu State

```typescript
// frontend/src/app/shell/shell.ts
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class Shell {
  protected readonly auth = inject(AuthState);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  
  protected readonly isMenuOpen = signal(false);
  
  protected toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
  }
  
  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
  
  protected onLogout(): void {
    this.closeMenu();
    this.auth.logout();
    this.toastService.show('You have been signed out', { type: 'success' });
    void this.router.navigate(['/login'], { 
      queryParams: { reason: 'signed_out' } 
    });
  }
}
```

#### 3. SCSS: Add Menu Styles

```scss
// frontend/src/app/shell/shell.scss - add to existing file

.auth-menu {
  position: relative;
  display: inline-block;
  
  &.open .auth-menu-trigger {
    background: var(--surface-hover);
  }
  
  &-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background: var(--surface-hover);
    }
    
    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    
    i {
      transition: transform 0.2s;
    }
  }
  
  &-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    min-width: 160px;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }
  
  &-items {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
    
    li {
      a, button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.75rem 1rem;
        border: none;
        background: transparent;
        color: var(--text-color);
        cursor: pointer;
        text-decoration: none;
        font-size: inherit;
        transition: background-color 0.2s;
        
        &:hover {
          background: var(--surface-hover);
        }
        
        &:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: -2px;
        }
        
        i {
          font-size: 1rem;
        }
      }
    }
  }
}
```

---

## ATSE1-56: Skills Debug

### Diagnosis Checklist

```markdown
## Network Trace
- [ ] GET /api/v1/skills/search?name=Angular returns 200
- [ ] Response shape: { items: Skill[], total: number }
- [ ] No CORS errors in console
- [ ] Request URL correct (kebab-case, /api/v1 prefix)

## State Service
- [ ] skills-state.service.ts: search() calls HttpClient
- [ ] search() updates `_results` signal via .set()
- [ ] Error handling present (catchApiError())

## Component Binding
- [ ] skills-page.html binds to state.results()
- [ ] Detail panel shows when state.query() is set
- [ ] No JavaScript exceptions in console

## Root Cause
[TBD after debugging]

## Fix Applied
[TBD]
```

### Likely Issues

Based on the code review:

1. **SkillsStateService is provided at component level** (line 24 of skills-page.ts):
   ```typescript
   providers: [SkillsStateService]
   ```
   This means a new instance is created per component instance, which could cause state to reset on navigation.

2. **Route param subscription** (line 40-46) may not trigger search correctly on back/forward navigation.

3. **Detail panel binding** (line 140-165) shows `state.query()` but may not have results if search failed.

### Fix Plan

1. Check browser console for errors when navigating to `/skills`
2. Check network tab for API response
3. If service instance is the issue, consider moving provider to a shared module

---

## ATSE1-58: Employee ID Audit

### Seed Data Documentation

The seed file uses employee **names** (Alice, Bob, Charlie, Diana) rather than hardcoded IDs:

```yaml
# backend/src/main/resources/db/changelog/modules/zz_seed/seed-001-initial.yaml
# Employees are inserted with emails:
# - alice@staff.eng → ID 1 (auto-generated)
# - bob@staff.eng → ID 2 (auto-generated)
# - charlie@staff.eng → ID 3 (auto-generated)
# - diana@staff.eng → ID 4 (auto-generated)
```

**Note:** The seed uses sequential IDs 1-4, not 1, 47-50 as the ticket description states. This may have been from an older seed version.

### Required Changes

Add documentation comment to seed file:

```yaml
# =============================================================================
# EMPLOYEE ID SEED DOCUMENTATION (ATSE1-58)
# =============================================================================
# Seeded Employee IDs: 1, 2, 3, 4 (sequential, contiguous)
# 
# Employees are inserted in order: Alice, Bob, Charlie, Diana.
# IDs are auto-generated by the database sequence.
#
# WARNING: Do NOT hardcode employee IDs in UI code.
# Always use dropdown/lookup to populate employee selectors.
# IDs may change between environments or future seed revisions.
#
# Related Tickets:
# - ATSE1-58: Audit and document ID gaps
# - ATSE1-28: Replace hardcoded employee IDs with lookup
# - ATSE1-34: Employee selector dropdown implementation
# =============================================================================
```

### Frontend Audit

Run grep to find hardcoded IDs:

```bash
# Search patterns
grep -rn "employee.*[1234]\b" frontend/src/app/features/
grep -rn "employeeId.*[1234]" frontend/src/app/
grep -rn "for.*i.*<.*5" frontend/src/app/
```

---

## Implementation Checklist

### ATSE1-59 (Storage Adapter) ✅
- [x] Already implemented in auth-storage.ts
- [x] AuthState rehydrates on construction
- [x] Namespaced keys in use

### ATSE1-52 (Auth Menu)
- [ ] Update shell.html with dropdown
- [ ] Update shell.ts with menu state
- [ ] Update shell.scss with styles
- [ ] Add toast service integration
- [ ] Test keyboard navigation

### ATSE1-56 (Skills Debug)
- [ ] Run network trace
- [ ] Check state service signal chain
- [ ] Verify component binding
- [ ] Document root cause
- [ ] Apply fix

### ATSE1-58 (ID Audit)
- [ ] Add comment to seed file
- [ ] Run grep patterns on frontend
- [ ] Document findings

---

## Constitution Compliance Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| Tech Stack | ✅ | Java 21, Angular 22.0.2 |
| API Standards | ✅ | kebab-case URLs, camelCase JSON, /api/v1 |
| Testing Strategy | ✅ | BDD, unit tests only |
| Backend Architecture | ✅ | No violations |
| Frontend State | ✅ | Signals, sessionStorage carve-out |

---

## Approvals

| Persona | Status | Date |
|---------|--------|------|
| Constitution Guard | ✅ Compliant | 2026-06-30 |
| Angular State Architect | ✅ Compliant | 2026-06-30 |
| BDD Test Engineer | ✅ Compliant | 2026-06-30 |
| Constitutional Backend Developer | ✅ Compliant | 2026-06-30 |
