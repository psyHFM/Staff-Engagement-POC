# Angular State Architect Review: ATSE1-59 Storage Adapter

**Review Date:** 2026-06-30  
**Reviewer:** Angular State Architect  
**Scope:** StorageAdapter design and AuthState integration

---

## State Map

| State | Type | Location | Persistence |
|-------|------|----------|-------------|
| JWT Token | `signal<string \| null>` | `AuthState` | sessionStorage via StorageAdapter |
| Username | `signal<string \| null>` | `AuthState` | sessionStorage via StorageAdapter |
| Employee ID | `signal<number \| null>` | `AuthState` | sessionStorage via StorageAdapter |
| Logout status | `computed<boolean>` | `AuthState` | Derived from token signal |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  AuthState Construction                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Inject StorageAdapter                             │   │
│  │ 2. Read from sessionStorage:                         │   │
│  │    - token = adapter.get('auth-token')               │   │
│  │    - username = adapter.get('auth-username')         │   │
│  │    - employeeId = adapter.get('auth-employee-id')    │   │
│  │ 3. Initialize signals with retrieved values          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Component Logout Action                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. User clicks "Sign out" in shell menu              │   │
│  │ 2. AuthState.logout() called                         │   │
│  │ 3. StorageAdapter.remove('auth-token')               │   │
│  │ 4. StorageAdapter.remove('auth-username')            │   │
│  │ 5. StorageAdapter.remove('auth-employee-id')         │   │
│  │ 6. Navigate to /login?reason=signed_out              │   │
│  │ 7. Show toast "You have been signed out"             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Proposed StorageAdapter API

```typescript
// frontend/src/app/shared/storage/storage-adapter.ts
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

export class SessionStorageAdapter implements StorageAdapter {
  private readonly prefix = 'staff-engagement:';
  
  get(key: string): string | null {
    return sessionStorage.getItem(this.prefix + key);
  }
  
  set(key: string, value: string): void {
    sessionStorage.setItem(this.prefix + key, value);
  }
  
  remove(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }
  
  clear(): void {
    // Only clear namespaced keys
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => sessionStorage.removeItem(k));
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
```

---

## AuthState Integration Pattern

```typescript
// frontend/src/app/shared/auth/auth-state.ts
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly storage = inject(SessionStorageAdapter);
  
  // Initialize from storage on construction
  private readonly token = signal<string | null>(
    this.storage.get('auth-token')
  );
  
  private readonly username = signal<string | null>(
    this.storage.get('auth-username')
  );
  
  private readonly employeeId = signal<number | null>(
    this.storage.get('auth-employee-id')
      ? Number(this.storage.get('auth-employee-id'))
      : null
  );
  
  // Computed for auth status
  readonly isAuthenticated = computed(() => this.token() !== null);
  
  logout(): void {
    this.storage.remove('auth-token');
    this.storage.remove('auth-username');
    this.storage.remove('auth-employee-id');
    this.token.set(null);
    this.username.set(null);
    this.employeeId.set(null);
    this.router.navigate(['/login'], { 
      queryParams: { reason: 'signed_out' } 
    });
  }
}
```

---

## Violation Report

**No violations detected.**

The proposed pattern:
- ✅ Uses `signal()` for all state
- ✅ Uses `computed()` for derived state (`isAuthenticated`)
- ✅ Keeps side effects in state service (`logout()`)
- ✅ Uses `inject()` for DI
- ✅ Follows sessionStorage carve-out from `frontend-state.yaml` (line 35-40)
- ✅ No `BehaviorSubject` usage
- ✅ No manual `.set()` on computed signals

---

## ATSE1-56: Skills Debug Analysis

**Diagnosis Checklist:**

```typescript
// 1. API Layer Check
GET /api/v1/skills/search?name=Angular
// Expected: 200 + { items: Skill[], total: number }

// 2. State Service Check
skills-state.service.ts:
  - search(name: string): void
  - Does it call API? ✓
  - Does it update items signal? ✓
  - Does it use toSignal() for RxJS? ✓

// 3. Component Binding Check
skills-page.html:
  - Does it bind to state.items()? ✓
  - Does detail view use correct signal? ✓

// 4. Console/Network Check
  - Any 4xx/5xx errors?
  - Any JavaScript exceptions?
```

**Likely Root Causes (ranked):**
1. Signal not properly converted from RxJS stream with `toSignal()`
2. Detail view binding to wrong signal property
3. API returning different shape than expected
4. CORS or interceptor issue blocking request

---

## ATSE1-52: Shell Menu State Flow

```
Component (Shell) → AuthState.isAuthenticated() → Show/Hide Menu
       │
       ▼
User Click "Sign out" → AuthState.logout()
       │
       ├─→ StorageAdapter.remove() (side effect)
       ├─→ signal.set(null) (state update)
       ├─→ Router.navigate() (navigation)
       └─→ ToastService.show() (feedback)
```

**Compliance:** ✅ Component calls state service method; state service handles all side effects.

---

## Recommendations

1. **StorageAdapter**: Make it injectable as a service for easier testing
2. **Error Handling**: Add try/catch around sessionStorage access (private browsing may throw)
3. **Type Safety**: Consider `EmployeeId` branded type instead of `number`
4. **Skills Debug**: Add network logging interceptor to capture request/response shapes

---

## Verdict

**DESIGN IS COMPLIANT** with `frontend-state.yaml`.

Proceed with implementation following the patterns above.
