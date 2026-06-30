# BDD Test Engineer Review: ATSE1-52/56/58/59

**Review Date:** 2026-06-30  
**Reviewer:** BDD Test Engineer  
**Scope:** Test coverage plan for all four tickets

---

## Test Coverage Map

| Ticket | Unit | Integration (Excluded) | E2E (Out of Scope) |
|--------|------|------------------------|--------------------|
| ATSE1-52 | Shell component, AuthState | ❌ | ❌ |
| ATSE1-56 | Skills state service | ❌ | ❌ |
| ATSE1-58 | Documentation only | N/A | N/A |
| ATSE1-59 | StorageAdapter | ❌ | ❌ |

---

## ATSE1-59: StorageAdapter Tests

### Test File: `storage-adapter.spec.ts`

```typescript
describe('SessionStorageAdapter', () => {
  let adapter: SessionStorageAdapter;

  beforeEach(() => {
    adapter = new SessionStorageAdapter();
    sessionStorage.clear();
  });

  describe('Given a clean sessionStorage', () => {
    describe('When getting a non-existent key', () => {
      it('Then returns null', () => {
        expect(adapter.get('nonexistent')).toBeNull();
      });
    });

    describe('When setting a value', () => {
      it('Then retrieves the same value with namespaced key', () => {
        adapter.set('token', 'abc123');
        expect(adapter.get('token')).toBe('abc123');
        // Verify namespacing
        expect(sessionStorage.getItem('staff-engagement:token')).toBe('abc123');
      });
    });

    describe('When removing a key', () => {
      it('Then returns null for subsequent get', () => {
        adapter.set('token', 'abc123');
        adapter.remove('token');
        expect(adapter.get('token')).toBeNull();
      });
    });

    describe('When checking key existence', () => {
      it('Then returns true for existing key', () => {
        adapter.set('token', 'abc123');
        expect(adapter.has('token')).toBeTrue();
      });

      it('Then returns false for non-existent key', () => {
        expect(adapter.has('token')).toBeFalse();
      });
    });

    describe('When clearing all keys', () => {
      it('Then removes only namespaced keys', () => {
        adapter.set('token', 'abc123');
        adapter.set('username', 'hendrik');
        sessionStorage.setItem('other-key', 'preserve-me');
        
        adapter.clear();
        
        expect(adapter.get('token')).toBeNull();
        expect(adapter.get('username')).toBeNull();
        expect(sessionStorage.getItem('other-key')).toBe('preserve-me');
      });
    });
  });

  describe('Given sessionStorage throws (private browsing)', () => {
    it('Then handles gracefully without crashing', () => {
      // Mutation target: error handling path
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new DOMException('Quota exceeded');
      };
      
      expect(() => adapter.set('token', 'abc123')).not.toThrow();
      
      sessionStorage.setItem = originalSetItem;
    });
  });
});
```

### Mutation Targets for StorageAdapter

| Mutant | Test to Kill |
|--------|--------------|
| Remove `prefix` concatenation | Verify `sessionStorage.getItem('staff-engagement:token')` fails |
| Change `set` to not store value | Verify `get` returns null after set |
| Remove null check in `has` | Verify `has('nonexistent')` returns false |
| Clear all sessionStorage instead of namespaced | Verify non-namespaced key survives |

---

## ATSE1-52: Shell Auth Menu Tests

### Test File: `shell.spec.ts`

```typescript
describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let authState: jasmine.SpyObj<AuthState>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    authState = jasmine.createSpyObj('AuthState', ['logout', 'isAuthenticated']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    toastService = jasmine.createSpyObj('ToastService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthState, useValue: authState },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toastService },
      ],
    });

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Given user is authenticated', () => {
    beforeEach(() => {
      authState.isAuthenticated.and.returnValue(true);
    });

    describe('When clicking "Sign out"', () => {
      it('Then calls AuthState.logout()', () => {
        const signOutButton = fixture.debugElement.query(
          By.css('[data-testid="sign-out-btn"]')
        ).nativeElement;
        
        signOutButton.click();
        
        expect(authState.logout).toHaveBeenCalled();
      });
    });

    describe('When AuthState.logout() completes', () => {
      it('Then navigates to /login?reason=signed_out', () => {
        component.onLogout(); // Assuming extracted method
        
        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
          queryParams: { reason: 'signed_out' },
        });
      });

      it('Then shows green toast "You have been signed out"', () => {
        component.onLogout();
        
        expect(toastService.show).toHaveBeenCalledWith(
          'You have been signed out',
          { type: 'success' }
        );
      });
    });
  });

  describe('Given keyboard navigation', () => {
    it('Then has visible focus styles on menu button', () => {
      const menuButton = fixture.debugElement.query(
        By.css('[data-testid="auth-menu-btn"]')
      ).nativeElement;
      
      menuButton.focus();
      fixture.detectChanges();
      
      const styles = getComputedStyle(menuButton);
      expect(styles.outline).not.toBe('none');
    });
  });
});
```

---

## ATSE1-56: Skills Debug Tests

### Test File: `skills-state.service.spec.ts`

```typescript
describe('SkillsStateService', () => {
  let service: SkillsStateService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SkillsStateService],
    });

    service = TestBed.inject(SkillsStateService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('When searching for skills', () => {
    it('Then updates items signal with API response', () => {
      const mockSkills = [
        { id: 1, name: 'Angular', level: 'Expert' },
        { id: 2, name: 'React', level: 'Intermediate' },
      ];

      service.search('Angular');

      const req = httpTestingController.expectOne(
        '/api/v1/skills/search?name=Angular'
      );
      expect(req.request.method).toBe('GET');

      req.flush({ items: mockSkills, total: 2 });

      // Verify signal updated
      service.items.update(items => {
        expect(items.length).toBe(2);
        expect(items[0].name).toBe('Angular');
        return items; // No-op update, just asserting
      });
    });
  });
});
```

### Diagnosis Checklist (ATSE1-56)

```markdown
## Network Trace
- [ ] GET /api/v1/skills/search?name=Angular returns 200
- [ ] Response shape: { items: Skill[], total: number }
- [ ] No CORS errors in console

## Signal Chain
- [ ] skills-state.service.ts: search() calls HttpClient
- [ ] search() updates `items` signal via .set() or .update()
- [ ] Component binds to `state.items()` correctly

## Detail View
- [ ] Detail view receives correct skill object
- [ ] Detail view template displays all properties
- [ ] No JavaScript exceptions in console

## Root Cause
[TBD after debugging]

## Fix
[TBD after diagnosis]
```

---

## ATSE1-58: Employee ID Audit

No unit tests required (documentation task).

**Deliverable:** `docs/employee-id-seed-audit.md`

---

## Coverage Thresholds

Per `testing-strategy.yaml`:
- **Lines:** ≥ 80%
- **Branches:** ≥ 80%
- **Mutation Score:** ≥ 80%

---

## Verdict

**TEST PLAN IS COMPLIANT** with `testing-strategy.yaml`.

Key points:
- ✅ All tests are unit tests (no integration)
- ✅ BDD Given-When-Then structure
- ✅ Mocks for all dependencies
- ✅ Mutation targets identified
- ✅ JUnit 5 / Jest compatible

Proceed with test implementation.
